/**
 * MemberForm Component
 * 
 * Reusable form component for creating and editing members.
 * Uses react-hook-form with Zod validation for client-side validation.
 * Includes automatic Codice Fiscale calculation.
 */

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { memberSchema, type MemberFormData } from '../../lib/validations';
import { calcolaCodiceFiscale } from '../../lib/codiceFiscale';
import { cercaComuniAsync, type Comune } from '../../lib/comuniItaliani';
import type { Member } from '../../types';

interface MemberFormProps {
  initialData?: Partial<Member & { sesso?: 'M' | 'F'; luogoNascita?: string; codiceCatastale?: string }>;
  onSubmit: (data: MemberFormData & { 
    statusId?: string; 
    sesso?: 'M' | 'F'; 
    luogoNascita?: string; 
    codiceCatastale?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function MemberForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Salva',
}: MemberFormProps) {
  const memberStatuses = useQuery(api.memberStatuses.listActive);
  const [selectedStatusId, setSelectedStatusId] = useState<string>(
    (initialData as any)?.statusId || ''
  );

  // Campi per il calcolo del CF
  const [sesso, setSesso] = useState<'M' | 'F' | ''>(initialData?.sesso || '');
  const [luogoNascita, setLuogoNascita] = useState(initialData?.luogoNascita || '');
  const [codiceCatastale, setCodiceCatastale] = useState(initialData?.codiceCatastale || '');
  const [comuniSuggestions, setComuniSuggestions] = useState<Comune[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cfManuale, setCfManuale] = useState(!!initialData?.codiceFiscale);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      nome: initialData?.nome ?? '',
      cognome: initialData?.cognome ?? '',
      codiceFiscale: initialData?.codiceFiscale ?? '',
      dataNascita: initialData?.dataNascita ?? '',
      dataIscrizione: (initialData as any)?.dataIscrizione ?? '',
      email: initialData?.email ?? '',
      telefono: initialData?.telefono ?? '',
      indirizzo: initialData?.indirizzo ?? '',
      comune: initialData?.comune ?? '',
      cap: initialData?.cap ?? '',
      note: initialData?.note ?? '',
      socioAttivo: initialData?.socioAttivo ?? true,
      stato: initialData?.stato ?? 'attivo',
    },
  });

  const socioAttivo = watch('socioAttivo');
  const nome = watch('nome');
  const cognome = watch('cognome');
  const dataNascita = watch('dataNascita');

  // Calcola automaticamente il CF quando cambiano i dati
  const cfCalcolato = useMemo(() => {
    if (!nome || !cognome || !dataNascita || !sesso || !codiceCatastale) {
      return '';
    }
    return calcolaCodiceFiscale({
      nome,
      cognome,
      dataNascita,
      sesso: sesso as 'M' | 'F',
      codiceCatastale,
    });
  }, [nome, cognome, dataNascita, sesso, codiceCatastale]);

  // Aggiorna il CF automaticamente se non è in modalità manuale
  useEffect(() => {
    if (!cfManuale && cfCalcolato) {
      setValue('codiceFiscale', cfCalcolato);
    }
  }, [cfCalcolato, cfManuale, setValue]);

  // Gestione autocomplete comuni (asincrono)
  const handleLuogoNascitaChange = async (value: string) => {
    setLuogoNascita(value);
    if (value.length >= 2) {
      const results = await cercaComuniAsync(value, 10);
      setComuniSuggestions(results);
      setShowSuggestions(results.length > 0);
      
      // Se c'è una corrispondenza esatta, seleziona automaticamente
      const exactMatch = results.find(c => c.nome.toLowerCase() === value.toLowerCase());
      if (exactMatch) {
        setCodiceCatastale(exactMatch.codiceCatastale);
      } else {
        // Reset codice catastale se non c'è match esatto
        setCodiceCatastale('');
      }
    } else {
      setComuniSuggestions([]);
      setShowSuggestions(false);
      setCodiceCatastale('');
    }
  };

  const handleSelectComune = (comune: Comune) => {
    setLuogoNascita(comune.nome);
    setCodiceCatastale(comune.codiceCatastale);
    setShowSuggestions(false);
    setComuniSuggestions([]);
  };

  const handleFormSubmit = async (data: MemberFormData) => {
    await onSubmit({
      ...data,
      statusId: selectedStatusId || undefined,
      sesso: sesso as 'M' | 'F' | undefined,
      luogoNascita: luogoNascita || undefined,
      codiceCatastale: codiceCatastale || undefined,
    });
  };

  const isFormLoading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Dati per Codice Fiscale */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Dati Personali
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome */}
          <div>
            <label htmlFor="nome" className="label">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              id="nome"
              type="text"
              {...register('nome')}
              className={`input ${errors.nome ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Mario"
              disabled={isFormLoading}
            />
            {errors.nome && <p className="error-text">{errors.nome.message}</p>}
          </div>

          {/* Cognome */}
          <div>
            <label htmlFor="cognome" className="label">
              Cognome <span className="text-red-500">*</span>
            </label>
            <input
              id="cognome"
              type="text"
              {...register('cognome')}
              className={`input ${errors.cognome ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Rossi"
              disabled={isFormLoading}
            />
            {errors.cognome && <p className="error-text">{errors.cognome.message}</p>}
          </div>

          {/* Data di Nascita */}
          <div>
            <label htmlFor="dataNascita" className="label">
              Data di Nascita <span className="text-red-500">*</span>
            </label>
            <input
              id="dataNascita"
              type="date"
              {...register('dataNascita')}
              className={`input ${errors.dataNascita ? 'border-red-500 focus:ring-red-500' : ''}`}
              disabled={isFormLoading}
            />
            {errors.dataNascita && <p className="error-text">{errors.dataNascita.message}</p>}
          </div>

          {/* Sesso */}
          <div>
            <label className="label">
              Sesso <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sesso"
                  value="M"
                  checked={sesso === 'M'}
                  onChange={(e) => setSesso(e.target.value as 'M')}
                  className="w-4 h-4 text-blue-600"
                  disabled={isFormLoading}
                />
                <span className="text-sm">Maschio</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sesso"
                  value="F"
                  checked={sesso === 'F'}
                  onChange={(e) => setSesso(e.target.value as 'F')}
                  className="w-4 h-4 text-blue-600"
                  disabled={isFormLoading}
                />
                <span className="text-sm">Femmina</span>
              </label>
            </div>
          </div>

          {/* Luogo di Nascita con autocomplete */}
          <div className="relative">
            <label htmlFor="luogoNascita" className="label">
              Comune di Nascita <span className="text-red-500">*</span>
            </label>
            <input
              id="luogoNascita"
              type="text"
              value={luogoNascita}
              onChange={(e) => handleLuogoNascitaChange(e.target.value)}
              onFocus={() => comuniSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="input"
              placeholder="Inizia a digitare..."
              disabled={isFormLoading}
              autoComplete="off"
            />
            {codiceCatastale && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Codice catastale: {codiceCatastale}
              </p>
            )}
            {!codiceCatastale && luogoNascita.length >= 2 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Seleziona il comune dalla lista per calcolare il CF
              </p>
            )}
            {/* Dropdown suggerimenti */}
            {showSuggestions && comuniSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {comuniSuggestions.map((comune) => (
                  <button
                    key={comune.codiceCatastale}
                    type="button"
                    onClick={() => handleSelectComune(comune)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 text-sm"
                  >
                    <span className="font-medium">{comune.nome}</span>
                    <span className="text-slate-500 ml-2">({comune.provincia})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Codice Fiscale */}
          <div>
            <label htmlFor="codiceFiscale" className="label flex items-center justify-between">
              <span>Codice Fiscale <span className="text-red-500">*</span></span>
              <button
                type="button"
                onClick={() => setCfManuale(!cfManuale)}
                className="text-xs text-blue-600 hover:underline"
              >
                {cfManuale ? 'Calcola automaticamente' : 'Inserisci manualmente'}
              </button>
            </label>
            <input
              id="codiceFiscale"
              type="text"
              {...register('codiceFiscale')}
              className={`input uppercase ${errors.codiceFiscale ? 'border-red-500 focus:ring-red-500' : ''} ${!cfManuale ? 'bg-slate-50' : ''}`}
              placeholder="RSSMRA80A01H501Z"
              maxLength={16}
              disabled={isFormLoading || !cfManuale}
              readOnly={!cfManuale}
            />
            {errors.codiceFiscale && <p className="error-text">{errors.codiceFiscale.message}</p>}
            {!cfManuale && !cfCalcolato && nome && cognome && dataNascita && (
              <p className="text-xs text-amber-600 mt-1">
                Seleziona sesso e comune di nascita per calcolare il CF
              </p>
            )}
            {!cfManuale && cfCalcolato && (
              <p className="text-xs text-green-600 mt-1">
                CF calcolato automaticamente
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contatti */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Contatti</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="mario.rossi@email.com"
              disabled={isFormLoading}
            />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="telefono" className="label">Telefono</label>
            <input
              id="telefono"
              type="tel"
              {...register('telefono')}
              className={`input ${errors.telefono ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="+39 333 1234567"
              disabled={isFormLoading}
            />
            {errors.telefono && <p className="error-text">{errors.telefono.message}</p>}
          </div>
        </div>
      </div>

      {/* Indirizzo di Residenza */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Indirizzo di Residenza</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="indirizzo" className="label">Indirizzo</label>
            <input
              id="indirizzo"
              type="text"
              {...register('indirizzo')}
              className={`input ${errors.indirizzo ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Via Roma, 1"
              disabled={isFormLoading}
            />
          </div>
          <div>
            <label htmlFor="comune" className="label">Comune di Residenza</label>
            <input
              id="comune"
              type="text"
              {...register('comune')}
              className={`input ${errors.comune ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Roma"
              disabled={isFormLoading}
            />
          </div>
          <div>
            <label htmlFor="cap" className="label">CAP</label>
            <input
              id="cap"
              type="text"
              {...register('cap')}
              className={`input ${errors.cap ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="00100"
              maxLength={5}
              disabled={isFormLoading}
            />
          </div>
        </div>
      </div>

      {/* Stato Associativo */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Stato Associativo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dataIscrizione" className="label">Data di Iscrizione</label>
            <input
              id="dataIscrizione"
              type="date"
              {...register('dataIscrizione')}
              className="input"
              disabled={isFormLoading}
            />
          </div>
          <div>
            <label htmlFor="statusId" className="label">Ruolo nell'Associazione</label>
            <select
              id="statusId"
              value={selectedStatusId}
              onChange={(e) => setSelectedStatusId(e.target.value)}
              className="input"
              disabled={isFormLoading}
            >
              <option value="">-- Nessuno --</option>
              {memberStatuses?.map((status) => (
                <option key={status._id} value={status._id}>{status.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo Socio</label>
            <div className="flex items-center gap-3 mt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('socioAttivo')}
                  className="sr-only peer"
                  disabled={isFormLoading}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className={`text-sm font-medium ${socioAttivo ? 'text-blue-600' : 'text-slate-500'}`}>
                {socioAttivo ? 'Socio Attivo' : 'Simpatizzante'}
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="stato" className="label">Stato <span className="text-red-500">*</span></label>
            <select
              id="stato"
              {...register('stato')}
              className={`input ${errors.stato ? 'border-red-500 focus:ring-red-500' : ''}`}
              disabled={isFormLoading}
            >
              <option value="attivo">Attivo</option>
              <option value="sospeso">Sospeso</option>
              <option value="dimesso">Dimesso</option>
            </select>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Note</h3>
        <textarea
          id="note"
          {...register('note')}
          className={`input min-h-[100px] ${errors.note ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="Inserisci eventuali note..."
          rows={4}
          disabled={isFormLoading}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isFormLoading}
          className="btn-primary min-w-[120px] flex items-center justify-center gap-2"
        >
          {isFormLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Salvataggio...</span>
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}

export default MemberForm;

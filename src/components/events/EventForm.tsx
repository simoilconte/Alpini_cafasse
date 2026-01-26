/**
 * EventForm - Event form component
 * 
 * Form for creating/editing events with:
 * - Name and location
 * - Start and end datetime
 * - Status selection
 * - Equipment list management
 * - Notes
 * 
 * Requirements:
 * - Req 6.1: Save all event fields
 * - Req 6.2: Validate dataFine >= dataInizio
 */

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface EventFormProps {
  event?: {
    _id: Id<"events">;
    nome: string;
    localita?: string;
    dataInizio: string;
    dataFine: string;
    stato: 'pianificato' | 'confermato' | 'chiuso';
    attrezzaturePreventivo: string[];
    note?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EventForm({ event, onSuccess, onCancel }: EventFormProps) {
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);

  const [nome, setNome] = useState(event?.nome ?? '');
  const [localita, setLocalita] = useState(event?.localita ?? '');
  const [dataInizio, setDataInizio] = useState(event?.dataInizio ?? '');
  const [dataFine, setDataFine] = useState(event?.dataFine ?? '');
  const [stato, setStato] = useState<'pianificato' | 'confermato' | 'chiuso'>(
    event?.stato ?? 'pianificato'
  );
  const [attrezzature, setAttrezzature] = useState<string[]>(
    event?.attrezzaturePreventivo ?? []
  );
  const [newAttrezzatura, setNewAttrezzatura] = useState('');
  const [note, setNote] = useState(event?.note ?? '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!event;

  // Auto-set end date when start date changes (if end is empty or before start)
  useEffect(() => {
    if (dataInizio && (!dataFine || dataFine < dataInizio)) {
      // Set end date to 2 hours after start
      const start = new Date(dataInizio);
      start.setHours(start.getHours() + 2);
      setDataFine(start.toISOString().slice(0, 16));
    }
  }, [dataInizio, dataFine]);

  const handleAddAttrezzatura = () => {
    if (newAttrezzatura.trim()) {
      setAttrezzature([...attrezzature, newAttrezzatura.trim()]);
      setNewAttrezzatura('');
    }
  };

  const handleRemoveAttrezzatura = (index: number) => {
    setAttrezzature(attrezzature.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!nome.trim()) {
      setError('Il nome è obbligatorio');
      return;
    }
    if (!dataInizio) {
      setError('La data di inizio è obbligatoria');
      return;
    }
    if (!dataFine) {
      setError('La data di fine è obbligatoria');
      return;
    }

    // Validate dates (Req 6.2)
    if (dataFine < dataInizio) {
      setError('La data di fine deve essere successiva alla data di inizio');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        await updateEvent({
          eventId: event._id,
          nome,
          localita: localita || undefined,
          dataInizio,
          dataFine,
          stato,
          attrezzaturePreventivo: attrezzature,
          note: note || undefined,
        });
      } else {
        await createEvent({
          nome,
          localita: localita || undefined,
          dataInizio,
          dataFine,
          stato,
          attrezzaturePreventivo: attrezzature,
          note: note || undefined,
        });
      }

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Si è verificato un errore';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1">
          Nome evento *
        </label>
        <input
          type="text"
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Es. Assemblea annuale"
        />
      </div>

      {/* Location */}
      <div>
        <label htmlFor="localita" className="block text-sm font-medium text-slate-700 mb-1">
          Località
        </label>
        <input
          type="text"
          id="localita"
          value={localita}
          onChange={(e) => setLocalita(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Es. Sede associazione"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dataInizio" className="block text-sm font-medium text-slate-700 mb-1">
            Data e ora inizio *
          </label>
          <input
            type="datetime-local"
            id="dataInizio"
            value={dataInizio}
            onChange={(e) => setDataInizio(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="dataFine" className="block text-sm font-medium text-slate-700 mb-1">
            Data e ora fine *
          </label>
          <input
            type="datetime-local"
            id="dataFine"
            value={dataFine}
            onChange={(e) => setDataFine(e.target.value)}
            required
            min={dataInizio}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="stato" className="block text-sm font-medium text-slate-700 mb-1">
          Stato
        </label>
        <select
          id="stato"
          value={stato}
          onChange={(e) => setStato(e.target.value as typeof stato)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={event?.stato === 'chiuso'}
        >
          <option value="pianificato">Pianificato</option>
          <option value="confermato">Confermato</option>
          {isEditing && <option value="chiuso">Chiuso</option>}
        </select>
        {event?.stato === 'chiuso' && (
          <p className="text-xs text-slate-500 mt-1">
            Gli eventi chiusi non possono essere modificati
          </p>
        )}
      </div>

      {/* Equipment */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Attrezzature preventivo
        </label>
        
        {/* Equipment list */}
        {attrezzature.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attrezzature.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => handleRemoveAttrezzatura(index)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add equipment input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newAttrezzatura}
            onChange={(e) => setNewAttrezzatura(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAttrezzatura();
              }
            }}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Aggiungi attrezzatura..."
          />
          <button
            type="button"
            onClick={handleAddAttrezzatura}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Aggiungi
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-1">
          Note
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Note aggiuntive..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={isSubmitting || event?.stato === 'chiuso'}
          className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Salvataggio...
            </span>
          ) : isEditing ? (
            'Aggiorna evento'
          ) : (
            'Crea evento'
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn-secondary disabled:opacity-50"
          >
            Annulla
          </button>
        )}
      </div>
    </form>
  );
}

export default EventForm;

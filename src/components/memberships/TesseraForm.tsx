/**
 * TesseraForm - Membership form component
 * 
 * Form for creating/editing memberships with:
 * - Amount input
 * - Payment status toggle
 * - Payment date (auto-filled when marking as paid)
 * - Payment method selection
 * - Notes
 * 
 * Requirements:
 * - Req 4.1: Save all membership fields
 * - Req 4.2: Validate quotaImporto >= 0
 * - Req 4.3: Auto-set dataPagamento when marking as paid
 */

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface TesseraFormProps {
  memberId: Id<"members">;
  membership?: {
    _id: Id<"memberships">;
    quotaImporto: number;
    pagato: boolean;
    dataPagamento?: string;
    metodoPagamento?: 'contanti' | 'bonifico' | 'pos' | 'altro';
    note?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TesseraForm({ 
  memberId, 
  membership, 
  onSuccess, 
  onCancel 
}: TesseraFormProps) {
  const createMembership = useMutation(api.memberships.createMembership);
  const updateMembership = useMutation(api.memberships.updateMembership);

  const [quotaImporto, setQuotaImporto] = useState(membership?.quotaImporto?.toString() ?? '30');
  const [pagato, setPagato] = useState(membership?.pagato ?? false);
  const [dataPagamento, setDataPagamento] = useState(membership?.dataPagamento ?? '');
  const [metodoPagamento, setMetodoPagamento] = useState<'contanti' | 'bonifico' | 'pos' | 'altro' | ''>(
    membership?.metodoPagamento ?? ''
  );
  const [note, setNote] = useState(membership?.note ?? '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!membership;

  // Auto-fill payment date when marking as paid
  useEffect(() => {
    if (pagato && !dataPagamento) {
      const today = new Date().toISOString().split('T')[0];
      setDataPagamento(today);
    }
  }, [pagato, dataPagamento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate amount
    const amount = parseFloat(quotaImporto);
    if (isNaN(amount) || amount < 0) {
      setError("L'importo deve essere un numero >= 0");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        await updateMembership({
          membershipId: membership._id,
          quotaImporto: amount,
          pagato,
          dataPagamento: dataPagamento || undefined,
          metodoPagamento: metodoPagamento || undefined,
          note: note || undefined,
        });
      } else {
        await createMembership({
          memberId,
          quotaImporto: amount,
          pagato,
          dataPagamento: dataPagamento || undefined,
          metodoPagamento: metodoPagamento || undefined,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Amount */}
      <div>
        <label htmlFor="quotaImporto" className="block text-sm font-medium text-slate-700 mb-1">
          Importo quota (€) *
        </label>
        <input
          type="number"
          id="quotaImporto"
          value={quotaImporto}
          onChange={(e) => setQuotaImporto(e.target.value)}
          min="0"
          step="0.01"
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="30.00"
        />
      </div>

      {/* Payment status */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="pagato"
          checked={pagato}
          onChange={(e) => setPagato(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="pagato" className="text-sm font-medium text-slate-700">
          Quota pagata
        </label>
      </div>

      {/* Payment details (shown when paid) */}
      {pagato && (
        <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <div>
            <label htmlFor="dataPagamento" className="block text-sm font-medium text-slate-700 mb-1">
              Data pagamento
            </label>
            <input
              type="date"
              id="dataPagamento"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="metodoPagamento" className="block text-sm font-medium text-slate-700 mb-1">
              Metodo di pagamento
            </label>
            <select
              id="metodoPagamento"
              value={metodoPagamento}
              onChange={(e) => setMetodoPagamento(e.target.value as typeof metodoPagamento)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleziona...</option>
              <option value="contanti">Contanti</option>
              <option value="bonifico">Bonifico</option>
              <option value="pos">POS</option>
              <option value="altro">Altro</option>
            </select>
          </div>
        </div>
      )}

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
          placeholder="Es. rinnovo tardivo, sconto applicato..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={isSubmitting}
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
            'Aggiorna tessera'
          ) : (
            'Crea tessera'
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

export default TesseraForm;

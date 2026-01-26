/**
 * TesseraCard - Membership card component
 * 
 * Displays membership information in a card format with:
 * - Association year label
 * - Payment status badge
 * - Amount and payment details
 * - Quick action to toggle paid status
 * 
 * Requirements:
 * - Req 4.3: Quick action "mark as paid" with auto dataPagamento
 * - Req 4.4: Show membership info for a member
 */

import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useState } from 'react';

interface TesseraCardProps {
  membership: {
    _id: Id<"memberships">;
    associationYearLabel: string;
    quotaImporto: number;
    pagato: boolean;
    dataPagamento?: string;
    metodoPagamento?: 'contanti' | 'bonifico' | 'pos' | 'altro';
    scadenza: string;
    note?: string;
  };
  isCurrentYear?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
}

/**
 * Format date from ISO string to Italian format
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Payment method labels
 */
const metodoPagamentoLabels: Record<string, string> = {
  contanti: 'Contanti',
  bonifico: 'Bonifico',
  pos: 'POS',
  altro: 'Altro',
};

export function TesseraCard({ 
  membership, 
  isCurrentYear = false, 
  canEdit = false,
  onEdit,
}: TesseraCardProps) {
  const togglePaid = useMutation(api.memberships.togglePaid);
  const [isToggling, setIsToggling] = useState(false);

  const handleTogglePaid = async () => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      await togglePaid({ membershipId: membership._id });
    } catch (error) {
      console.error('Error toggling payment status:', error);
    } finally {
      setIsToggling(false);
    }
  };

  // Check if membership is expired
  const today = new Date().toISOString().split('T')[0];
  const isExpired = membership.scadenza < today;

  return (
    <div className={`rounded-xl border ${isCurrentYear ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'} overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${isCurrentYear ? 'bg-blue-100' : 'bg-slate-50'} border-b ${isCurrentYear ? 'border-blue-200' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${isCurrentYear ? 'text-blue-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9a2 2 0 10-4 0v5a2 2 0 01-2 2h6m-6-4h4m8 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`font-semibold ${isCurrentYear ? 'text-blue-900' : 'text-slate-900'}`}>
              {membership.associationYearLabel}
            </span>
            {isCurrentYear && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                Corrente
              </span>
            )}
          </div>
          
          {/* Payment status badge */}
          {membership.pagato ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Pagata
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Scaduta
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Non pagata
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Amount */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Importo</p>
            <p className="text-lg font-bold text-slate-900">€{membership.quotaImporto.toFixed(2)}</p>
          </div>
          
          {/* Expiration */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Scadenza</p>
            <p className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-slate-900'}`}>
              {formatDate(membership.scadenza)}
            </p>
          </div>
          
          {/* Payment date (if paid) */}
          {membership.pagato && membership.dataPagamento && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Data pagamento</p>
              <p className="text-sm text-slate-900">{formatDate(membership.dataPagamento)}</p>
            </div>
          )}
          
          {/* Payment method (if paid) */}
          {membership.pagato && membership.metodoPagamento && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Metodo</p>
              <p className="text-sm text-slate-900">{metodoPagamentoLabels[membership.metodoPagamento]}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {membership.note && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Note</p>
            <p className="text-sm text-slate-700">{membership.note}</p>
          </div>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
            {!membership.pagato && (
              <button
                onClick={handleTogglePaid}
                disabled={isToggling}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isToggling ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Segna come pagata
              </button>
            )}
            
            {membership.pagato && (
              <button
                onClick={handleTogglePaid}
                disabled={isToggling}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isToggling ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                Annulla pagamento
              </button>
            )}
            
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Modifica tessera"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TesseraCard;

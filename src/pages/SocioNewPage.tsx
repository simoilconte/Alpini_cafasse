/**
 * SocioNewPage - Create new member page
 * 
 * Page for creating a new member using the MemberForm component.
 * Handles form submission, loading states, success/error feedback.
 * 
 * Requirements:
 * - Req 1.1: Save all member fields
 * - Req 13.5: Show specific, understandable error messages
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MemberForm } from '../components/members/MemberForm';
import type { MemberFormData } from '../lib/validations';

/**
 * Toast notification component for success/error messages
 */
function Toast({ 
  message, 
  type, 
  onClose 
}: { 
  message: string; 
  type: 'success' | 'error'; 
  onClose: () => void;
}) {
  const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const iconColor = type === 'success' ? 'text-green-400' : 'text-red-400';

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${bgColor} border rounded-lg shadow-lg p-4 animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-start gap-3">
        {type === 'success' ? (
          <svg className={`w-5 h-5 ${iconColor} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className={`w-5 h-5 ${iconColor} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`${textColor} hover:opacity-70`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * SocioNewPage - Page for creating a new member
 */
export function SocioNewPage() {
  const navigate = useNavigate();
  const createMember = useMutation(api.members.createMember);
  
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /**
   * Handle form submission
   * Creates a new member and redirects to /soci on success
   */
  const handleSubmit = async (data: MemberFormData & { 
    statusId?: string; 
    sesso?: 'M' | 'F'; 
    luogoNascita?: string; 
    codiceCatastale?: string;
  }) => {
    setIsLoading(true);
    setToast(null);

    try {
      // Transform empty strings to undefined for optional fields
      const memberData = {
        nome: data.nome,
        cognome: data.cognome,
        codiceFiscale: data.codiceFiscale.toUpperCase(),
        dataNascita: data.dataNascita,
        sesso: data.sesso || undefined,
        luogoNascita: data.luogoNascita || undefined,
        codiceCatastale: data.codiceCatastale || undefined,
        email: data.email || undefined,
        telefono: data.telefono || undefined,
        indirizzo: data.indirizzo || undefined,
        comune: data.comune || undefined,
        cap: data.cap || undefined,
        note: data.note || undefined,
        socioAttivo: data.socioAttivo,
        stato: data.stato,
        statusId: data.statusId ? (data.statusId as any) : undefined,
      };

      await createMember(memberData);
      
      // Show success toast
      setToast({ message: 'Socio creato con successo!', type: 'success' });
      
      // Redirect to /soci after a short delay
      setTimeout(() => {
        navigate('/soci');
      }, 1500);
    } catch (error) {
      // Show error message (Req 13.5)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Si è verificato un errore durante la creazione del socio';
      
      setToast({ message: errorMessage, type: 'error' });
      setIsLoading(false);
    }
  };

  /**
   * Close toast notification
   */
  const handleCloseToast = () => {
    setToast(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={handleCloseToast}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/soci"
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Torna alla lista soci"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Nuovo Socio</h1>
              <p className="text-sm text-slate-500 hidden sm:block">
                Inserisci i dati del nuovo socio
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <MemberForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Crea Socio"
        />
      </main>

      {/* Mobile bottom spacer */}
      <div className="h-8 md:hidden" />
    </div>
  );
}

export default SocioNewPage;

/**
 * SocioDetailPage - Member detail page
 * 
 * Displays complete member information with organized sections:
 * - Personal info (nome, cognome, CF, data nascita)
 * - Contact info (email, telefono)
 * - Address (indirizzo, comune, cap)
 * - Status (socioAttivo badge, stato badge)
 * - Notes (if present)
 * - Associated memberships (tessere) - placeholder for Task 7
 * 
 * Actions:
 * - Edit button linking to /soci/:id/edit
 * - Delete button with confirmation dialog
 * - Back button to /soci
 * 
 * Requirements:
 * - Req 4.4: Show current membership and history (placeholder for now)
 * - Req 10.2: Full data only for authorized users
 * - Req 10.4: Socio can view all their own data
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TesseraCard, TesseraForm } from '../components/memberships';
import { calculateAssociationYear } from '../utils/associationYear';

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
 * Loading skeleton for the detail page
 */
function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="h-8 bg-slate-200 rounded w-48 mb-2" />
            <div className="h-5 bg-slate-200 rounded w-40" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 bg-slate-200 rounded-full w-20" />
            <div className="h-6 bg-slate-200 rounded-full w-16" />
          </div>
        </div>
      </div>

      {/* Personal info skeleton */}
      <div className="card">
        <div className="h-6 bg-slate-200 rounded w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
              <div className="h-5 bg-slate-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Contact skeleton */}
      <div className="card">
        <div className="h-6 bg-slate-200 rounded w-24 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-4 bg-slate-200 rounded w-16 mb-2" />
              <div className="h-5 bg-slate-200 rounded w-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Address skeleton */}
      <div className="card">
        <div className="h-6 bg-slate-200 rounded w-28 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
            <div className="h-5 bg-slate-200 rounded w-48" />
          </div>
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-4 bg-slate-200 rounded w-16 mb-2" />
              <div className="h-5 bg-slate-200 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Error state component for member not found
 */
function NotFoundState() {
  return (
    <div className="card text-center py-12">
      <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Socio non trovato</h3>
      <p className="text-slate-600 mb-6">
        Il socio richiesto non esiste o non hai i permessi per visualizzarlo.
      </p>
      <Link to="/soci" className="btn-primary">
        Torna alla lista soci
      </Link>
    </div>
  );
}

/**
 * Badge component for socioAttivo status
 */
function SocioAttivoBadge({ socioAttivo }: { socioAttivo: boolean }) {
  if (socioAttivo) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
        Socio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
      Simpatizzante
    </span>
  );
}

/**
 * Badge component for stato (member status)
 */
function StatoBadge({ stato }: { stato: 'attivo' | 'sospeso' | 'dimesso' }) {
  const styles = {
    attivo: 'bg-green-100 text-green-800',
    sospeso: 'bg-yellow-100 text-yellow-800',
    dimesso: 'bg-red-100 text-red-800',
  };

  const labels = {
    attivo: 'Attivo',
    sospeso: 'Sospeso',
    dimesso: 'Dimesso',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[stato]}`}>
      {labels[stato]}
    </span>
  );
}

/**
 * Info row component for displaying label-value pairs
 */
function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-base text-slate-900">
        {value || <span className="text-slate-400 italic">Non specificato</span>}
      </dd>
    </div>
  );
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
 * SocioDetailPage - Main component
 */
export function SocioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deleteMember = useMutation(api.members.deleteMember);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showTesseraForm, setShowTesseraForm] = useState(false);

  // Fetch member data
  const member = useQuery(
    api.members.getMember,
    id ? { memberId: id as Id<"members"> } : "skip"
  );

  // Fetch member status if member has statusId
  const memberStatus = useQuery(
    api.memberStatuses.getById,
    member?.statusId ? { statusId: member.statusId } : "skip"
  );

  // Fetch memberships for this member
  const memberships = useQuery(
    api.memberships.getMembershipsByMember,
    id ? { memberId: id as Id<"members"> } : "skip"
  );

  // Get current profile to check permissions
  const profile = useQuery(api.profiles.getCurrentProfile);
  const canEdit = profile?.role === 'admin' || profile?.role === 'direttivo';

  // Get current association year for highlighting
  const currentYear = calculateAssociationYear();

  // Determine loading and error states
  const isLoading = member === undefined;
  const memberNotFound = member === null;

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteMember({ memberId: id as Id<"members"> });
      setToast({ message: 'Socio eliminato con successo', type: 'success' });
      setIsDeleteDialogOpen(false);
      
      // Redirect to list after a short delay
      setTimeout(() => {
        navigate('/soci');
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Si è verificato un errore durante l\'eliminazione';
      setToast({ message: errorMessage, type: 'error' });
      setIsDeleting(false);
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

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Elimina Socio"
        message={member 
          ? `Sei sicuro di voler eliminare ${member.nome} ${member.cognome}? Questa azione eliminerà anche tutte le tessere e partecipazioni associate. L'operazione non può essere annullata.`
          : 'Sei sicuro di voler eliminare questo socio?'
        }
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                to="/soci"
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                aria-label="Torna alla lista soci"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900 truncate">
                  {isLoading ? 'Caricamento...' : member ? `${member.nome} ${member.cognome}` : 'Dettaglio Socio'}
                </h1>
                <p className="text-sm text-slate-500 hidden sm:block">
                  Dettaglio anagrafica socio
                </p>
              </div>
            </div>

            {/* Action buttons */}
            {member && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  to={`/soci/${id}/edit`}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden sm:inline">Modifica</span>
                </Link>
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Elimina</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <DetailPageSkeleton />
        ) : memberNotFound ? (
          <NotFoundState />
        ) : (
          <div className="space-y-6">
            {/* Status badges header */}
            <div className="card">
              <div className="flex flex-wrap items-center gap-3">
                {memberStatus && (
                  <span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: memberStatus.color || '#6B7280' }}
                  >
                    {memberStatus.name}
                  </span>
                )}
                <SocioAttivoBadge socioAttivo={member.socioAttivo} />
                <StatoBadge stato={member.stato} />
                <span className="text-sm text-slate-500 ml-auto">
                  Creato il {formatDate(new Date(member.createdAt).toISOString().split('T')[0])}
                </span>
              </div>
            </div>

            {/* Personal Information */}
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Dati Personali
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Nome" value={member.nome} />
                <InfoRow label="Cognome" value={member.cognome} />
                <InfoRow label="Codice Fiscale" value={member.codiceFiscale} />
                <InfoRow label="Data di Nascita" value={formatDate(member.dataNascita)} />
              </dl>
            </div>

            {/* Contact Information */}
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contatti
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow 
                  label="Email" 
                  value={member.email}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                />
                <InfoRow 
                  label="Telefono" 
                  value={member.telefono}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  }
                />
              </dl>
            </div>

            {/* Address Information */}
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Indirizzo
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <InfoRow label="Indirizzo" value={member.indirizzo} />
                </div>
                <InfoRow label="Comune" value={member.comune} />
                <InfoRow label="CAP" value={member.cap} />
              </dl>
            </div>

            {/* Notes (if present) */}
            {member.note && (
              <div className="card">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Note
                </h2>
                <p className="text-slate-700 whitespace-pre-wrap">{member.note}</p>
              </div>
            )}

            {/* Memberships Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9a2 2 0 10-4 0v5a2 2 0 01-2 2h6m-6-4h4m8 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tessere Associative
                </h2>
                
                {canEdit && !showTesseraForm && (
                  <button
                    onClick={() => setShowTesseraForm(true)}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuova tessera
                  </button>
                )}
              </div>
              
              {/* New membership form */}
              {showTesseraForm && id && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Nuova tessera per l'anno {currentYear.label}
                  </h3>
                  <TesseraForm
                    memberId={id as Id<"members">}
                    onSuccess={() => {
                      setShowTesseraForm(false);
                      setToast({ message: 'Tessera creata con successo', type: 'success' });
                    }}
                    onCancel={() => setShowTesseraForm(false)}
                  />
                </div>
              )}
              
              {/* Memberships list */}
              {memberships === undefined ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-4">
                      <div className="h-5 bg-slate-200 rounded w-24 mb-3" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-4 bg-slate-200 rounded w-16" />
                        <div className="h-4 bg-slate-200 rounded w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : memberships && memberships.length > 0 ? (
                <div className="space-y-4">
                  {memberships.map((membership) => (
                    <TesseraCard
                      key={membership._id}
                      membership={membership}
                      isCurrentYear={membership.startYear === currentYear.startYear}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-slate-500 text-sm mb-4">
                    Nessuna tessera associativa registrata
                  </p>
                  {canEdit && !showTesseraForm && (
                    <button
                      onClick={() => setShowTesseraForm(true)}
                      className="btn-primary text-sm"
                    >
                      Crea prima tessera
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Last updated info */}
            <div className="text-center text-sm text-slate-400 py-4">
              Ultimo aggiornamento: {formatDate(new Date(member.updatedAt).toISOString().split('T')[0])}
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom spacer */}
      <div className="h-8 md:hidden" />
    </div>
  );
}

export default SocioDetailPage;

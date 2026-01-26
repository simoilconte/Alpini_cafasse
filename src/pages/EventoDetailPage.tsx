/**
 * EventoDetailPage - Event detail page with participant management
 * 
 * Displays:
 * - Event information
 * - Participant list with hours
 * - Add/remove participants
 * - Close event action
 * 
 * Requirements:
 * - Req 7.1: Show participants list
 * - Req 7.3: Show participant count and total hours
 * - Req 7.4: Close event functionality
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

/**
 * Format datetime from ISO string to Italian format
 */
function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format duration in minutes to hours and minutes
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} minuti`;
  if (mins === 0) return `${hours} ore`;
  return `${hours} ore e ${mins} minuti`;
}

/**
 * Status badge component
 */
function StatoBadge({ stato }: { stato: 'pianificato' | 'confermato' | 'chiuso' }) {
  const styles = {
    pianificato: 'bg-yellow-100 text-yellow-800',
    confermato: 'bg-green-100 text-green-800',
    chiuso: 'bg-slate-100 text-slate-700',
  };

  const labels = {
    pianificato: 'Pianificato',
    confermato: 'Confermato',
    chiuso: 'Chiuso',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${styles[stato]}`}>
      {labels[stato]}
    </span>
  );
}

/**
 * Participant card component
 */
function ParticipantCard({
  participant,
  canEdit,
  onRemove,
  onUpdateHours,
}: {
  participant: {
    _id: Id<"eventParticipants">;
    memberName: string;
    oreEffettiveMinuti: number;
    ruolo?: string;
    note?: string;
  };
  canEdit: boolean;
  onRemove: () => void;
  onUpdateHours: (minutes: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [hours, setHours] = useState(Math.floor(participant.oreEffettiveMinuti / 60));
  const [minutes, setMinutes] = useState(participant.oreEffettiveMinuti % 60);

  const handleSaveHours = () => {
    onUpdateHours(hours * 60 + minutes);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{participant.memberName}</p>
          {participant.ruolo && (
            <p className="text-sm text-slate-500">{participant.ruolo}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value) || 0)}
              min="0"
              className="w-16 px-2 py-1 text-sm border border-slate-300 rounded"
              placeholder="Ore"
            />
            <span className="text-slate-500">h</span>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              min="0"
              max="59"
              className="w-16 px-2 py-1 text-sm border border-slate-300 rounded"
              placeholder="Min"
            />
            <span className="text-slate-500">m</span>
            <button
              onClick={handleSaveHours}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <span className="text-sm text-slate-600">
              {formatDuration(participant.oreEffettiveMinuti)}
            </span>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Modifica ore"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={onRemove}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Rimuovi partecipante"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function EventoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const event = useQuery(api.events.getEvent, id ? { eventId: id as Id<"events"> } : "skip");
  const participants = useQuery(api.eventParticipants.getEventParticipants, id ? { eventId: id as Id<"events"> } : "skip");
  const availableMembers = useQuery(api.eventParticipants.getAvailableMembers, id ? { eventId: id as Id<"events"> } : "skip");
  const profile = useQuery(api.profiles.getCurrentProfile);

  const closeEvent = useMutation(api.events.closeEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const addParticipant = useMutation(api.eventParticipants.addParticipant);
  const removeParticipant = useMutation(api.eventParticipants.removeParticipant);
  const updateParticipant = useMutation(api.eventParticipants.updateParticipant);

  const canEdit = profile?.role === 'admin' || profile?.role === 'direttivo';
  const isLoading = event === undefined;
  const isClosed = event?.stato === 'chiuso';

  const handleCloseEvent = async () => {
    if (!id) return;
    try {
      await closeEvent({ eventId: id as Id<"events"> });
      setIsCloseDialogOpen(false);
    } catch (error) {
      console.error('Error closing event:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!id) return;
    try {
      await deleteEvent({ eventId: id as Id<"events"> });
      navigate('/eventi');
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleAddParticipant = async () => {
    if (!id || !selectedMemberId) return;
    try {
      await addParticipant({
        eventId: id as Id<"events">,
        memberId: selectedMemberId as Id<"members">,
      });
      setSelectedMemberId('');
      setShowAddParticipant(false);
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  };

  const handleRemoveParticipant = async (participantId: Id<"eventParticipants">) => {
    try {
      await removeParticipant({ participantId });
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  const handleUpdateHours = async (participantId: Id<"eventParticipants">, minutes: number) => {
    try {
      await updateParticipant({ participantId, oreEffettiveMinuti: minutes });
    } catch (error) {
      console.error('Error updating hours:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Evento non trovato</h2>
          <Link to="/eventi" className="btn-primary">Torna agli eventi</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dialogs */}
      <ConfirmDialog
        isOpen={isCloseDialogOpen}
        title="Chiudi Evento"
        message="Sei sicuro di voler chiudere questo evento? Una volta chiuso, non sarà più possibile modificarlo."
        confirmLabel="Chiudi evento"
        cancelLabel="Annulla"
        variant="warning"
        onConfirm={handleCloseEvent}
        onCancel={() => setIsCloseDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Elimina Evento"
        message="Sei sicuro di voler eliminare questo evento? Verranno eliminate anche tutte le partecipazioni associate."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        onConfirm={handleDeleteEvent}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                to="/eventi"
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900 truncate">{event.nome}</h1>
                <p className="text-sm text-slate-500">Dettaglio evento</p>
              </div>
            </div>

            {canEdit && !isClosed && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/eventi/${id}/edit`}
                  className="btn-secondary text-sm"
                >
                  Modifica
                </Link>
                <button
                  onClick={() => setIsCloseDialogOpen(true)}
                  className="px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100"
                >
                  Chiudi
                </button>
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  Elimina
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Event info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <StatoBadge stato={event.stato} />
            {event.localita && (
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {event.localita}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Inizio</p>
              <p className="font-medium text-slate-900">{formatDateTime(event.dataInizio)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Fine</p>
              <p className="font-medium text-slate-900">{formatDateTime(event.dataFine)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Durata</p>
              <p className="font-medium text-slate-900">{formatDuration(event.durataMinuti)}</p>
            </div>
          </div>

          {event.attrezzaturePreventivo && event.attrezzaturePreventivo.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-2">Attrezzature</p>
              <div className="flex flex-wrap gap-2">
                {event.attrezzaturePreventivo.map((item, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.note && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Note</p>
              <p className="text-slate-700">{event.note}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600">{event.participantCount ?? 0}</p>
            <p className="text-sm text-slate-500">Partecipanti</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{event.totalOre ?? 0}h</p>
            <p className="text-sm text-slate-500">Ore totali</p>
          </div>
        </div>

        {/* Participants */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Partecipanti</h2>
            {canEdit && !isClosed && (
              <button
                onClick={() => setShowAddParticipant(!showAddParticipant)}
                className="btn-primary text-sm"
              >
                Aggiungi
              </button>
            )}
          </div>

          {/* Add participant form */}
          {showAddParticipant && availableMembers && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Seleziona un socio...</option>
                  {availableMembers.map((m: { _id: string; fullName: string }) => (
                    <option key={m._id} value={m._id}>{m.fullName}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddParticipant}
                  disabled={!selectedMemberId}
                  className="btn-primary disabled:opacity-50"
                >
                  Aggiungi
                </button>
                <button
                  onClick={() => setShowAddParticipant(false)}
                  className="btn-secondary"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {/* Participants list */}
          {participants && participants.length > 0 ? (
            <div className="space-y-3">
              {participants.map((p: { _id: Id<"eventParticipants">; memberName: string; oreEffettiveMinuti: number; ruolo?: string; note?: string }) => (
                <ParticipantCard
                  key={p._id}
                  participant={p}
                  canEdit={canEdit && !isClosed}
                  onRemove={() => handleRemoveParticipant(p._id)}
                  onUpdateHours={(mins) => handleUpdateHours(p._id, mins)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>Nessun partecipante</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default EventoDetailPage;

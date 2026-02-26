/**
 * EventCard - Event card component
 * 
 * Displays event information in a card format with:
 * - Event name and location
 * - Date and duration
 * - Status badge
 * - Participant count and total hours
 * - Quick actions
 */

import { Link } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useState } from 'react';

interface EventCardProps {
  event: {
    _id: Id<"events">;
    nome: string;
    localita?: string;
    dataInizio: string;
    dataFine: string;
    durataMinuti: number;
    stato: 'pianificato' | 'confermato' | 'chiuso';
    participantCount?: number;
    totalOre?: number;
  };
  canEdit?: boolean;
}

/**
 * Format datetime from ISO string to Italian format
 */
function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
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
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
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
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${styles[stato]}`}>
      {labels[stato]}
    </span>
  );
}

export function EventCard({ event, canEdit = false }: EventCardProps) {
  const updateEventStatus = useMutation(api.events.updateEventStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (e: React.MouseEvent, newStatus: "confermato" | "chiuso") => {
    e.preventDefault();
    e.stopPropagation();
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await updateEventStatus({ eventId: event._id, newStatus });
    } catch (error) {
      console.error('Error updating event status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Link
      to={`/eventi/${event._id}`}
      className="block bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 truncate">{event.nome}</h3>
            {event.localita && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{event.localita}</span>
              </p>
            )}
          </div>
          <StatoBadge stato={event.stato} />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Data</p>
            <p className="text-sm font-medium text-slate-900">
              {formatDateTime(event.dataInizio)}
            </p>
          </div>

          {/* Duration */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Durata</p>
            <p className="text-sm font-medium text-slate-900">
              {formatDuration(event.durataMinuti)}
            </p>
          </div>

          {/* Participants */}
          {event.participantCount !== undefined && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Partecipanti</p>
              <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.participantCount}
              </p>
            </div>
          )}

          {/* Total hours */}
          {event.totalOre !== undefined && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Ore totali</p>
              <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {event.totalOre}h
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
          Visualizza dettagli
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
        {canEdit && event.stato !== 'chiuso' && (
          <div className="flex items-center gap-2">
            {event.stato === 'pianificato' && (
              <button
                onClick={(e) => handleStatusChange(e, 'confermato')}
                disabled={isUpdating}
                className="px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 disabled:opacity-50 transition-colors"
              >
                Conferma
              </button>
            )}
            <button
              onClick={(e) => handleStatusChange(e, 'chiuso')}
              disabled={isUpdating}
              className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              Chiudi
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}

export default EventCard;

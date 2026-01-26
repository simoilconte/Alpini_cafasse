/**
 * EventoEditPage - Edit event page
 */

import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { EventForm } from '../components/events';

export function EventoEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const event = useQuery(api.events.getEvent, id ? { eventId: id as Id<"events"> } : "skip");

  if (event === undefined) {
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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to={`/eventi/${id}`}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Modifica Evento</h1>
              <p className="text-sm text-slate-500">{event.nome}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="card">
          <EventForm
            event={event}
            onSuccess={() => navigate(`/eventi/${id}`)}
            onCancel={() => navigate(`/eventi/${id}`)}
          />
        </div>
      </main>
    </div>
  );
}

export default EventoEditPage;

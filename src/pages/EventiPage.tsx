/**
 * EventiPage - Events list page
 * 
 * Displays list of events with:
 * - Filter by status
 * - Search functionality
 * - Responsive card layout
 * - Quick actions
 * 
 * Requirements:
 * - Req 12.1: Responsive design with cards on mobile
 * - Req 12.2: Filter by status
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { EventCard } from '../components/events';

type StatoFilter = 'tutti' | 'pianificato' | 'confermato' | 'chiuso';

/**
 * Loading skeleton for event cards
 */
function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-3 bg-slate-200 rounded w-12 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-24" />
          </div>
          <div>
            <div className="h-3 bg-slate-200 rounded w-12 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ filter }: { filter: StatoFilter }) {
  const messages = {
    tutti: 'Nessun evento trovato',
    pianificato: 'Nessun evento pianificato',
    confermato: 'Nessun evento confermato',
    chiuso: 'Nessun evento chiuso',
  };

  return (
    <div className="text-center py-12">
      <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{messages[filter]}</h3>
      <p className="text-slate-600 mb-6">
        {filter === 'tutti' 
          ? 'Crea il primo evento per iniziare'
          : 'Prova a cambiare i filtri'}
      </p>
      <Link to="/eventi/new" className="btn-primary">
        Nuovo evento
      </Link>
    </div>
  );
}

export function EventiPage() {
  const [statoFilter, setStatoFilter] = useState<StatoFilter>('tutti');
  const profile = useQuery(api.profiles.getCurrentProfile);
  const canCreate = profile?.role === 'admin' || profile?.role === 'direttivo';

  // Fetch events with filter
  const events = useQuery(api.events.listEvents, 
    statoFilter === 'tutti' ? {} : { stato: statoFilter }
  );

  const isLoading = events === undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                to="/"
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Eventi</h1>
                <p className="text-sm text-slate-500 hidden sm:block">
                  Gestione eventi e impegni
                </p>
              </div>
            </div>

            {canCreate && (
              <Link to="/eventi/new" className="btn-primary text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Nuovo evento</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['tutti', 'pianificato', 'confermato', 'chiuso'] as const).map((stato) => (
              <button
                key={stato}
                onClick={() => setStatoFilter(stato)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  statoFilter === stato
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {stato === 'tutti' ? 'Tutti' : stato.charAt(0).toUpperCase() + stato.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState filter={statoFilter} />
        )}
      </main>

      {/* Bottom navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-20">
        <div className="flex items-center justify-around py-2">
          <Link to="/" className="flex flex-col items-center px-4 py-2 text-slate-600 hover:text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/soci" className="flex flex-col items-center px-4 py-2 text-slate-600 hover:text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs mt-1">Soci</span>
          </Link>
          <Link to="/eventi" className="flex flex-col items-center px-4 py-2 text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">Eventi</span>
          </Link>
          <Link to="/profilo" className="flex flex-col items-center px-4 py-2 text-slate-600 hover:text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">Profilo</span>
          </Link>
        </div>
      </nav>

      {/* Bottom spacer for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

export default EventiPage;

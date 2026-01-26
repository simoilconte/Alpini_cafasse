/**
 * EventoNewPage - Create new event page
 */

import { useNavigate, Link } from 'react-router-dom';
import { EventForm } from '../components/events';

export function EventoNewPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/eventi"
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Nuovo Evento</h1>
              <p className="text-sm text-slate-500">Crea un nuovo evento</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="card">
          <EventForm
            onSuccess={() => navigate('/eventi')}
            onCancel={() => navigate('/eventi')}
          />
        </div>
      </main>
    </div>
  );
}

export default EventoNewPage;

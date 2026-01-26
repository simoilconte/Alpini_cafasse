/**
 * MemberList Component
 * 
 * List component for displaying members.
 * Shows cards on mobile (< md breakpoint) and table on desktop (>= md breakpoint).
 * 
 * Requirements:
 * - Req 12.1: Cards on mobile
 * - Req 12.2: Table on desktop
 */

import { Link } from 'react-router-dom';
import type { Member } from '../../types';
import { MemberCard } from './MemberCard';

interface MemberListProps {
  /** Array of members to display */
  members: Array<Pick<Member, '_id' | 'nome' | 'cognome' | 'codiceFiscale' | 'email' | 'telefono' | 'socioAttivo' | 'stato'>>;
  /** Whether there are more results to load */
  hasMore?: boolean;
  /** Callback to load more results */
  onLoadMore?: () => void;
  /** Whether more results are being loaded */
  isLoadingMore?: boolean;
}

/**
 * Badge component for socioAttivo status (table view)
 */
function SocioAttivoBadge({ socioAttivo }: { socioAttivo: boolean }) {
  if (socioAttivo) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Socio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
      Simpatizzante
    </span>
  );
}

/**
 * Badge component for stato (member status) - table view
 */
function StatoBadge({ stato }: { stato: Member['stato'] }) {
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[stato]}`}>
      {labels[stato]}
    </span>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-slate-900">Nessun socio trovato</h3>
      <p className="mt-2 text-sm text-slate-500">
        Prova a modificare i filtri di ricerca o aggiungi un nuovo socio.
      </p>
    </div>
  );
}

/**
 * MemberList - Responsive list component for members
 */
export function MemberList({
  members,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: MemberListProps) {
  if (members.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {/* Mobile view - Cards (Req 12.1) */}
      <div className="md:hidden space-y-3">
        {members.map((member) => (
          <MemberCard key={member._id} member={member} />
        ))}
      </div>

      {/* Desktop view - Table (Req 12.2) */}
      <div className="hidden md:block">
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Cognome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Codice Fiscale
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Stato
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr
                    key={member._id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/soci/${member._id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {member.cognome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {member.nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                      {member.codiceFiscale}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {member.email || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <SocioAttivoBadge socioAttivo={member.socioAttivo} />
                    </td>
                    <td className="px-4 py-3">
                      <StatoBadge stato={member.stato} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Load more button */}
      {hasMore && onLoadMore && (
        <div className="mt-4 text-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="btn-secondary"
          >
            {isLoadingMore ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Caricamento...
              </>
            ) : (
              'Carica altri'
            )}
          </button>
        </div>
      )}
    </>
  );
}

export default MemberList;

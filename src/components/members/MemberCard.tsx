/**
 * MemberCard Component
 * 
 * Mobile card component for displaying member information.
 * Shows nome, cognome, codiceFiscale, email, telefono, and status badges.
 * Clickable to navigate to member detail page.
 * 
 * Requirements:
 * - Req 12.1: Cards on mobile
 */

import { Link } from 'react-router-dom';
import type { Member } from '../../types';

interface MemberCardProps {
  /** Member data to display */
  member: Pick<Member, '_id' | 'nome' | 'cognome' | 'codiceFiscale' | 'email' | 'telefono' | 'socioAttivo' | 'stato'>;
}

/**
 * Badge component for socioAttivo status
 */
function SocioAttivoBadge({ socioAttivo }: { socioAttivo: boolean }) {
  if (socioAttivo) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Socio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
      Simpatizzante
    </span>
  );
}

/**
 * Badge component for stato (member status)
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[stato]}`}>
      {labels[stato]}
    </span>
  );
}

/**
 * MemberCard - Mobile card for member display
 */
export function MemberCard({ member }: MemberCardProps) {
  return (
    <Link
      to={`/soci/${member._id}`}
      className="card block hover:shadow-md transition-shadow duration-200 active:bg-slate-50"
    >
      {/* Header with name and socioAttivo badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900 truncate">
            {member.cognome} {member.nome}
          </h3>
          <p className="text-sm text-slate-500 font-mono truncate">
            {member.codiceFiscale}
          </p>
        </div>
        <SocioAttivoBadge socioAttivo={member.socioAttivo} />
      </div>

      {/* Contact info */}
      {(member.email || member.telefono) && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
          {member.email && (
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{member.email}</span>
            </p>
          )}
          {member.telefono && (
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{member.telefono}</span>
            </p>
          )}
        </div>
      )}

      {/* Status badge */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <StatoBadge stato={member.stato} />
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default MemberCard;

/**
 * DashboardPage - Main dashboard with membership statistics
 * 
 * Displays:
 * - Quick stats widgets (soci attivi, quote pagate, in scadenza, eventi)
 * - Unpaid memberships list
 * - Expiring memberships list
 * - Quick actions
 * 
 * Requirements:
 * - Req 5.1: Count unpaid memberships for current year
 * - Req 5.2: Count memberships expiring within 30 days
 * - Req 5.3: Count expired memberships
 * - Req 12.3: Responsive design with mobile navigation
 */

import { Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useEffect } from 'react';

/**
 * Stat card component for dashboard widgets
 */
function StatCard({ 
  title, 
  value, 
  icon, 
  color,
  loading = false,
  linkTo,
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
  linkTo?: string;
}) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const valueColorStyles = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    yellow: 'text-yellow-900',
    red: 'text-red-900',
    purple: 'text-purple-900',
  };

  const content = (
    <div className={`rounded-xl p-4 ${colorStyles[color]} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="w-8 h-8 flex items-center justify-center">
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="h-8 bg-current opacity-20 rounded w-16 animate-pulse" />
      ) : (
        <p className={`text-2xl font-bold ${valueColorStyles[color]}`}>{value}</p>
      )}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }

  return content;
}

/**
 * Quick action button component
 */
function QuickAction({ 
  title, 
  description, 
  icon, 
  to 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 truncate">{description}</p>
      </div>
      <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

/**
 * Membership alert item for unpaid/expiring lists
 */
function MembershipAlertItem({ 
  memberName, 
  amount, 
  status,
  memberId,
}: { 
  memberName: string; 
  amount: number; 
  status: 'unpaid' | 'expiring' | 'expired';
  memberId: string;
}) {
  const statusStyles = {
    unpaid: 'bg-red-100 text-red-700',
    expiring: 'bg-yellow-100 text-yellow-700',
    expired: 'bg-slate-100 text-slate-700',
  };

  const statusLabels = {
    unpaid: 'Non pagata',
    expiring: 'In scadenza',
    expired: 'Scaduta',
  };

  return (
    <Link
      to={`/soci/${memberId}`}
      className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{memberName}</p>
          <p className="text-sm text-slate-500">€{amount.toFixed(2)}</p>
        </div>
      </div>
      <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    </Link>
  );
}

/**
 * Empty state for lists
 */
function EmptyListState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-slate-500">
      <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

/**
 * Loading skeleton for lists
 */
function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 animate-pulse">
          <div className="w-10 h-10 bg-slate-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-16" />
          </div>
          <div className="h-6 bg-slate-200 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const profile = useQuery(api.profiles.getCurrentProfile);
  const ensureProfile = useMutation(api.profiles.ensureProfile);
  
  // Ensure profile exists on first load
  useEffect(() => {
    if (profile === null) {
      ensureProfile().catch(console.error);
    }
  }, [profile, ensureProfile]);

  const activeCount = useQuery(api.members.getMemberCount, 
    profile ? { socioAttivo: true } : "skip"
  );
  const totalCount = useQuery(api.members.getMemberCount, 
    profile ? {} : "skip"
  );
  
  // Dashboard stats - only for admin/direttivo
  const isAdmin = profile?.role === 'admin' || profile?.role === 'direttivo';
  
  const dashboardStats = useQuery(api.memberships.getDashboardStats, 
    isAdmin ? {} : "skip"
  );
  const unpaidMemberships = useQuery(api.memberships.getUnpaidMemberships, 
    isAdmin ? {} : "skip"
  );
  const expiringMemberships = useQuery(api.memberships.getExpiringMemberships, 
    isAdmin ? {} : "skip"
  );
  
  // Payment stats for scadenziario banner
  const paymentStats = useQuery(api.payments.getDashboardStats, 
    isAdmin ? {} : "skip"
  );

  // Show loading while profile is being created/loaded
  if (profile === undefined || profile === null) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Maestrale" className="h-20 w-auto mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  const statsLoading = dashboardStats === undefined;
  const unpaidLoading = unpaidMemberships === undefined;
  const expiringLoading = expiringMemberships === undefined;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-600 mt-1">
            {dashboardStats?.associationYearLabel 
              ? `Anno associativo ${dashboardStats.associationYearLabel}`
              : 'Panoramica del sistema'}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Soci Attivi"
            value={activeCount ?? '-'}
            loading={activeCount === undefined}
            color="blue"
            linkTo="/soci"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          
          {isAdmin && (
            <>
              <StatCard
                title="Quote Pagate"
                value={dashboardStats?.paidCount ?? '-'}
                loading={statsLoading}
                color="green"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              
              <StatCard
                title="Non Pagate"
                value={dashboardStats?.unpaidCount ?? '-'}
                loading={statsLoading}
                color="red"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              
              <StatCard
                title="In Scadenza"
                value={dashboardStats?.expiringCount ?? '-'}
                loading={statsLoading}
                color="yellow"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </>
          )}
          
          {!isAdmin && (
            <>
              <StatCard
                title="Totale Soci"
                value={totalCount ?? '-'}
                loading={totalCount === undefined}
                color="purple"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Azioni Rapide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickAction
              title="Gestione Soci"
              description="Visualizza e gestisci l'anagrafica"
              to="/soci"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            
            {isAdmin && (
              <QuickAction
                title="Nuovo Socio"
                description="Aggiungi un nuovo socio"
                to="/soci/new"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                }
              />
            )}
            
            <QuickAction
              title="Eventi"
              description="Gestisci eventi e partecipazioni"
              to="/eventi"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Scadenziario Banner - only for admin/direttivo */}
        {isAdmin && paymentStats && (paymentStats.dueThisMonthCount > 0 || paymentStats.overdueCount > 0) && (
          <div className="mb-8">
            <Link
              to="/scadenziario"
              className="block bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900">Scadenze Pagamenti</h3>
                    <div className="flex items-center gap-3 text-sm">
                      {paymentStats.overdueCount > 0 && (
                        <span className="text-red-600 font-medium">
                          {paymentStats.overdueCount} scadut{paymentStats.overdueCount === 1 ? 'o' : 'i'}
                        </span>
                      )}
                      {paymentStats.dueIn7DaysCount > 0 && (
                        <span className="text-amber-700">
                          {paymentStats.dueIn7DaysCount} entro 7 giorni
                        </span>
                      )}
                      {paymentStats.dueThisMonthCount > 0 && (
                        <span className="text-amber-600">
                          {paymentStats.dueThisMonthCount} questo mese
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        )}

        {/* Alerts section - only for admin/direttivo */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unpaid memberships */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Quote Non Pagate
                </h3>
                {unpaidMemberships && unpaidMemberships.length > 0 && (
                  <span className="text-sm text-slate-500">
                    {unpaidMemberships.length} totali
                  </span>
                )}
              </div>
              
              {unpaidLoading ? (
                <ListSkeleton />
              ) : unpaidMemberships && unpaidMemberships.length > 0 ? (
                <div className="space-y-3">
                  {unpaidMemberships.slice(0, 5).map((membership) => (
                    <MembershipAlertItem
                      key={membership._id}
                      memberName={membership.memberName}
                      amount={membership.quotaImporto}
                      status="unpaid"
                      memberId={membership.memberId}
                    />
                  ))}
                  {unpaidMemberships.length > 5 && (
                    <Link
                      to="/tessere?filter=unpaid"
                      className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
                    >
                      Vedi tutti ({unpaidMemberships.length})
                    </Link>
                  )}
                </div>
              ) : (
                <EmptyListState message="Tutte le quote sono state pagate!" />
              )}
            </div>

            {/* Expiring memberships */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  In Scadenza (30 giorni)
                </h3>
                {expiringMemberships && expiringMemberships.length > 0 && (
                  <span className="text-sm text-slate-500">
                    {expiringMemberships.length} totali
                  </span>
                )}
              </div>
              
              {expiringLoading ? (
                <ListSkeleton />
              ) : expiringMemberships && expiringMemberships.length > 0 ? (
                <div className="space-y-3">
                  {expiringMemberships.slice(0, 5).map((membership) => (
                    <MembershipAlertItem
                      key={membership._id}
                      memberName={membership.memberName}
                      amount={membership.quotaImporto}
                      status="expiring"
                      memberId={membership.memberId}
                    />
                  ))}
                  {expiringMemberships.length > 5 && (
                    <Link
                      to="/tessere?filter=expiring"
                      className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
                    >
                      Vedi tutti ({expiringMemberships.length})
                    </Link>
                  )}
                </div>
              ) : (
                <EmptyListState message="Nessuna tessera in scadenza" />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;

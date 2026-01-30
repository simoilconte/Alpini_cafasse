/**
 * Borse Spesa - Registro Consegne
 * 
 * Daily food bag distribution registry.
 * Shows families, allows delivery registration, undo, and date navigation.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Get today's date in Europe/Rome timezone as YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

// Get weekday number (0=Sun, 1=Mon, ..., 6=Sat) for a date string
function getWeekday(dateStr: string): number {
  const date = new Date(dateStr + "T12:00:00");
  return date.getDay();
}

// Format date for display
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Navigate date by days
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T12:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function BorseSpesaPage() {
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const selectedWeekday = getWeekday(selectedDate);
  const isToday = selectedDate === today;
  
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"cognome" | "comune">("cognome");
  const [selectedFamilyId, setSelectedFamilyId] = useState<Id<"beneficiaryFamilies"> | null>(null);
  const [showResoModal, setShowResoModal] = useState(false);
  const [isDelivering, setIsDelivering] = useState<Id<"beneficiaryFamilies"> | null>(null);

  // Queries
  const families = useQuery(api.beneficiaryFamilies.list, { attiva: true, search: search || undefined });
  const dateDeliveries = useQuery(api.bagDeliveries.listByDate, { deliveryDate: selectedDate });
  const warningCounts = useQuery(api.bagDeliveries.getFamilyWarningCounts);
  const activeWeekdays = useQuery(api.appSettings.getDistributionSettings);
  const unreturnedBags = useQuery(
    api.bagDeliveries.getUnreturnedByFamily,
    selectedFamilyId ? { familyId: selectedFamilyId } : "skip"
  );

  // Mutations
  const createDelivery = useMutation(api.bagDeliveries.create);
  const removeDelivery = useMutation(api.bagDeliveries.remove);
  const markReturned = useMutation(api.bagDeliveries.markReturned);

  // Check if selected date is active distribution day
  const isActiveDay = activeWeekdays?.includes(selectedWeekday) ?? false;

  // Map of deliveries by family for selected date
  const deliveryByFamily = useMemo(() => {
    const map = new Map<string, NonNullable<typeof dateDeliveries>[0]>();
    if (!dateDeliveries) return map;
    for (const d of dateDeliveries) {
      map.set(d.familyId, d);
    }
    return map;
  }, [dateDeliveries]);

  // Sorted families
  const sortedFamilies = useMemo(() => {
    if (!families) return undefined;
    const sorted = [...families];
    if (sortBy === "comune") {
      sorted.sort((a, b) => {
        const locA = (a as any).deliveryLocation || "";
        const locB = (b as any).deliveryLocation || "";
        if (locA === locB) {
          return a.referenteCognome.localeCompare(b.referenteCognome);
        }
        return locA.localeCompare(locB);
      });
    }
    return sorted;
  }, [families, sortBy]);

  // Handle delivery
  const handleDeliver = async (familyId: Id<"beneficiaryFamilies">) => {
    setIsDelivering(familyId);
    try {
      await createDelivery({
        familyId,
        deliveryDate: selectedDate,
      });
    } catch (error: any) {
      alert(error.message || "Errore durante la consegna");
    } finally {
      setIsDelivering(null);
    }
  };

  // Handle undo delivery
  const handleUndoDelivery = async (deliveryId: Id<"bagDeliveries">) => {
    if (!confirm("Annullare questa consegna?")) return;
    try {
      await removeDelivery({ deliveryId });
    } catch (error: any) {
      alert(error.message || "Errore durante l'annullamento");
    }
  };

  // Handle mark returned
  const handleMarkReturned = async (deliveryId: Id<"bagDeliveries">) => {
    try {
      await markReturned({ deliveryId });
    } catch (error: any) {
      alert(error.message || "Errore durante il reso");
    }
  };

  // Open reso modal
  const openResoModal = (familyId: Id<"beneficiaryFamilies">) => {
    setSelectedFamilyId(familyId);
    setShowResoModal(true);
  };

  const selectedFamily = families?.find((f) => f._id === selectedFamilyId);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Registro Borse Spesa</h1>
          <div className="flex gap-2">
            <Link
              to="/borse-spesa/registro"
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Registro
            </Link>
            <Link
              to="/borse-spesa/famiglie"
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Famiglie
            </Link>
            <Link
              to="/borse-spesa/impostazioni"
              className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              title="Impostazioni"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Date selector */}
      <div className="bg-white rounded-lg p-3 shadow-sm border mb-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-center font-medium"
              />
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(today)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-medium hover:bg-blue-200"
                >
                  Oggi
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1 capitalize">
              {formatDateDisplay(selectedDate)}
            </p>
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isActiveDay
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {isActiveDay ? "Giorno attivo" : "Giorno non attivo"}
            </span>
          </div>

          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Cerca famiglia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "cognome" | "comune")}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="cognome">Cognome</option>
          <option value="comune">Comune</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 shadow-sm border">
          <p className="text-sm text-slate-500">Consegne {isToday ? "oggi" : "questo giorno"}</p>
          <p className="text-2xl font-bold text-slate-900">{dateDeliveries?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border">
          <p className="text-sm text-slate-500">Famiglie attive</p>
          <p className="text-2xl font-bold text-slate-900">{families?.length ?? 0}</p>
        </div>
      </div>

      {/* Families list */}
      <div className="space-y-3">
        {sortedFamilies === undefined ? (
          <div className="text-center py-8 text-slate-500">Caricamento...</div>
        ) : sortedFamilies.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {search ? "Nessuna famiglia trovata" : "Nessuna famiglia attiva"}
          </div>
        ) : (
          sortedFamilies.map((family) => {
            const delivery = deliveryByFamily.get(family._id);
            const hasDelivered = !!delivery;
            const warningCount = warningCounts?.[family._id] ?? 0;
            const deliveryLocation = (family as any).deliveryLocation;

            return (
              <div
                key={family._id}
                className={`bg-white rounded-lg p-4 shadow-sm border ${
                  hasDelivered ? "border-green-200 bg-green-50/30" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">
                        {family.referenteCognome} {family.referenteNome}
                      </h3>
                      <span className="text-sm text-slate-500">
                        ({family.componentiNucleo} {family.componentiNucleo === 1 ? "persona" : "persone"})
                      </span>
                      {warningCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          ⚠️ {warningCount} non rese
                        </span>
                      )}
                      {hasDelivered && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          ✓ Consegnata
                        </span>
                      )}
                    </div>
                    {deliveryLocation && (
                      <p className="text-sm text-blue-600 mt-1">📍 {deliveryLocation}</p>
                    )}
                    {family.note && (
                      <p className="text-sm text-slate-500 mt-1">{family.note}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {!hasDelivered ? (
                    <button
                      onClick={() => handleDeliver(family._id)}
                      disabled={isDelivering === family._id}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDelivering === family._id ? "Consegna..." : "Consegna"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUndoDelivery(delivery._id)}
                      className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Annulla consegna
                    </button>
                  )}
                  {warningCount > 0 && (
                    <button
                      onClick={() => openResoModal(family._id)}
                      className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-medium hover:bg-amber-200"
                    >
                      Reso
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reso Modal */}
      {showResoModal && selectedFamily && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Reso borse - {selectedFamily.referenteCognome}
                </h2>
                <button
                  onClick={() => setShowResoModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {unreturnedBags === undefined ? (
                <p className="text-center text-slate-500 py-4">Caricamento...</p>
              ) : unreturnedBags.length === 0 ? (
                <p className="text-center text-slate-500 py-4">Nessuna borsa da rendere</p>
              ) : (
                <div className="space-y-2">
                  {unreturnedBags.map((delivery) => (
                    <div
                      key={delivery._id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {new Date(delivery.deliveryDate + "T12:00:00").toLocaleDateString("it-IT")}
                        </p>
                        {delivery.notes && (
                          <p className="text-sm text-slate-500">{delivery.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleMarkReturned(delivery._id)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                      >
                        Segna resa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BorseSpesaPage;

/**
 * Registro Consegne - Full History
 * 
 * Complete delivery registry with filters and Excel export.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Get first day of current month
function getFirstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

// Get today
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

// Export to CSV (Excel compatible)
function exportToExcel(data: any[], filename: string) {
  // CSV header
  const headers = ["Data", "Famiglia", "Comune", "Componenti", "Borsa Resa", "Note"];
  
  // CSV rows
  const rows = data.map((d) => [
    d.deliveryDate,
    d.family ? `${d.family.referenteCognome} ${d.family.referenteNome}` : "N/A",
    d.family?.deliveryLocation || "",
    d.family?.componentiNucleo ?? "",
    d.emptyBagReturned ? "Sì" : "No",
    d.notes || "",
  ]);

  // Build CSV content
  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
  ].join("\n");

  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  
  // Download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function RegistroConsegnePage() {
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getToday());
  const [selectedFamilyId, setSelectedFamilyId] = useState<Id<"beneficiaryFamilies"> | "">("");
  const [sortBy, setSortBy] = useState<"data" | "comune">("data");

  // Queries
  const families = useQuery(api.beneficiaryFamilies.list, {});
  const deliveries = useQuery(api.bagDeliveries.listAll, {
    familyId: selectedFamilyId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  // Stats
  const stats = useMemo(() => {
    if (!deliveries) return { total: 0, returned: 0, notReturned: 0 };
    return {
      total: deliveries.length,
      returned: deliveries.filter((d) => d.emptyBagReturned).length,
      notReturned: deliveries.filter((d) => !d.emptyBagReturned).length,
    };
  }, [deliveries]);

  // Sorted deliveries
  const sortedDeliveries = useMemo(() => {
    if (!deliveries) return undefined;
    const sorted = [...deliveries];
    if (sortBy === "comune") {
      sorted.sort((a, b) => {
        const locA = (a.family as any)?.deliveryLocation || "";
        const locB = (b.family as any)?.deliveryLocation || "";
        if (locA === locB) {
          return a.deliveryDate.localeCompare(b.deliveryDate);
        }
        return locA.localeCompare(locB);
      });
    }
    return sorted;
  }, [deliveries, sortBy]);

  const handleExport = () => {
    if (!deliveries || deliveries.length === 0) {
      alert("Nessun dato da esportare");
      return;
    }
    const filename = `registro-borse-spesa-${dateFrom}-${dateTo}.csv`;
    exportToExcel(deliveries, filename);
  };

  const clearFilters = () => {
    setDateFrom(getFirstDayOfMonth());
    setDateTo(getToday());
    setSelectedFamilyId("");
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/borse-spesa"
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Registro Consegne</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">Storico completo delle consegne</p>
        </div>
        <button
          onClick={handleExport}
          disabled={!deliveries || deliveries.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Esporta Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-slate-900">Filtri</h2>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:underline"
          >
            Resetta
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Da data</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">A data</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Famiglia</label>
            <select
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutte le famiglie</option>
              {families?.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.referenteCognome} {f.referenteNome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Ordina per</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "data" | "comune")}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="data">Data consegna</option>
              <option value="comune">Comune di consegna</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 shadow-sm border text-center">
          <p className="text-sm text-slate-500">Totale</p>
          <p className="text-xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border text-center">
          <p className="text-sm text-slate-500">Borse rese</p>
          <p className="text-xl font-bold text-green-600">{stats.returned}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border text-center">
          <p className="text-sm text-slate-500">Non rese</p>
          <p className="text-xl font-bold text-amber-600">{stats.notReturned}</p>
        </div>
      </div>

      {/* Table/List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Famiglia</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Comune</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Componenti</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Borsa</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedDeliveries === undefined ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Caricamento...
                  </td>
                </tr>
              ) : sortedDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nessuna consegna trovata
                  </td>
                </tr>
              ) : (
                sortedDeliveries.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(d.deliveryDate + "T12:00:00").toLocaleDateString("it-IT", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">
                        {d.family ? `${d.family.referenteCognome} ${d.family.referenteNome}` : "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {(d.family as any)?.deliveryLocation || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">
                      {d.family?.componentiNucleo ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.emptyBagReturned ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Resa
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Non resa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">
                      {d.notes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {sortedDeliveries === undefined ? (
            <div className="p-4 text-center text-slate-500">Caricamento...</div>
          ) : sortedDeliveries.length === 0 ? (
            <div className="p-4 text-center text-slate-500">Nessuna consegna trovata</div>
          ) : (
            sortedDeliveries.map((d) => (
              <div key={d._id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {d.family ? `${d.family.referenteCognome} ${d.family.referenteNome}` : "N/A"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(d.deliveryDate + "T12:00:00").toLocaleDateString("it-IT", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {(d.family as any)?.deliveryLocation && (
                      <p className="text-sm text-blue-600">
                        📍 {(d.family as any).deliveryLocation}
                      </p>
                    )}
                  </div>
                  {d.emptyBagReturned ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Resa
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Non resa
                    </span>
                  )}
                </div>
                {d.notes && (
                  <p className="text-sm text-slate-500 mt-1">{d.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RegistroConsegnePage;

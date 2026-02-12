import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import * as XLSX from "xlsx";

// Types
interface Movement {
  _id: Id<"movements">;
  title: string;
  description?: string;
  type: "IN" | "OUT";
  amountPlanned?: number;
  amountActual?: number;
  dueDate: string;
  statusId: Id<"movementStatuses">;
  isRecurring: boolean;
  recurrenceType?: "EVERY_N_MONTHS" | "CUSTOM_DATES";
  everyNMonths?: number;
  customDates?: string[];
  executedAt?: number;
  executedNote?: string;
  urgencyInfo?: {
    isOverdue: boolean;
    isDueSoon7: boolean;
    isDueSoon14: boolean;
    executed: boolean;
    daysLeft?: number;
  };
  status?: {
    _id: Id<"movementStatuses">;
    nome: string;
    descrizione?: string;
    attivo: boolean;
  };
}

const MovimentiPage: React.FC = () => {
  // States
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"IN" | "OUT" | "">("");
  const [statusFilter, setStatusFilter] = useState<Id<"movementStatuses"> | "">("");
  const [monthFilter, setMonthFilter] = useState(format(new Date(), "yyyy-MM"));
  const [showOnlyDue, setShowOnlyDue] = useState(false);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [showExecuted, setShowExecuted] = useState(false);

  // Queries
  const movements = useQuery(api.movements.list, {
    search: search || undefined,
    typeId: typeFilter || undefined,
    statusId: statusFilter || undefined,
    startDate: monthFilter ? `${monthFilter}-01` : undefined,
    endDate: monthFilter ? `${monthFilter}-31` : undefined,
    showOnlyDue,
    showOnlyOverdue,
    showExecuted,
  });

  const movementStatuses = useQuery(api.movementStatuses.list);
  const dashboardStats = useQuery(api.movements.getDashboardStats);

  // Mutations
  const markAsExecuted = useMutation(api.movements.markAsExecuted);
  const deleteMovement = useMutation(api.movements.remove);

  // State for modals
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [showExecutedModal, setShowExecutedModal] = useState(false);
  const [executedForm, setExecutedForm] = useState({
    executedAt: "",
    amountActual: "",
    executedNote: "",
  });

  // Calculate filtered stats
  const calculateStats = () => {
    if (!movements || movements.length === 0) {
      return { incomes: 0, expenses: 0, balance: 0 };
    }

    const incomes = movements
      .filter((m) => m.type === "IN")
      .reduce((sum, m) => {
        const amount = m.executedAt && m.amountActual ? m.amountActual : m.amountPlanned || 0;
        return sum + amount;
      }, 0);

    const expenses = movements
      .filter((m) => m.type === "OUT")
      .reduce((sum, m) => {
        const amount = m.executedAt && m.amountActual ? m.amountActual : m.amountPlanned || 0;
        return sum + amount;
      }, 0);

    return {
      incomes,
      expenses,
      balance: incomes - expenses,
    };
  };

  const stats = calculateStats();

  // Handle mark as executed
  const handleMarkAsExecuted = async () => {
    if (!selectedMovement) return;

    try {
      await markAsExecuted({
        id: selectedMovement._id,
        executedAt: executedForm.executedAt
          ? new Date(executedForm.executedAt).getTime()
          : undefined,
        amountActual: executedForm.amountActual ? parseFloat(executedForm.amountActual) : undefined,
        executedNote: executedForm.executedNote || undefined,
      });

      setShowExecutedModal(false);
      setSelectedMovement(null);
      setExecutedForm({ executedAt: "", amountActual: "", executedNote: "" });
    } catch (error) {
      console.error("Error marking movement as executed:", error);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!movements || movements.length === 0) return;

    const exportData = movements.map((m) => ({
      ID: m._id,
      Titolo: m.title,
      Tipo: m.type === "IN" ? "Entrata" : "Uscita",
      "Data Scadenza": m.dueDate,
      Stato: m.status?.nome || "",
      "Importo Previsto": m.amountPlanned || 0,
      "Importo Effettivo": m.amountActual || (m.executedAt ? m.amountPlanned || 0 : ""),
      "Data Eseguito": m.executedAt ? format(new Date(m.executedAt), "dd/MM/yyyy") : "",
      Note: m.executedNote || m.description || "",
      Ricorrente: m.isRecurring ? "Sì" : "No",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Movimenti");

    // Add summary sheet
    const summaryData = [
      ["Riepilogo", ""],
      ["Totale Entrate", stats.incomes],
      ["Totale Uscite", stats.expenses],
      ["Saldo", stats.balance],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Riepilogo");

    const fileName = `movimenti_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getUrgencyBadge = (urgencyInfo: any) => {
    if (!urgencyInfo || urgencyInfo.executed) return null;

    if (urgencyInfo.isOverdue) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          Scaduto
        </span>
      );
    }
    if (urgencyInfo.isDueSoon7) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
          7gg
        </span>
      );
    }
    if (urgencyInfo.isDueSoon14) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          14gg
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Movimenti</h1>
        <p className="text-gray-600">Gestione entrate e uscite</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-800">Entrate</h3>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.incomes)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-sm font-medium text-red-800">Uscite</h3>
          <p className="text-2xl font-bold text-red-900">{formatCurrency(stats.expenses)}</p>
        </div>
        <div
          className={`${stats.balance >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} p-4 rounded-lg border`}
        >
          <h3
            className={`text-sm font-medium ${stats.balance >= 0 ? "text-blue-800" : "text-orange-800"}`}
          >
            Saldo
          </h3>
          <p
            className={`text-2xl font-bold ${stats.balance >= 0 ? "text-blue-900" : "text-orange-900"}`}
          >
            {formatCurrency(stats.balance)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Cerca movimento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti i tipi</option>
            <option value="IN">Solo Entrate</option>
            <option value="OUT">Solo Uscite</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti gli stati</option>
            {movementStatuses?.map((status) => (
              <option key={status._id} value={status._id}>
                {status.nome}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showOnlyDue}
              onChange={(e) => setShowOnlyDue(e.target.checked)}
              className="mr-2"
            />
            Solo in scadenza
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showOnlyOverdue}
              onChange={(e) => setShowOnlyOverdue(e.target.checked)}
              className="mr-2"
            />
            Solo scaduti
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showExecuted}
              onChange={(e) => setShowExecuted(e.target.checked)}
              className="mr-2"
            />
            Mostra eseguiti
          </label>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">{movements?.length || 0} movimenti trovati</div>

          <button
            onClick={exportToExcel}
            disabled={!movements || movements.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            📊 Esporta Excel
          </button>
        </div>
      </div>

      {/* Movements List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Scadenza
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importo Previsto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importo Effettivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements?.map((movement) => (
                <tr
                  key={movement._id}
                  className={`${movement.executedAt ? "opacity-60" : ""} hover:bg-gray-50`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(movement.dueDate), "dd/MM/yyyy", { locale: it })}
                    <div className="flex gap-1 mt-1">
                      {getUrgencyBadge(movement.urgencyInfo)}
                      {movement.isRecurring && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Ricorrente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{movement.title}</div>
                    {movement.description && (
                      <div className="text-xs text-gray-500">{movement.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        movement.type === "IN"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {movement.type === "IN" ? "Entrata" : "Uscita"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.amountPlanned ? formatCurrency(movement.amountPlanned) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.executedAt && movement.amountActual
                      ? formatCurrency(movement.amountActual)
                      : movement.executedAt && movement.amountPlanned
                        ? formatCurrency(movement.amountPlanned)
                        : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {movement.status?.nome || "Sconosciuto"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {!movement.executedAt && (
                      <button
                        onClick={() => {
                          setSelectedMovement(movement);
                          setShowExecutedModal(true);
                          setExecutedForm({
                            executedAt: format(new Date(), "yyyy-MM-dd"),
                            amountActual: movement.amountPlanned?.toString() || "",
                            executedNote: "",
                          });
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        {movement.type === "IN" ? "Incassa" : "Paga"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Sei sicuro di voler eliminare questo movimento?")) {
                          deleteMovement({ id: movement._id });
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!movements || movements.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            Nessun movimento trovato con i filtri selezionati
          </div>
        )}
      </div>

      {/* Mark as Executed Modal */}
      {showExecutedModal && selectedMovement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {selectedMovement.type === "IN" ? "Incassa Entrata" : "Paga Uscita"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data {selectedMovement.type === "IN" ? "incasso" : "pagamento"}
                </label>
                <input
                  type="date"
                  value={executedForm.executedAt}
                  onChange={(e) => setExecutedForm({ ...executedForm, executedAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Importo effettivo
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={executedForm.amountActual}
                  onChange={(e) =>
                    setExecutedForm({ ...executedForm, amountActual: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={executedForm.executedNote}
                  onChange={(e) =>
                    setExecutedForm({ ...executedForm, executedNote: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowExecutedModal(false);
                  setSelectedMovement(null);
                  setExecutedForm({ executedAt: "", amountActual: "", executedNote: "" });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Annulla
              </button>
              <button
                onClick={handleMarkAsExecuted}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimentiPage;

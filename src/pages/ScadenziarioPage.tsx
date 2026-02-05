/**
 * ScadenziarioPage - Payment Scheduler
 * 
 * Main page for managing scheduled payments (USCITE only).
 * Features:
 * - List payments with filters
 * - Highlight due in 7/14 days
 * - Mark as paid
 * - Recurring payments support
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

type Payment = Doc<"payments"> & {
  status: Doc<"paymentStatuses"> | null;
};

export function ScadenziarioPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [payingPayment, setPayingPayment] = useState<Payment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showPaid, setShowPaid] = useState(false);
  const [search, setSearch] = useState("");

  const profile = useQuery(api.profiles.getCurrentProfile);
  const isAdmin = profile?.role === "admin" || profile?.role === "direttivo";

  const payments = useQuery(api.payments.list, {
    search: search || undefined,
    statusId: filterStatus ? (filterStatus as any) : undefined,
    showPaid,
  });
  const statuses = useQuery(api.paymentStatuses.list, { activeOnly: true });
  
  const upsertPayment = useMutation(api.payments.upsert);
  const deletePayment = useMutation(api.payments.remove);
  const markAsPaid = useMutation(api.payments.markAsPaid);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amountPlanned: "",
    dueDate: "",
    statusId: "",
    isRecurring: false,
    recurrenceType: "EVERY_N_MONTHS" as "EVERY_N_MONTHS" | "CUSTOM_DATES",
    everyNMonths: "1",
  });

  const [paidData, setPaidData] = useState({
    amountPaid: "",
    paidNote: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Calculate days until due
  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get urgency badge
  const getUrgencyBadge = (payment: Payment) => {
    if (payment.paidAt) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Pagato
        </span>
      );
    }
    const days = getDaysUntilDue(payment.dueDate);
    if (days < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Scaduto ({Math.abs(days)}g fa)
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Scade tra {days}g
        </span>
      );
    }
    if (days <= 14) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          Scade tra {days}g
        </span>
      );
    }
    return null;
  };

  const openNewForm = () => {
    setEditingPayment(null);
    setFormData({
      title: "",
      description: "",
      amountPlanned: "",
      dueDate: new Date().toISOString().split("T")[0],
      statusId: statuses?.[0]?._id || "",
      isRecurring: false,
      recurrenceType: "EVERY_N_MONTHS",
      everyNMonths: "1",
    });
    setShowForm(true);
  };

  const openEditForm = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      title: payment.title,
      description: payment.description || "",
      amountPlanned: payment.amountPlanned?.toString() || "",
      dueDate: payment.dueDate,
      statusId: payment.statusId as any,
      isRecurring: payment.isRecurring,
      recurrenceType: payment.recurrenceType || "EVERY_N_MONTHS",
      everyNMonths: payment.everyNMonths?.toString() || "1",
    });
    setShowForm(true);
  };

  const openPaidModal = (payment: Payment) => {
    setPayingPayment(payment);
    setPaidData({
      amountPaid: payment.amountPlanned?.toString() || "",
      paidNote: "",
    });
    setShowPaidModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await upsertPayment({
        id: editingPayment?._id,
        title: formData.title,
        description: formData.description || undefined,
        amountPlanned: formData.amountPlanned ? parseFloat(formData.amountPlanned) : undefined,
        dueDate: formData.dueDate,
        statusId: formData.statusId as any,
        isRecurring: formData.isRecurring,
        recurrenceType: formData.isRecurring ? formData.recurrenceType : undefined,
        everyNMonths: formData.isRecurring && formData.recurrenceType === "EVERY_N_MONTHS" 
          ? parseInt(formData.everyNMonths) 
          : undefined,
      });
      setShowForm(false);
    } catch (error: any) {
      alert(error.message || "Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayment) return;
    setIsSaving(true);
    try {
      await markAsPaid({
        id: payingPayment._id,
        amountPaid: paidData.amountPaid ? parseFloat(paidData.amountPaid) : undefined,
        paidNote: paidData.paidNote || undefined,
      });
      setShowPaidModal(false);
    } catch (error: any) {
      alert(error.message || "Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Eliminare questo pagamento?")) return;
    try {
      await deletePayment({ id });
    } catch (error: any) {
      alert(error.message || "Errore durante l'eliminazione");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scadenziario</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestione pagamenti programmati
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link
              to="/scadenziario/stati"
              className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Stati
            </Link>
          )}
          {isAdmin && (
            <button
              onClick={openNewForm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              + Nuovo
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cerca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti gli stati</option>
            {statuses?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.nome}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={showPaid}
              onChange={(e) => setShowPaid(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-slate-700">Mostra pagati</span>
          </label>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {payments === undefined ? (
          <div className="text-center py-8 text-slate-500">Caricamento...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Nessun pagamento trovato
          </div>
        ) : (
          payments.map((payment) => (
            <div
              key={payment._id}
              className={`bg-white rounded-lg p-4 shadow-sm border ${
                payment.paidAt ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{payment.title}</h3>
                    {payment.isRecurring && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        Ricorrente
                      </span>
                    )}
                    {getUrgencyBadge(payment)}
                  </div>
                  {payment.description && (
                    <p className="text-sm text-slate-500 mt-1">{payment.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(payment.dueDate)}
                    </span>
                    {payment.amountPlanned && (
                      <span className="font-medium">
                        €{payment.amountPlanned.toFixed(2)}
                      </span>
                    )}
                    {payment.status && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                        {payment.status.nome}
                      </span>
                    )}
                  </div>
                  {payment.paidAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Pagato il {formatDate(payment.paidAt)}
                      {payment.amountPaid && ` - €${payment.amountPaid.toFixed(2)}`}
                      {payment.paidNote && ` - ${payment.paidNote}`}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    {!payment.paidAt && (
                      <button
                        onClick={() => openPaidModal(payment)}
                        className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                        title="Segna come pagato"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => openEditForm(payment)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                      title="Modifica"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(payment._id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      title="Elimina"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingPayment ? "Modifica pagamento" : "Nuovo pagamento"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="es. Affitto sede, Assicurazione..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Descrizione opzionale..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Importo previsto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amountPlanned}
                    onChange={(e) => setFormData({ ...formData, amountPlanned: e.target.value })}
                    placeholder="€"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Scadenza *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Stato *
                </label>
                <select
                  required
                  value={formData.statusId}
                  onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona stato...</option>
                  {statuses?.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isRecurring" className="text-sm text-slate-700">
                  Pagamento ricorrente
                </label>
              </div>
              {formData.isRecurring && (
                <div className="pl-6 space-y-3 border-l-2 border-purple-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tipo ricorrenza
                    </label>
                    <select
                      value={formData.recurrenceType}
                      onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="EVERY_N_MONTHS">Ogni N mesi</option>
                      <option value="CUSTOM_DATES">Date personalizzate</option>
                    </select>
                  </div>
                  {formData.recurrenceType === "EVERY_N_MONTHS" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Ogni quanti mesi?
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.everyNMonths}
                        onChange={(e) => setFormData({ ...formData, everyNMonths: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showPaidModal && payingPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Segna come pagato</h2>
                <button
                  onClick={() => setShowPaidModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleMarkAsPaid} className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-slate-900">{payingPayment.title}</p>
                <p className="text-sm text-slate-500">
                  Scadenza: {formatDate(payingPayment.dueDate)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Importo pagato
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidData.amountPaid}
                  onChange={(e) => setPaidData({ ...paidData, amountPaid: e.target.value })}
                  placeholder="€"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Note
                </label>
                <textarea
                  value={paidData.paidNote}
                  onChange={(e) => setPaidData({ ...paidData, paidNote: e.target.value })}
                  rows={2}
                  placeholder="Note opzionali..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaidModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? "Salvataggio..." : "Conferma pagamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScadenziarioPage;

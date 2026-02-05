/**
 * Stati Pagamento - Payment Statuses Management
 * 
 * Configuration page for payment statuses (admin/direttivo only).
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

type PaymentStatus = Doc<"paymentStatuses">;

export function StatiPagamentoPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingStatus, setEditingStatus] = useState<PaymentStatus | null>(null);

  const statuses = useQuery(api.paymentStatuses.list, {});
  const upsertStatus = useMutation(api.paymentStatuses.upsert);
  const deleteStatus = useMutation(api.paymentStatuses.remove);

  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    attivo: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const openNewForm = () => {
    setEditingStatus(null);
    setFormData({ nome: "", descrizione: "", attivo: true });
    setShowForm(true);
  };

  const openEditForm = (status: PaymentStatus) => {
    setEditingStatus(status);
    setFormData({
      nome: status.nome,
      descrizione: status.descrizione || "",
      attivo: status.attivo,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await upsertStatus({
        id: editingStatus?._id,
        nome: formData.nome,
        descrizione: formData.descrizione || undefined,
        attivo: formData.attivo,
      });
      setShowForm(false);
    } catch (error: any) {
      alert(error.message || "Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Eliminare questo stato?")) return;
    try {
      await deleteStatus({ id });
    } catch (error: any) {
      alert(error.message || "Errore durante l'eliminazione");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link
            to="/scadenziario"
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Stati Pagamento</h1>
            <p className="text-slate-500 text-sm mt-1">
              Gestisci gli stati dei pagamenti
            </p>
          </div>
        </div>
        <button
          onClick={openNewForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          + Nuovo
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {statuses === undefined ? (
          <div className="text-center py-8 text-slate-500">Caricamento...</div>
        ) : statuses.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Nessuno stato configurato</div>
        ) : (
          statuses.map((status) => (
            <div
              key={status._id}
              className={`bg-white rounded-lg p-4 shadow-sm border ${
                !status.attivo ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{status.nome}</h3>
                    {!status.attivo && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Inattivo
                      </span>
                    )}
                  </div>
                  {status.descrizione && (
                    <p className="text-sm text-slate-500 mt-1">{status.descrizione}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditForm(status)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                    title="Modifica"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(status._id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                    title="Elimina"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingStatus ? "Modifica stato" : "Nuovo stato"}
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
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="es. Da pagare, Pagato, In attesa..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows={2}
                  placeholder="Descrizione opzionale..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attivo"
                  checked={formData.attivo}
                  onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="attivo" className="text-sm text-slate-700">
                  Stato attivo
                </label>
              </div>
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
    </div>
  );
}

export default StatiPagamentoPage;

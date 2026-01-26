import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ConfirmDialog } from "../components/ui";

export function StatusAssociativiPage() {
  const statuses = useQuery(api.memberStatuses.list);
  const createStatus = useMutation(api.memberStatuses.create);
  const updateStatus = useMutation(api.memberStatuses.update);
  const removeStatus = useMutation(api.memberStatuses.remove);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#6B7280");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormColor("#6B7280");
    setFormError("");
  };

  const openEditModal = (status: any) => {
    setFormName(status.name);
    setFormDescription(status.description || "");
    setFormColor(status.color || "#6B7280");
    setEditingStatus(status._id);
  };

  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Il nome è obbligatorio");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await createStatus({
        name: formName.trim(),
        description: formDescription || undefined,
        color: formColor,
      });
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Errore durante la creazione");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatus) return;

    setIsSubmitting(true);
    setFormError("");

    try {
      await updateStatus({
        statusId: editingStatus as any,
        name: formName.trim(),
        description: formDescription || undefined,
        color: formColor,
      });
      setEditingStatus(null);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Errore durante l'aggiornamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (status: any) => {
    try {
      await updateStatus({
        statusId: status._id as any,
        isActive: !status.isActive,
      });
    } catch (err) {
      console.error("Errore toggle status:", err);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    try {
      await removeStatus({ statusId: statusId as any });
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Errore eliminazione status:", err);
      alert(err instanceof Error ? err.message : "Errore durante l'eliminazione");
    }
  };

  if (statuses === undefined) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const presetColors = [
    "#C41E3A", "#009246", "#1E40AF", "#7C3AED", 
    "#0891B2", "#059669", "#D97706", "#DC2626",
    "#6B7280", "#374151",
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Status Associativi</h1>
          <p className="text-gray-600 mt-1">
            Gestisci i ruoli interni all'associazione (Presidente, Consigliere, etc.)
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuovo Status
        </button>
      </div>

      {/* Status list */}
      {statuses.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 mb-4">Nessuno status configurato</p>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="btn-primary"
          >
            Crea il primo status
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {statuses.map((status) => (
            <div
              key={status._id}
              className={`card flex items-center justify-between ${
                !status.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: status.color || "#6B7280" }}
                />
                <div>
                  <h3 className="font-semibold">{status.name}</h3>
                  {status.description && (
                    <p className="text-sm text-gray-500">{status.description}</p>
                  )}
                </div>
                {!status.isActive && (
                  <span className="badge badge-neutral text-xs">Disattivato</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(status)}
                  className={`p-2 rounded-lg transition-colors ${
                    status.isActive
                      ? "text-green-600 hover:bg-green-50"
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                  title={status.isActive ? "Disattiva" : "Attiva"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {status.isActive ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                </button>
                <button
                  onClick={() => openEditModal(status)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifica"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteConfirm(status._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Elimina"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {(showCreateModal || editingStatus) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingStatus ? "Modifica Status" : "Nuovo Status"}
            </h2>

            <form onSubmit={editingStatus ? handleUpdateStatus : handleCreateStatus} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input"
                  placeholder="es. Presidente"
                  required
                />
              </div>

              <div>
                <label className="label">Descrizione (opzionale)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input min-h-[80px]"
                  placeholder="Descrizione del ruolo..."
                />
              </div>

              <div>
                <label className="label">Colore Badge</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border border-gray-200"
                  />
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          formColor === color ? "border-gray-800 scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Anteprima:</span>
                  <span
                    className="px-2 py-1 rounded text-white text-sm font-medium"
                    style={{ backgroundColor: formColor }}
                  >
                    {formName || "Status"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingStatus(null);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Salvataggio..."
                    : editingStatus
                    ? "Salva"
                    : "Crea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Elimina Status"
        message="Sei sicuro di voler eliminare questo status? Assicurati che nessun socio lo stia usando."
        confirmLabel="Elimina"
        onConfirm={() => deleteConfirm && handleDeleteStatus(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

export default StatusAssociativiPage;

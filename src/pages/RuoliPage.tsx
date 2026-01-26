import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ConfirmDialog } from "../components/ui";

export function RuoliPage() {
  const roles = useQuery(api.roles.list);
  const permissions = useQuery(api.roles.getPermissions);
  const createRole = useMutation(api.roles.create);
  const updateRole = useMutation(api.roles.update);
  const removeRole = useMutation(api.roles.remove);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormName("");
    setFormDisplayName("");
    setFormDescription("");
    setFormPermissions([]);
    setFormError("");
  };

  const openEditModal = (role: any) => {
    setFormName(role.name);
    setFormDisplayName(role.displayName);
    setFormDescription(role.description || "");
    setFormPermissions(role.permissions);
    setEditingRole(role._id);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDisplayName) {
      setFormError("Nome e nome visualizzato sono obbligatori");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await createRole({
        name: formName.toLowerCase().replace(/\s+/g, "_"),
        displayName: formDisplayName,
        description: formDescription || undefined,
        permissions: formPermissions,
      });
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Errore durante la creazione");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    setIsSubmitting(true);
    setFormError("");

    try {
      await updateRole({
        roleId: editingRole as any,
        displayName: formDisplayName,
        description: formDescription || undefined,
        permissions: formPermissions,
      });
      setEditingRole(null);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Errore durante l'aggiornamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await removeRole({ roleId: roleId as any });
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Errore eliminazione ruolo:", err);
      alert(err instanceof Error ? err.message : "Errore durante l'eliminazione");
    }
  };

  const togglePermission = (permission: string) => {
    setFormPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  if (roles === undefined || permissions === undefined) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Raggruppa permessi per categoria
  const permissionGroups = permissions.reduce((acc, perm) => {
    const [category] = perm.key.split(":");
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const categoryLabels: Record<string, string> = {
    users: "Utenti",
    roles: "Ruoli",
    members: "Soci",
    memberships: "Tessere",
    events: "Eventi",
    dashboard: "Dashboard",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestione Ruoli</h1>
          <p className="text-gray-600 mt-1">{roles.length} ruoli configurati</p>
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
          Nuovo Ruolo
        </button>
      </div>

      {/* Roles grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div key={role._id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{role.displayName}</h3>
                <p className="text-sm text-gray-500">{role.name}</p>
              </div>
              {role.isSystem && (
                <span className="badge badge-neutral text-xs">Sistema</span>
              )}
            </div>

            {role.description && (
              <p className="text-gray-600 text-sm mb-3">{role.description}</p>
            )}

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Permessi ({role.permissions.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 5).map((perm) => (
                  <span key={perm} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {perm}
                  </span>
                ))}
                {role.permissions.length > 5 && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    +{role.permissions.length - 5}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openEditModal(role)}
                className="btn-secondary flex-1 text-sm"
              >
                Modifica
              </button>
              {!role.isSystem && (
                <button
                  onClick={() => setDeleteConfirm(role._id)}
                  className="btn-danger text-sm px-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit modal */}
      {(showCreateModal || editingRole) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingRole ? "Modifica Ruolo" : "Nuovo Ruolo"}
            </h2>

            <form onSubmit={editingRole ? handleUpdateRole : handleCreateRole} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Nome Tecnico</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="input"
                    placeholder="es. responsabile"
                    disabled={!!editingRole}
                    required={!editingRole}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Usato internamente, non modificabile dopo la creazione
                  </p>
                </div>

                <div>
                  <label className="label">Nome Visualizzato</label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    className="input"
                    placeholder="es. Responsabile"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Descrizione</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input min-h-[80px]"
                  placeholder="Descrizione del ruolo..."
                />
              </div>

              <div>
                <label className="label">Permessi</label>
                <div className="border border-gray-200 rounded-lg p-4 space-y-4 max-h-64 overflow-y-auto">
                  {Object.entries(permissionGroups).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">
                        {categoryLabels[category] || category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((perm) => (
                          <label
                            key={perm.key}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formPermissions.includes(perm.key)}
                              onChange={() => togglePermission(perm.key)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span className="text-sm">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingRole(null);
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
                    : editingRole
                    ? "Salva Modifiche"
                    : "Crea Ruolo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Elimina Ruolo"
        message="Sei sicuro di voler eliminare questo ruolo? Assicurati che nessun utente lo stia usando."
        confirmLabel="Elimina"
        onConfirm={() => deleteConfirm && handleDeleteRole(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

export default RuoliPage;

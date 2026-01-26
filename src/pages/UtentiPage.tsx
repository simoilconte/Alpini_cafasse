import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ConfirmDialog } from "../components/ui";

export function UtentiPage() {
  const users = useQuery(api.users.list);
  const roles = useQuery(api.roles.list);
  const createUser = useMutation(api.users.createUser);
  const updateRole = useMutation(api.users.updateRole);
  const deleteUser = useMutation(api.users.deleteUser);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state per nuovo utente
  const [newEmail, setNewEmail] = useState("");
  const [newRoleId, setNewRoleId] = useState<string>("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newRoleId) {
      setFormError("Compila tutti i campi");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await createUser({
        email: newEmail,
        roleId: newRoleId as any,
      });
      setShowCreateModal(false);
      setNewEmail("");
      setNewRoleId("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Errore durante la creazione");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, roleId: string) => {
    try {
      await updateRole({
        userId: userId as any,
        roleId: roleId as any,
      });
      setEditingUser(null);
    } catch (err) {
      console.error("Errore aggiornamento ruolo:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser({ userId: userId as any });
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Errore eliminazione utente:", err);
    }
  };

  if (users === undefined || roles === undefined) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestione Utenti</h1>
          <p className="text-gray-600 mt-1">{users.length} utenti registrati</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuovo Utente
        </button>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Data Creazione
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2D2D2D] rounded-full flex items-center justify-center text-white font-semibold">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {editingUser === user._id ? (
                      <select
                        value={user.profile?.roleId || ""}
                        onChange={(e) => handleUpdateRole(user._id, e.target.value)}
                        className="input py-1 px-2 w-40"
                        autoFocus
                        onBlur={() => setEditingUser(null)}
                      >
                        <option value="">Seleziona ruolo</option>
                        {roles.map((role) => (
                          <option key={role._id} value={role._id}>
                            {role.displayName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingUser(user._id)}
                        className="badge badge-neutral hover:bg-gray-300 cursor-pointer"
                      >
                        {user.profile?.roleName || "Nessun ruolo"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => setDeleteConfirm(user._id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Elimina utente"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create user modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nuovo Utente</h2>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input"
                  placeholder="email@esempio.it"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'utente dovrà registrarsi con questa email
                </p>
              </div>

              <div>
                <label className="label">Ruolo</label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Seleziona ruolo</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  {isSubmitting ? "Creazione..." : "Crea Utente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Elimina Utente"
        message="Sei sicuro di voler eliminare questo utente? L'operazione non può essere annullata."
        confirmLabel="Elimina"
        onConfirm={() => deleteConfirm && handleDeleteUser(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

export default UtentiPage;

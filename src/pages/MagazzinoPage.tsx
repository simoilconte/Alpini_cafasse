/**
 * Magazzino - Equipment Inventory
 * 
 * Main page for equipment management with filters and CRUD operations.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { EquipmentForm } from "../components/warehouse/EquipmentForm";

export function MagazzinoPage() {
  const [search, setSearch] = useState("");
  const [filterUbicazione, setFilterUbicazione] = useState<Id<"warehouseLocations"> | "">("");
  const [filterStato, setFilterStato] = useState<Id<"equipmentStatuses"> | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"equipment"> | null>(null);

  // Queries
  const profile = useQuery(api.profiles.getCurrentProfile);
  const equipment = useQuery(api.equipment.list, {
    search: search || undefined,
    ubicazioneId: filterUbicazione || undefined,
    statoId: filterStato || undefined,
  });
  const locations = useQuery(api.warehouseLocations.list, { activeOnly: true });
  const statuses = useQuery(api.equipmentStatuses.list, { activeOnly: true });

  // Mutations
  const deleteEquipment = useMutation(api.equipment.remove);

  const canModify = ["admin", "direttivo"].includes(profile?.role || "");

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    codice: "",
    ubicazioneId: "" as Id<"warehouseLocations"> | "",
    statoId: "" as Id<"equipmentStatuses"> | "",
    note: "",
  });

  const openNewForm = () => {
    setEditingId(null);
    setFormData({
      nome: "",
      codice: "",
      ubicazioneId: "",
      statoId: "",
      note: "",
    });
    setShowForm(true);
  };

  const openEditForm = (item: NonNullable<typeof equipment>[0]) => {
    setEditingId(item._id);
    setFormData({
      nome: item.nome,
      codice: item.codice || "",
      ubicazioneId: item.ubicazioneId,
      statoId: item.statoId,
      note: item.note || "",
    });
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id: Id<"equipment">) => {
    if (!confirm("Eliminare questa attrezzatura?")) return;
    try {
      await deleteEquipment({ id });
    } catch (error: any) {
      alert(error.message || "Errore durante l'eliminazione");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Magazzino</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestione attrezzature e inventario
          </p>
        </div>
        <div className="flex gap-2">
          {canModify && (
            <>
              <Link
                to="/magazzino/ubicazioni"
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                Ubicazioni
              </Link>
              <Link
                to="/magazzino/stati"
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                Stati
              </Link>
              <button
                onClick={openNewForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                + Aggiungi
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Cerca per nome o codice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterUbicazione}
            onChange={(e) => setFilterUbicazione(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutte le ubicazioni</option>
            {locations?.map((loc) => (
              <option key={loc._id} value={loc._id}>
                {loc.nome}
              </option>
            ))}
          </select>
          <select
            value={filterStato}
            onChange={(e) => setFilterStato(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti gli stati</option>
            {statuses?.map((status) => (
              <option key={status._id} value={status._id}>
                {status.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Equipment list */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Codice</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ubicazione</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Stato</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Note</th>
                {canModify && (
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Azioni</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {equipment === undefined ? (
                <tr>
                  <td colSpan={canModify ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                    Caricamento...
                  </td>
                </tr>
              ) : equipment.length === 0 ? (
                <tr>
                  <td colSpan={canModify ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                    Nessuna attrezzatura trovata
                  </td>
                </tr>
              ) : (
                equipment.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.nome}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.codice || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.ubicazione?.nome || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.stato?.nome || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">
                      {item.note || "-"}
                    </td>
                    {canModify && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditForm(item)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                            title="Modifica"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="p-1.5 hover:bg-red-50 rounded text-red-600"
                            title="Elimina"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {equipment === undefined ? (
            <div className="p-4 text-center text-slate-500">Caricamento...</div>
          ) : equipment.length === 0 ? (
            <div className="p-4 text-center text-slate-500">Nessuna attrezzatura trovata</div>
          ) : (
            equipment.map((item) => (
              <div key={item._id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-medium text-slate-900">{item.nome}</h3>
                    {item.codice && (
                      <p className="text-sm text-slate-500">Codice: {item.codice}</p>
                    )}
                  </div>
                  {canModify && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditForm(item)}
                        className="p-2 hover:bg-slate-100 rounded text-slate-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 hover:bg-red-50 rounded text-red-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Ubicazione:</span>
                    <span className="ml-1 text-slate-900">{item.ubicazione?.nome || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Stato:</span>
                    <span className="ml-1 text-slate-900">{item.stato?.nome || "-"}</span>
                  </div>
                </div>
                {item.note && (
                  <p className="text-sm text-slate-500 mt-2">{item.note}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingId ? "Modifica attrezzatura" : "Nuova attrezzatura"}
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
            <div className="p-4">
              <EquipmentForm
                equipmentId={editingId || undefined}
                initialData={editingId && formData.ubicazioneId && formData.statoId ? {
                  nome: formData.nome,
                  codice: formData.codice || undefined,
                  ubicazioneId: formData.ubicazioneId,
                  statoId: formData.statoId,
                  note: formData.note || undefined,
                } : undefined}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MagazzinoPage;

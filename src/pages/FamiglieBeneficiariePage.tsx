/**
 * Famiglie Beneficiarie - Lista e CRUD
 * 
 * Manage beneficiary families for food bag distribution.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

type Family = Doc<"beneficiaryFamilies">;

export function FamiglieBeneficiariePage() {
  const [search, setSearch] = useState("");
  const [filterAttiva, setFilterAttiva] = useState<boolean | undefined>(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);

  // Queries
  const families = useQuery(api.beneficiaryFamilies.list, {
    attiva: filterAttiva,
    search: search || undefined,
  });
  const warningCounts = useQuery(api.bagDeliveries.getFamilyWarningCounts);

  // Mutations
  const upsertFamily = useMutation(api.beneficiaryFamilies.upsert);
  const toggleActive = useMutation(api.beneficiaryFamilies.toggleActive);

  // Form state
  const [formData, setFormData] = useState({
    referenteNome: "",
    referenteCognome: "",
    componentiNucleo: 1,
    deliveryLocation: "",
    attiva: true,
    note: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const openNewForm = () => {
    setEditingFamily(null);
    setFormData({
      referenteNome: "",
      referenteCognome: "",
      componentiNucleo: 1,
      deliveryLocation: "",
      attiva: true,
      note: "",
    });
    setShowForm(true);
  };

  const openEditForm = (family: Family) => {
    setEditingFamily(family);
    setFormData({
      referenteNome: family.referenteNome,
      referenteCognome: family.referenteCognome,
      componentiNucleo: family.componentiNucleo,
      deliveryLocation: (family as any).deliveryLocation || "",
      attiva: family.attiva,
      note: family.note || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await upsertFamily({
        id: editingFamily?._id,
        ...formData,
        deliveryLocation: formData.deliveryLocation || undefined,
        note: formData.note || undefined,
      });
      setShowForm(false);
    } catch (error: any) {
      alert(error.message || "Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (family: Family) => {
    try {
      await toggleActive({ id: family._id, attiva: !family.attiva });
    } catch (error: any) {
      alert(error.message || "Errore");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Famiglie Beneficiarie</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestisci le famiglie che ricevono le borse spesa
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          + Nuova
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Cerca famiglia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterAttiva === undefined ? "all" : filterAttiva ? "active" : "inactive"}
          onChange={(e) => {
            const v = e.target.value;
            setFilterAttiva(v === "all" ? undefined : v === "active");
          }}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Solo attive</option>
          <option value="inactive">Solo inattive</option>
          <option value="all">Tutte</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {families === undefined ? (
          <div className="text-center py-8 text-slate-500">Caricamento...</div>
        ) : families.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Nessuna famiglia trovata</div>
        ) : (
          families.map((family) => {
            const warningCount = warningCounts?.[family._id] ?? 0;

            return (
              <div
                key={family._id}
                className={`bg-white rounded-lg p-4 shadow-sm border ${
                  !family.attiva ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/borse-spesa/famiglie/${family._id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 hover:text-blue-600">
                        {family.referenteCognome} {family.referenteNome}
                      </h3>
                      <span className="text-sm text-slate-500">
                        ({family.componentiNucleo} pers.)
                      </span>
                      {!family.attiva && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          Inattiva
                        </span>
                      )}
                      {warningCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          ⚠️ {warningCount} non rese
                        </span>
                      )}
                    </div>
                    {family.note && (
                      <p className="text-sm text-slate-500 mt-1">{family.note}</p>
                    )}
                  </Link>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditForm(family)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                      title="Modifica"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleActive(family)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                      title={family.attiva ? "Disattiva" : "Attiva"}
                    >
                      {family.attiva ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingFamily ? "Modifica famiglia" : "Nuova famiglia"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome referente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.referenteNome}
                    onChange={(e) => setFormData({ ...formData, referenteNome: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cognome referente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.referenteCognome}
                    onChange={(e) => setFormData({ ...formData, referenteCognome: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Componenti nucleo *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.componentiNucleo}
                  onChange={(e) => setFormData({ ...formData, componentiNucleo: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Comune di consegna
                </label>
                <input
                  type="text"
                  value={formData.deliveryLocation}
                  onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                  placeholder="es. Chioggia, Sottomarina..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Note
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={2}
                  placeholder="es. 2 bambini, anziani, preferenze..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attiva"
                  checked={formData.attiva}
                  onChange={(e) => setFormData({ ...formData, attiva: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="attiva" className="text-sm text-slate-700">
                  Famiglia attiva
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

export default FamiglieBeneficiariePage;

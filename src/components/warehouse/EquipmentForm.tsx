/**
 * Equipment Form Component
 * 
 * Form for creating and editing equipment.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface EquipmentFormProps {
  equipmentId?: Id<"equipment">;
  initialData?: {
    nome: string;
    codice?: string;
    ubicazioneId: Id<"warehouseLocations">;
    statoId: Id<"equipmentStatuses">;
    note?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function EquipmentForm({
  equipmentId,
  initialData,
  onSuccess,
  onCancel,
}: EquipmentFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || "",
    codice: initialData?.codice || "",
    ubicazioneId: initialData?.ubicazioneId || ("" as Id<"warehouseLocations"> | ""),
    statoId: initialData?.statoId || ("" as Id<"equipmentStatuses"> | ""),
    note: initialData?.note || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const locations = useQuery(api.warehouseLocations.list, { activeOnly: true });
  const statuses = useQuery(api.equipmentStatuses.list, { activeOnly: true });
  const upsertEquipment = useMutation(api.equipment.upsert);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.ubicazioneId || !formData.statoId) {
      alert("Seleziona ubicazione e stato");
      return;
    }

    setIsSaving(true);
    try {
      await upsertEquipment({
        id: equipmentId,
        nome: formData.nome,
        codice: formData.codice || undefined,
        ubicazioneId: formData.ubicazioneId,
        statoId: formData.statoId,
        note: formData.note || undefined,
      });
      onSuccess();
    } catch (error: any) {
      alert(error.message || "Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nome attrezzatura *
        </label>
        <input
          type="text"
          required
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="es. Radio VHF, Tenda 3x3, Tavolo pieghevole..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Codice / Seriale
        </label>
        <input
          type="text"
          value={formData.codice}
          onChange={(e) => setFormData({ ...formData, codice: e.target.value })}
          placeholder="es. INV-001, SN12345..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Ubicazione *
        </label>
        <select
          required
          value={formData.ubicazioneId}
          onChange={(e) => setFormData({ ...formData, ubicazioneId: e.target.value as any })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Seleziona ubicazione --</option>
          {locations?.map((loc) => (
            <option key={loc._id} value={loc._id}>
              {loc.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Stato *
        </label>
        <select
          required
          value={formData.statoId}
          onChange={(e) => setFormData({ ...formData, statoId: e.target.value as any })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Seleziona stato --</option>
          {statuses?.map((status) => (
            <option key={status._id} value={status._id}>
              {status.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Note
        </label>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          rows={3}
          placeholder="Note aggiuntive..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
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
  );
}

export default EquipmentForm;

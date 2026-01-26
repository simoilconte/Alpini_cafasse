/**
 * Borse Spesa Settings Page
 * 
 * Configure active distribution weekdays (admin/direttivo only).
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const WEEKDAYS = [
  { value: 1, label: "Lunedì" },
  { value: 2, label: "Martedì" },
  { value: 3, label: "Mercoledì" },
  { value: 4, label: "Giovedì" },
  { value: 5, label: "Venerdì" },
  { value: 6, label: "Sabato" },
  { value: 0, label: "Domenica" },
];

export function BorseSpesaSettingsPage() {
  const activeWeekdays = useQuery(api.appSettings.getDistributionSettings);
  const updateWeekdays = useMutation(api.appSettings.updateDistributionWeekdays);

  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync with server data
  useEffect(() => {
    if (activeWeekdays) {
      setSelectedDays(activeWeekdays);
    }
  }, [activeWeekdays]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateWeekdays({ weekdays: selectedDays });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      alert(error.message || "Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(selectedDays.sort()) !== JSON.stringify((activeWeekdays || []).sort());

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to="/borse-spesa"
        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Borse Spesa
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">Impostazioni Distribuzione</h1>
      <p className="text-slate-500 mb-6">
        Seleziona i giorni della settimana in cui è attiva la distribuzione delle borse spesa.
      </p>

      {/* Weekday selection */}
      <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Giorni attivi</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {WEEKDAYS.map((day) => (
            <button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                selectedDays.includes(day.value)
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Salvataggio..." : "Salva modifiche"}
        </button>
        {saved && (
          <span className="text-green-600 font-medium">✓ Salvato</span>
        )}
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium text-slate-900 mb-2">Come funziona</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• Nei giorni attivi, la pagina distribuzione mostrerà "Giorno attivo"</li>
          <li>• Nei giorni non attivi, mostrerà "Giorno non attivo" come promemoria</li>
          <li>• Le consegne possono essere registrate in qualsiasi giorno</li>
        </ul>
      </div>
    </div>
  );
}

export default BorseSpesaSettingsPage;

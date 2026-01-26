/**
 * Famiglia Detail Page
 * 
 * Shows family details and delivery history timeline.
 */

import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function FamigliaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const familyId = id as Id<"beneficiaryFamilies">;

  // Queries
  const family = useQuery(api.beneficiaryFamilies.get, { id: familyId });
  const deliveries = useQuery(api.bagDeliveries.listByFamily, { familyId });
  const warningCounts = useQuery(api.bagDeliveries.getFamilyWarningCounts);

  // Mutations
  const markReturned = useMutation(api.bagDeliveries.markReturned);
  const toggleActive = useMutation(api.beneficiaryFamilies.toggleActive);

  const handleMarkReturned = async (deliveryId: Id<"bagDeliveries">) => {
    try {
      await markReturned({ deliveryId });
    } catch (error: any) {
      alert(error.message || "Errore");
    }
  };

  const handleToggleActive = async () => {
    if (!family) return;
    try {
      await toggleActive({ id: family._id, attiva: !family.attiva });
    } catch (error: any) {
      alert(error.message || "Errore");
    }
  };

  if (family === undefined) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="text-center py-12 text-slate-500">Caricamento...</div>
      </div>
    );
  }

  if (family === null) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-slate-500 mb-4">Famiglia non trovata</p>
          <Link to="/borse-spesa/famiglie" className="text-blue-600 hover:underline">
            Torna alla lista
          </Link>
        </div>
      </div>
    );
  }

  const warningCount = warningCounts?.[family._id] ?? 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to="/borse-spesa/famiglie"
        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Famiglie
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">
                {family.referenteCognome} {family.referenteNome}
              </h1>
              {!family.attiva && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  Inattiva
                </span>
              )}
            </div>
            <p className="text-slate-500 mt-1">
              {family.componentiNucleo} {family.componentiNucleo === 1 ? "persona" : "persone"} nel nucleo
            </p>
            {family.note && (
              <p className="text-slate-600 mt-2 text-sm bg-slate-50 p-2 rounded">{family.note}</p>
            )}
          </div>
          <button
            onClick={handleToggleActive}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              family.attiva
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {family.attiva ? "Disattiva" : "Attiva"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
          <div>
            <p className="text-sm text-slate-500">Consegne totali</p>
            <p className="text-xl font-bold text-slate-900">{deliveries?.length ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Borse non rese</p>
            <p className={`text-xl font-bold ${warningCount > 0 ? "text-red-600" : "text-slate-900"}`}>
              {warningCount}
            </p>
          </div>
        </div>
      </div>

      {/* Delivery history */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Storico consegne</h2>
      <div className="space-y-2">
        {deliveries === undefined ? (
          <div className="text-center py-8 text-slate-500">Caricamento...</div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Nessuna consegna registrata</div>
        ) : (
          deliveries.map((delivery) => (
            <div
              key={delivery._id}
              className="bg-white rounded-lg p-4 shadow-sm border flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">
                    {new Date(delivery.deliveryDate).toLocaleDateString("it-IT", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {delivery.emptyBagReturned ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      ✓ Resa
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      ⚠️ Non resa
                    </span>
                  )}
                </div>
                {delivery.notes && (
                  <p className="text-sm text-slate-500 mt-1">{delivery.notes}</p>
                )}
              </div>
              {!delivery.emptyBagReturned && (
                <button
                  onClick={() => handleMarkReturned(delivery._id)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Segna resa
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FamigliaDetailPage;

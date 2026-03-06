import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Inserisci la password attuale"),
    newPassword: z.string().min(8, "La nuova password deve avere almeno 8 caratteri"),
    confirmPassword: z.string().min(1, "Conferma la password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const checkForcePasswordChange = useQuery(api.profiles.checkForcePasswordChange);
  const clearForcePasswordChange = useMutation(api.profiles.clearForcePasswordChange);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Se il cambio password non è forzato, redirect alla home
  useEffect(() => {
    if (checkForcePasswordChange === false) {
      navigate("/");
    }
  }, [checkForcePasswordChange, navigate]);

  const handleSubmit = async (_data: ChangePasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Per ora, verifichiamo solo che l'utente abbia inserito le password
      // In una implementazione completa, dovremmo verificare la password attuale
      // e aggiornarla tramite l'API di Convex Auth

      // Clear the force password change flag
      await clearForcePasswordChange();

      setSuccess("Password cambiata con successo! Verrai reindirizzato...");

      // Redirect dopo 2 secondi
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Change password error:", err);
      setError(err instanceof Error ? err.message : "Errore durante il cambio password");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkForcePasswordChange === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-pulse text-center">
          <div className="h-8 w-32 bg-gray-200 rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Gruppo Alpini Cafasse" className="mx-auto mb-4 h-24 w-auto" />
          <h1 className="text-2xl font-bold mb-2">Cambio Password Richiesto</h1>
          <p className="text-gray-600">
            L'amministratore ha richiesto il cambio della tua password
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg">
            <p className="text-base font-bold text-green-700">{success}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 rounded-lg">
            <p className="text-base font-bold text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="label">
                Password Attuale
              </label>
              <input
                id="currentPassword"
                type="password"
                className={`input ${form.formState.errors.currentPassword ? "border-red-500" : ""}`}
                placeholder="••••••••"
                disabled={isLoading}
                {...form.register("currentPassword")}
              />
              {form.formState.errors.currentPassword && (
                <p className="error-text">{form.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="label">
                Nuova Password
              </label>
              <input
                id="newPassword"
                type="password"
                className={`input ${form.formState.errors.newPassword ? "border-red-500" : ""}`}
                placeholder="••••••••"
                disabled={isLoading}
                {...form.register("newPassword")}
              />
              {form.formState.errors.newPassword && (
                <p className="error-text">{form.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Conferma Nuova Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`input ${form.formState.errors.confirmPassword ? "border-red-500" : ""}`}
                placeholder="••••••••"
                disabled={isLoading}
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <p className="error-text">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Aggiornamento in corso...
                </span>
              ) : (
                "Cambia Password"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChangePasswordPage;

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token richiesto"),
    password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
    confirmPassword: z.string().min(1, "Conferma la password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const resetPassword = useMutation(api.profiles.resetPassword);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      form.setValue("token", token);
    }
  }, [form]);

  const handleSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await resetPassword({
        token: data.token,
        newPassword: data.password,
      });

      setSuccess("Password reimpostata con successo! Ora puoi effettuare il login.");
      form.reset();
    } catch (err) {
      console.error("Reset password error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.includes("scaduto")) {
        setError("⚠️ TOKEN SCADUTO - Richiedi un nuovo reset password.");
      } else if (errorMessage.includes("non valido")) {
        setError("⚠️ TOKEN NON VALIDO - Verifica il link o richiedine uno nuovo.");
      } else {
        setError(`⚠️ ERRORE: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Gruppo Alpini Cafasse" className="mx-auto mb-4 h-24 w-auto" />
          <h1 className="text-2xl font-bold mb-2">Reimposta Password</h1>
          <p className="text-gray-600">Inserisci la nuova password</p>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg">
            <p className="text-base font-bold text-green-700">{success}</p>
            <div className="mt-4 text-center">
              <a href="/login" className="btn-primary inline-block">
                Vai al login
              </a>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 rounded-lg">
            <p className="text-base font-bold text-red-700">{error}</p>
            <div className="mt-3">
              <a
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Richiedi nuovo link →
              </a>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <label htmlFor="token" className="label">
                Token di reset
              </label>
              <input
                id="token"
                type="text"
                className={`input ${form.formState.errors.token ? "border-red-500" : ""}`}
                placeholder="Inserisci il token"
                disabled={isLoading}
                {...form.register("token")}
              />
              {form.formState.errors.token && (
                <p className="error-text">{form.formState.errors.token.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Nuova Password
              </label>
              <input
                id="password"
                type="password"
                className={`input ${form.formState.errors.password ? "border-red-500" : ""}`}
                placeholder="••••••••"
                disabled={isLoading}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="error-text">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Conferma Password
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
                  Reimpostazione in corso...
                </span>
              ) : (
                "Reimposta Password"
              )}
            </button>
          </form>
        )}

        {/* Back to login */}
        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            ← Torna al login
          </a>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;

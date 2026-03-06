import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Inserisci un'email valida"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const requestPasswordReset = useMutation(api.profiles.requestPasswordReset);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setResetToken(null);

    try {
      const result = await requestPasswordReset({ email: data.email });

      setSuccess(result.message);

      // In development, show the token
      if (result.token) {
        setResetToken(result.token);
      }

      form.reset();
    } catch (err) {
      console.error("Password reset request error:", err);
      setError(err instanceof Error ? err.message : "Errore durante la richiesta");
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
          <h1 className="text-2xl font-bold mb-2">Recupera Password</h1>
          <p className="text-gray-600">Inserisci la tua email per ricevere le istruzioni</p>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg">
            <p className="text-base font-bold text-green-700">{success}</p>
            {resetToken && (
              <div className="mt-3 p-3 bg-yellow-100 border border-yellow-400 rounded">
                <p className="text-sm font-bold text-yellow-800 mb-2">⚠️ TOKEN DI SVILUPPO:</p>
                <code className="text-xs break-all block">{resetToken}</code>
                <p className="text-xs text-yellow-700 mt-2">
                  In produzione, questo token verrebbe inviato via email.
                </p>
                <a
                  href={`/reset-password?token=${resetToken}`}
                  className="mt-3 inline-block text-blue-600 hover:text-blue-700 underline text-sm"
                >
                  Clicca qui per reimpostare la password →
                </a>
              </div>
            )}
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
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={`input ${form.formState.errors.email ? "border-red-500" : ""}`}
                placeholder="email@esempio.it"
                disabled={isLoading}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="error-text">{form.formState.errors.email.message}</p>
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
                  Invio in corso...
                </span>
              ) : (
                "Invia istruzioni"
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

export default ForgotPasswordPage;

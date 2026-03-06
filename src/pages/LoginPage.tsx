import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  loginSchema,
  registerSchema,
  type LoginFormData,
  type RegisterFormData,
} from "../lib/validations";

type AuthMode = "login" | "register";

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuthActions();
  const createProfile = useMutation(api.profiles.createProfile);

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    console.log("=== handleLogin chiamato ===");
    console.log("Email:", data.email);
    console.log("Password length:", data.password.length);

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("flow", "signIn");

      console.log("Chiamando signIn...");
      await signIn("password", formData);
      console.log("signIn completato con successo!");
      // Forza redirect alla home dopo login riuscito
      window.location.href = "/";
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Gestione errori specifici di Convex Auth
      if (errorMessage.includes("InvalidSecret")) {
        setError("⚠️ PASSWORD ERRATA - La password inserita non è corretta. Riprova.");
      } else if (errorMessage.includes("InvalidAccountId")) {
        setError(
          "⚠️ ACCOUNT NON TROVATO - Nessun account con questa email. Devi prima registrarti."
        );
      } else if (errorMessage.includes("Invalid") || errorMessage.includes("invalid")) {
        setError("⚠️ CREDENZIALI NON VALIDE - Email o password non corretti.");
      } else if (errorMessage.includes("not found") || errorMessage.includes("NotFound")) {
        setError(
          "⚠️ ACCOUNT NON TROVATO - Nessun account trovato con questa email. Registrati prima."
        );
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        setError("⚠️ ERRORE DI RETE - Verifica la tua connessione internet.");
      } else {
        setError(`⚠️ ERRORE: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("flow", "signUp");

      await signIn("password", formData);

      // Create user profile after successful registration
      // Piccolo delay per assicurarsi che l'auth sia completata
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        await createProfile();
      } catch (profileErr) {
        // Il profilo potrebbe già esistere o essere creato automaticamente
        console.log("Profile creation skipped:", profileErr);
      }

      // On success, the Authenticated component in App.tsx will handle the redirect
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.includes("already exists")) {
        setError(
          "⚠️ ACCOUNT ESISTENTE - Un account con questa email esiste già. Clicca 'Accedi' in basso."
        );
      } else if (errorMessage.includes("password") || errorMessage.includes("Password")) {
        setError("⚠️ PASSWORD DEBOLE - La password deve avere almeno 8 caratteri.");
      } else if (errorMessage.includes("email") || errorMessage.includes("Email")) {
        setError("⚠️ EMAIL NON VALIDA - L'indirizzo email non è valido.");
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        setError("⚠️ ERRORE DI RETE - Verifica la tua connessione internet.");
      } else {
        setError(`⚠️ ERRORE REGISTRAZIONE: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Gruppo Alpini Cafasse" className="mx-auto mb-4 h-24 w-auto" />
          <h1 className="text-2xl font-bold mb-2">GRUPPO ALPINI CAFASSE</h1>
          <p className="text-gray-600">
            {mode === "login" ? "Accedi al tuo account" : "Crea un nuovo account"}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 rounded-lg">
            <p className="text-base font-bold text-red-700">{error}</p>
          </div>
        )}

        {/* Login Form */}
        {mode === "login" && (
          <form
            onSubmit={loginForm.handleSubmit(handleLogin, (errors) => {
              console.log("Form validation errors:", errors);
              if (errors.email) setError(`⚠️ EMAIL: ${errors.email.message}`);
              else if (errors.password) setError(`⚠️ PASSWORD: ${errors.password.message}`);
            })}
            className="space-y-4"
          >
            <div>
              <label htmlFor="login-email" className="label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                className={`input ${loginForm.formState.errors.email ? "border-red-500" : ""}`}
                placeholder="email@esempio.it"
                disabled={isLoading}
                {...loginForm.register("email")}
              />
              {loginForm.formState.errors.email && (
                <p className="error-text">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className={`input ${loginForm.formState.errors.password ? "border-red-500" : ""}`}
                placeholder="••••••••"
                disabled={isLoading}
                {...loginForm.register("password")}
              />
              {loginForm.formState.errors.password && (
                <p className="error-text">{loginForm.formState.errors.password.message}</p>
              )}
              <div className="mt-2 text-right">
                <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                  Password dimenticata?
                </a>
              </div>
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
                  Accesso in corso...
                </span>
              ) : (
                "Accedi"
              )}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === "register" && (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            <div>
              <label htmlFor="register-email" className="label">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                className={`input ${registerForm.formState.errors.email ? "border-red-500" : ""}`}
                placeholder="email@esempio.it"
                disabled={isLoading}
                {...registerForm.register("email")}
              />
              {registerForm.formState.errors.email && (
                <p className="error-text">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="register-password" className="label">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                className={`input ${registerForm.formState.errors.password ? "border-red-500" : ""}`}
                placeholder="••••••••"
                disabled={isLoading}
                {...registerForm.register("password")}
              />
              {registerForm.formState.errors.password && (
                <p className="error-text">{registerForm.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="label">
                Conferma Password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                className={`input ${registerForm.formState.errors.confirmPassword ? "border-red-500" : ""}`}
                placeholder="••••••••"
                disabled={isLoading}
                {...registerForm.register("confirmPassword")}
              />
              {registerForm.formState.errors.confirmPassword && (
                <p className="error-text">
                  {registerForm.formState.errors.confirmPassword.message}
                </p>
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
                  Registrazione in corso...
                </span>
              ) : (
                "Registrati"
              )}
            </button>
          </form>
        )}

        {/* Mode switch */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            {mode === "login" ? (
              <>
                Non hai un account?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  Registrati
                </button>
              </>
            ) : (
              <>
                Hai già un account?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  Accedi
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

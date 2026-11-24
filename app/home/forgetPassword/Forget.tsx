"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Vote,
} from "lucide-react";

import { supabase } from "@/lib/supabase-client";
import useApp from "@/lib/useApp";

export default function ForgetPassword() {
  const router = useRouter();
  const { mode, setMode } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    const checkRecoverySession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (active) setMode(session ? "update" : "request");
      } finally {
        if (active) setCheckingSession(false);
      }
    };

    void checkRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  const submitResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Enter your email address to continue.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/forgetPassword`,
        }
      );

      if (resetError) throw resetError;

      setSuccess(
        "A password reset link has been sent. Open it from your email to choose a new password."
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to send the reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Your new password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setSuccess("Password updated successfully.");

      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 900);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update your password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <LoaderCircle
          className="h-7 w-7 animate-spin text-blue-400"
          aria-label="Checking password reset session"
        />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-3 py-8 text-white">
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-blue-400/15 bg-[#101621] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-8">
        <div className="relative">
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="inline-flex items-center gap-2 text-xs font-medium text-white/45 transition hover:text-blue-300"
          >
            <ArrowLeft size={15} />
            Back to login
          </button>

          <div className="mt-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/[0.08] text-blue-300">
            {mode === "update" ? (
              <KeyRound size={25} />
            ) : (
              <Vote size={25} />
            )}
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            {mode === "update" ? "Choose a new password" : "Forgot your password?"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/50">
            {mode === "update"
              ? "Enter and confirm your new password."
              : "Enter your account email and we will send you a secure reset link."}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3 py-3 text-xs leading-5 text-red-300"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-5 flex items-start gap-2 rounded-xl border border-blue-400/15 bg-blue-400/[0.06] px-3 py-3 text-xs leading-5 text-blue-300"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              {success}
            </div>
          )}

          {mode === "request" ? (
            <form onSubmit={submitResetRequest} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-2 block text-xs font-semibold text-white/65"
                >
                  Email address
                </label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.09] bg-black/20 px-4 transition focus-within:border-blue-400/45 focus-within:ring-2 focus-within:ring-blue-400/10">
                  <Mail size={16} className="text-blue-400" />
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-400 text-sm font-bold text-[#07101c] transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={submitNewPassword} className="mt-6 space-y-4">
              {[
                {
                  id: "new-password",
                  label: "New password",
                  value: password,
                  setValue: setPassword,
                },
                {
                  id: "confirm-password",
                  label: "Confirm new password",
                  value: confirmPassword,
                  setValue: setConfirmPassword,
                },
              ].map((field) => (
                <div key={field.id}>
                  <label
                    htmlFor={field.id}
                    className="mb-2 block text-xs font-semibold text-white/65"
                  >
                    {field.label}
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.09] bg-black/20 px-4 transition focus-within:border-blue-400/45 focus-within:ring-2 focus-within:ring-blue-400/10">
                    <ShieldCheck size={16} className="text-blue-400" />
                    <input
                      id={field.id}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={field.value}
                      onChange={(event) => field.setValue(event.target.value)}
                      placeholder="Minimum 6 characters"
                      disabled={loading}
                      className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                      className="text-white/35 transition hover:text-blue-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-400 text-sm font-bold text-[#07101c] transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" />
                    Updating password...
                  </>
                ) : (
                  <>
                    Update password
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

    </main>
  );
}

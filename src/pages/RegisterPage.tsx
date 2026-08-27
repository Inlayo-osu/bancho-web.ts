import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { CaptchaWidget } from "@/components/CaptchaWidget";
import { ApiError } from "@/lib/api/http";
import { useAuth } from "@/lib/auth";
import { env } from "@/lib/env";
import { usePageTitle } from "@/lib/usePageTitle";

export function RegisterPage() {
  usePageTitle("Register");

  const { player, register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const captchaRequired = env.captchaProvider !== null && !!env.captchaSiteKey;

  if (player) {
    return <Navigate to={`/u/${player.id}`} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (captchaRequired && captchaToken === null) {
      setError("Please complete the captcha.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ username, email, password, captchaToken });
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm " +
    "focus:border-accent focus:outline-none";

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-center text-xl font-semibold tracking-tight">Create an account</h1>
      <p className="mt-1 text-center text-sm text-muted">
        One account for the website and the game client.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-5"
      >
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">
            Username
          </span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={15}
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-muted">
            2-15 characters; this is your in-game name.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            maxLength={32}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">
            Confirm password
          </span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
          />
        </label>

        <CaptchaWidget onToken={setCaptchaToken} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-accent px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

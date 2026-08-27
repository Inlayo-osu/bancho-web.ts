import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { CaptchaWidget } from "@/components/CaptchaWidget";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import { useAuth } from "@/lib/auth";
import { env } from "@/lib/env";
import { usePageTitle } from "@/lib/usePageTitle";

export function RegisterPage() {
  usePageTitle("Register");

  const { player, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailToken, setEmailToken] = useState(
    () => searchParams.get("token") ?? "",
  );
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const captchaRequired = env.captchaProvider !== null && !!env.captchaSiteKey;
  const emailVerified = emailVerificationToken !== "";

  async function sendVerificationEmail() {
    setMessage(null);
    setError(null);
    setIsSendingEmail(true);
    try {
      await api.requestEmailVerification(email);
      setMessage("Verification email sent.");
    } catch (sendError) {
      setError(
        sendError instanceof ApiError
          ? sendError.message
          : "Could not send the verification email.",
      );
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function verifyEmail() {
    setMessage(null);
    setError(null);
    setIsVerifyingEmail(true);
    try {
      const result = await api.confirmEmailVerification(emailToken);
      setEmailVerificationToken(result.data.verification_token);
      setMessage("Email verified.");
    } catch (verifyError) {
      setError(
        verifyError instanceof ApiError
          ? verifyError.message
          : "That verification token is invalid or expired.",
      );
    } finally {
      setIsVerifyingEmail(false);
    }
  }

  if (player) {
    return <Navigate to={`/u/${player.id}`} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
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
      if (!emailVerified) {
        setError("Verify your email before creating an account.");
        return;
      }
      await register({
        username,
        email,
        password,
        captchaToken,
        emailVerificationToken,
      });
      navigate("/#how-to-connect");
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
      <p className="mx-auto mt-3 max-w-sm text-center text-sm text-accent">
        You&apos;ll need to verify your email before you can sign in.
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
        {message && (
          <p className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-sm text-blue-300">
            {message}
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
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailToken("");
                setEmailVerificationToken("");
              }}
            className={inputClass}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={!email || isSendingEmail || emailVerified}
              onClick={sendVerificationEmail}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSendingEmail
                ? "Sending..."
                : emailVerified
                  ? "Verified"
                  : "Send verification email"}
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Email verification token"
              value={emailToken}
              onChange={(event) => {
                setEmailToken(event.target.value);
                setEmailVerificationToken("");
              }}
              disabled={emailVerified}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              disabled={!emailToken || isVerifyingEmail || emailVerified}
              onClick={verifyEmail}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifyingEmail
                ? "Checking..."
                : emailVerified
                  ? "Verified"
                  : "Verify"}
            </button>
          </div>
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
          disabled={isSubmitting || !emailVerified}
          className="w-full rounded-xl bg-accent px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Creating account..."
            : "Create account"}
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

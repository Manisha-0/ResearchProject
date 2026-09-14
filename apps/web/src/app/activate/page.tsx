"use client";

import { Suspense, useEffect, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import Link from "next/link";

import { useSearchParams } from "next/navigation";

import {
  activateAccount,
  activateCaregiverAccount,
  activatePatientAccount,
  validateCaregiverInvitation,
  validateInvitation,
  validatePatientInvitation,
} from "@/lib/auth-api";

import type { ActivationType } from "@/types/auth";

type ValidationState =
  | "loading"
  | "needs_patient_verification"
  | "valid"
  | "invalid"
  | "activated";

type InvitationDetails = {
  email: string;

  firstName: string | null;
};

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <ActivationPageShell>
          <LoadingState message="Loading invitation..." />
        </ActivationPageShell>
      }
    >
      <ActivationContent />
    </Suspense>
  );
}

function ActivationContent() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";

  const rawType = searchParams.get("type");

  const activationType: ActivationType | null = isActivationType(rawType)
    ? rawType
    : null;

  const [validationState, setValidationState] =
    useState<ValidationState>("loading");

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);

  const [dateOfBirth, setDateOfBirth] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState(
    "Your Compass account is ready.",
  );

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      setError(null);

      if (!token || !activationType) {
        if (!cancelled) {
          setValidationState("invalid");

          setError("This activation link is incomplete or invalid.");
        }

        return;
      }

      if (activationType === "patient") {
        if (!cancelled) {
          setValidationState("needs_patient_verification");
        }

        return;
      }

      try {
        if (activationType === "navigator") {
          const result = await validateInvitation({
            token,
          });

          if (cancelled) {
            return;
          }

          setInvitation({
            email: result.email,

            firstName: null,
          });
        }

        if (activationType === "caregiver") {
          const result = await validateCaregiverInvitation({
            token,
          });

          if (cancelled) {
            return;
          }

          setInvitation({
            email: result.email,

            firstName: result.first_name,
          });
        }

        if (!cancelled) {
          setValidationState("valid");
        }
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        setValidationState("invalid");

        setError(
          getErrorMessage(
            caughtError,
            "This invitation is invalid or has expired.",
          ),
        );
      }
    }

    void validate();

    return () => {
      cancelled = true;
    };
  }, [activationType, token]);

  const handlePatientVerification: React.SubmitEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();

    if (!dateOfBirth) {
      setError("Enter your date of birth to continue.");

      return;
    }

    setIsSubmitting(true);

    setError(null);

    try {
      const result = await validatePatientInvitation({
        token,

        date_of_birth: dateOfBirth,
      });

      setInvitation({
        email: result.email,

        firstName: result.first_name,
      });

      setValidationState("valid");
    } catch (caughtError) {
      setError(
        getErrorMessage(
          caughtError,
          "Unable to verify the patient information.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivation: React.SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    setError(null);

    if (!password) {
      setError("Enter a password.");

      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");

      return;
    }

    if (!activationType) {
      setError("This activation link is invalid.");

      return;
    }

    setIsSubmitting(true);

    try {
      let message: string;

      if (activationType === "navigator") {
        const result = await activateAccount({
          token,

          password,
        });

        message = result.message;
      } else if (activationType === "patient") {
        const result = await activatePatientAccount({
          token,

          date_of_birth: dateOfBirth,

          password,
        });

        message = result.message;
      } else {
        const result = await activateCaregiverAccount({
          token,

          password,
        });

        message = result.message;
      }

      setSuccessMessage(message);

      setValidationState("activated");

      setPassword("");
      setConfirmPassword("");
    } catch (caughtError) {
      setError(
        getErrorMessage(caughtError, "Unable to activate your account."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ActivationPageShell>
      {validationState === "loading" && (
        <LoadingState message="Validating your invitation..." />
      )}

      {validationState === "invalid" && (
        <InvalidState message={error ?? "This invitation cannot be used."} />
      )}

      {validationState === "needs_patient_verification" && (
        <PatientVerificationForm
          dateOfBirth={dateOfBirth}
          setDateOfBirth={setDateOfBirth}
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handlePatientVerification}
        />
      )}

      {validationState === "valid" && invitation && (
        <PasswordForm
          invitation={invitation}
          activationType={activationType}
          password={password}
          confirmPassword={confirmPassword}
          showPassword={showPassword}
          setPassword={setPassword}
          setConfirmPassword={setConfirmPassword}
          setShowPassword={setShowPassword}
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleActivation}
        />
      )}

      {validationState === "activated" && (
        <SuccessState message={successMessage} />
      )}
    </ActivationPageShell>
  );
}

function ActivationPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-surface-soft px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-lg font-bold text-white">
            C
          </div>

          <div>
            <p className="font-semibold text-navy">Compass</p>

            <p className="text-xs text-ink-soft">Cancer care navigation</p>
          </div>
        </Link>

        <div className="mt-8 rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-ink-soft">
          Compass is a care navigation prototype using synthetic demonstration
          data.
        </p>
      </div>
    </main>
  );
}

function PatientVerificationForm({
  dateOfBirth,
  setDateOfBirth,
  isSubmitting,
  error,
  onSubmit,
}: {
  dateOfBirth: string;

  setDateOfBirth: (value: string) => void;

  isSubmitting: boolean;

  error: string | null;

  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-tint text-navy">
        <ShieldCheck className="h-6 w-6" />
      </div>

      <p className="mt-6 text-sm font-semibold text-gold">
        PATIENT VERIFICATION
      </p>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy-deep">
        Verify your information
      </h1>

      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Before creating your Compass password, confirm your date of birth.
      </p>

      <form onSubmit={onSubmit} className="mt-6">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Date of birth</span>

          <input
            type="date"
            required
            value={dateOfBirth}
            disabled={isSubmitting}
            onChange={(event) => setDateOfBirth(event.target.value)}
            className={inputClasses}
          />
        </label>

        {error && <InlineError message={error} />}

        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClasses}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Verify and continue
            </>
          )}
        </button>
      </form>
    </>
  );
}

function PasswordForm({
  invitation,
  activationType,
  password,
  confirmPassword,
  showPassword,
  setPassword,
  setConfirmPassword,
  setShowPassword,
  isSubmitting,
  error,
  onSubmit,
}: {
  invitation: InvitationDetails;

  activationType: ActivationType | null;

  password: string;

  confirmPassword: string;

  showPassword: boolean;

  setPassword: (value: string) => void;

  setConfirmPassword: (value: string) => void;

  setShowPassword: (value: boolean) => void;

  isSubmitting: boolean;

  error: string | null;

  onSubmit: React.SubmitEventHandler<HTMLFormElement>;
}) {
  return (
    <>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-tint text-navy">
        <KeyRound className="h-6 w-6" />
      </div>

      <p className="mt-6 text-sm font-semibold text-gold">ACCOUNT ACTIVATION</p>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy-deep">
        {invitation.firstName
          ? `Welcome, ${invitation.firstName}`
          : "Create your password"}
      </h1>

      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Set a password to finish activating your{" "}
        {formatActivationType(activationType)} Compass account.
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-soft p-4">
        <Mail className="h-4 w-4 shrink-0 text-navy" />

        <p className="min-w-0 truncate text-sm font-medium text-ink">
          {invitation.email}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-semibold text-ink">New password</span>

          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              disabled={isSubmitting}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClasses} pr-11`}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-soft transition hover:text-navy"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink">
            Confirm password
          </span>

          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirmPassword}
            disabled={isSubmitting}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClasses}
          />
        </label>

        <div className="flex items-start gap-2 rounded-xl bg-navy-tint p-3">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-navy" />

          <p className="text-xs leading-5 text-ink-soft">
            Your password will be checked against Compass password security
            requirements.
          </p>
        </div>

        {error && <InlineError message={error} />}

        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClasses}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Activating...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Activate account
            </>
          )}
        </button>
      </form>
    </>
  );
}

function SuccessState({ message }: { message: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-priority-low-tint text-priority-low">
        <CheckCircle2 className="h-7 w-7" />
      </div>

      <p className="mt-6 text-sm font-semibold text-gold">ACCOUNT ACTIVE</p>

      <h1 className="mt-2 font-display text-2xl font-bold text-navy-deep">
        You&apos;re ready to use Compass
      </h1>

      <p className="mt-3 text-sm leading-6 text-ink-soft">{message}</p>

      <Link href="/login" className={`${primaryButtonClasses} mt-7`}>
        Continue to sign in
      </Link>
    </div>
  );
}

function InvalidState({ message }: { message: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-priority-high-tint text-priority-high">
        <AlertCircle className="h-7 w-7" />
      </div>

      <p className="mt-6 text-sm font-semibold text-gold">
        INVITATION UNAVAILABLE
      </p>

      <h1 className="mt-2 font-display text-2xl font-bold text-navy-deep">
        This link cannot be used
      </h1>

      <p className="mt-3 text-sm leading-6 text-ink-soft">{message}</p>

      <p className="mt-4 text-xs leading-5 text-ink-soft">
        The invitation may have expired, already been used, or been replaced by
        a newer invitation.
      </p>

      <Link
        href="/login"
        className="mt-7 inline-flex rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:border-navy/30"
      >
        Return to sign in
      </Link>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center">
      <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-navy" />

      <p className="mt-4 text-sm text-ink-soft">{message}</p>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-priority-high-tint p-4">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-priority-high" />

      <p className="text-sm leading-6 text-priority-high">{message}</p>
    </div>
  );
}

function isActivationType(value: string | null): value is ActivationType {
  return value === "navigator" || value === "patient" || value === "caregiver";
}

function formatActivationType(value: ActivationType | null) {
  if (value === "navigator") {
    return "navigator";
  }

  if (value === "patient") {
    return "patient";
  }

  if (value === "caregiver") {
    return "caregiver";
  }

  return "";
}

function getErrorMessage(caughtError: unknown, fallback: string) {
  return caughtError instanceof Error ? caughtError.message : fallback;
}

const inputClasses =
  "mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-70";

const primaryButtonClasses =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60";

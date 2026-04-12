import { TwoFactorChallengeForm } from "@/components/auth/TwoFactorChallengeForm";

export default function LoginTwoFactorPage() {
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Two-factor authentication</h1>
      <p className="text-sm text-muted">
        Enter the 6-digit code from your authenticator app.
      </p>
      <TwoFactorChallengeForm />
    </div>
  );
}

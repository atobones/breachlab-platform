import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { startEnable2faAction } from "./actions";
import { TwoFactorEnableForm } from "@/components/auth/TwoFactorEnableForm";

export default async function TwoFactorPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");

  if (user.totpEnabled) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-amber text-xl">Two-factor authentication</h1>
        <p className="text-green text-sm">2FA is currently enabled.</p>
        <p className="text-muted text-xs">
          To disable, contact admin (disable flow lands in a follow-up).
        </p>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-amber text-xl">Two-factor authentication</h1>
        <p className="text-red text-sm">
          Verify your email before enabling 2FA.
        </p>
      </div>
    );
  }

  const setup = await startEnable2faAction();
  if (!setup.secret || !setup.qrDataUrl) {
    return (
      <p className="text-red text-sm">
        {setup.error ?? "Failed to start 2FA setup"}
      </p>
    );
  }
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Enable two-factor authentication</h1>
      <p className="text-sm text-muted">
        Scan the QR with Google Authenticator, 1Password, Authy, or any TOTP
        app, then enter the 6-digit code below.
      </p>
      <TwoFactorEnableForm secret={setup.secret} qrDataUrl={setup.qrDataUrl} />
    </div>
  );
}

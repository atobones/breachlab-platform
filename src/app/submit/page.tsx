import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { SubmitForm } from "@/components/submit/SubmitForm";
import { EmailVerificationBanner } from "@/components/dashboard/EmailVerificationBanner";

export default async function SubmitPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Submit flag</h1>
      <p className="text-sm text-muted">
        Paste the secret you recovered from the level.
      </p>
      <div className="border border-amber/20 p-3 text-xs space-y-2">
        <p className="text-muted">
          On BreachLab the flag is <span className="text-amber">the same
          string</span> you use to <code>ssh</code> into the next level. Solve
          the level, recover the chain password, paste it here for points.
        </p>
        <p className="text-muted">
          Case-sensitive. Trim any surrounding whitespace.
        </p>
      </div>
      {user.emailVerified ? (
        <SubmitForm />
      ) : (
        <div className="space-y-3">
          <EmailVerificationBanner />
          <p className="text-xs text-muted">
            Submissions are locked until you confirm the email on your
            account. This stops throwaway-email spam regs from polluting
            the leaderboard. Existing submissions stay recorded.
          </p>
        </div>
      )}
    </div>
  );
}

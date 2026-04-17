import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { SubmitForm } from "@/components/submit/SubmitForm";

export default async function SubmitPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Submit flag</h1>
      <p className="text-sm text-muted">
        Paste a flag you found in any BreachLab level below.
      </p>
      <div className="border border-amber/20 p-3 text-xs space-y-2">
        <p className="text-amber">
          Flags look like <code>FLAG{`{ghost_l3_7a9f...}`}</code>
        </p>
        <p className="text-muted">
          They are <span className="text-amber">not</span> SSH passwords. Each
          level gives you two different tokens:
        </p>
        <ul className="text-muted space-y-0.5 pl-4">
          <li>
            <span className="text-amber">password</span> — used to{" "}
            <code>ssh ghostN@…</code> into the next level. Never submitted here.
          </li>
          <li>
            <span className="text-amber">flag</span> — a{" "}
            <code>FLAG{`{...}`}</code> token hidden on the level. Paste it here
            for points.
          </li>
        </ul>
      </div>
      <SubmitForm />
    </div>
  );
}

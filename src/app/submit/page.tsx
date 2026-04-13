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
      <SubmitForm />
    </div>
  );
}

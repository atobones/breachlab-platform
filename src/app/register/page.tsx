import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  const { user } = await getCurrentSession();
  if (user) redirect("/dashboard");
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Register</h1>
      <p className="text-sm text-muted">
        Create an operative account. Use a real email — we send a verification link.
      </p>
      <RegisterForm />
    </div>
  );
}

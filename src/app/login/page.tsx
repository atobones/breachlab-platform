import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const { user } = await getCurrentSession();
  if (user) redirect("/dashboard");
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Login</h1>
      <LoginForm />
      <p className="text-xs text-muted">
        <a href="/forgot-password">Forgot password?</a>
      </p>
    </div>
  );
}

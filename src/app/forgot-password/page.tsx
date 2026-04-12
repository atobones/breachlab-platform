import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Forgot password</h1>
      <p className="text-sm text-muted">
        Enter your email address. If we have an account on file, we send you a
        reset link.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}

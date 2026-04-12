import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Reset password</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}

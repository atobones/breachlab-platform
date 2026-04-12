const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export function verifyEmailText(token: string): string {
  return [
    "Welcome to BreachLab.",
    "",
    "Click the link below to verify your email:",
    `${SITE_URL}/verify-email/${token}`,
    "",
    "If you did not create this account, ignore this message.",
  ].join("\n");
}

export function passwordResetText(token: string): string {
  return [
    "BreachLab password reset.",
    "",
    "Click the link below to set a new password:",
    `${SITE_URL}/reset-password/${token}`,
    "",
    "This link expires in one hour.",
    "If you did not request this, ignore the message.",
  ].join("\n");
}

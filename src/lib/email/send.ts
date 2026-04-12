import { getEmailClient } from "./client";
import { verifyEmailText, passwordResetText } from "./templates";

export async function sendVerificationEmail(to: string, token: string) {
  await getEmailClient().send({
    to,
    subject: "Verify your BreachLab email",
    text: verifyEmailText(token),
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  await getEmailClient().send({
    to,
    subject: "Reset your BreachLab password",
    text: passwordResetText(token),
  });
}

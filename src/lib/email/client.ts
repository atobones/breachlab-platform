import { Resend } from "resend";

export type SendArgs = {
  to: string;
  subject: string;
  text: string;
};

export interface EmailClient {
  send(args: SendArgs): Promise<void>;
}

class ConsoleEmailClient implements EmailClient {
  async send(args: SendArgs): Promise<void> {
    console.log("[email:console]", JSON.stringify(args, null, 2));
  }
}

class ResendEmailClient implements EmailClient {
  private resend: Resend;
  private from: string;
  constructor(apiKey: string, from: string) {
    this.resend = new Resend(apiKey);
    this.from = from;
  }
  async send(args: SendArgs): Promise<void> {
    await this.resend.emails.send({
      from: this.from,
      to: args.to,
      subject: args.subject,
      text: args.text,
    });
  }
}

let cached: EmailClient | null = null;
export function getEmailClient(): EmailClient {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "BreachLab <noreply@localhost>";
  cached =
    apiKey && apiKey.length > 0
      ? new ResendEmailClient(apiKey, from)
      : new ConsoleEmailClient();
  return cached;
}

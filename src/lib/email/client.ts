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
    // Resend SDK does NOT throw on API errors — it returns {data, error}.
    // Silent failures (unverified sender domain, revoked key, rate limit)
    // looked like success to the registration flow, so users never got
    // verification mail and admins never saw it in logs. Surface and log.
    const result = await this.resend.emails.send({
      from: this.from,
      to: args.to,
      subject: args.subject,
      text: args.text,
    });
    if (result.error) {
      const msg = `[email:resend] send failed to=${args.to} name=${result.error.name} message=${result.error.message}`;
      console.error(msg);
      throw new Error(msg);
    }
    console.log(
      `[email:resend] sent to=${args.to} id=${result.data?.id ?? "?"}`
    );
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

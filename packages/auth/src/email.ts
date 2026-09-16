import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Development sender. Writes the message to the console instead of delivering
 * it, so verification and password reset flows can be exercised locally
 * without configuring a mail provider.
 */
export class ConsoleEmailSender implements EmailSender {
  send(message: EmailMessage): Promise<void> {
    console.warn(
      [
        "",
        "--- email (not actually sent) ---",
        `to:      ${message.to}`,
        `subject: ${message.subject}`,
        "",
        message.text,
        "--- end email ---",
        "",
      ].join("\n"),
    );
    return Promise.resolve();
  }
}

export interface SesEmailSenderOptions {
  /** Verified sender identity, for example "Inept Engineers <no-reply@ineptengineers.com>". */
  from: string;
  region?: string;
  client?: SESv2Client;
}

/**
 * Production sender, backed by Amazon SES.
 *
 * Note for whoever deploys this: a new SES account starts in sandbox mode and
 * can only deliver to verified addresses. Production access is a support
 * request and takes about a day, so it is worth filing before launch.
 */
export class SesEmailSender implements EmailSender {
  private readonly client: SESv2Client;

  constructor(private readonly options: SesEmailSenderOptions) {
    this.client =
      options.client ??
      new SESv2Client({ region: options.region ?? process.env.AWS_REGION });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.options.from,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: "UTF-8" },
            Body: { Text: { Data: message.text, Charset: "UTF-8" } },
          },
        },
      }),
    );
  }
}

/**
 * Picks a sender from the environment. SES when a from address is configured,
 * otherwise the console sender, so local development needs no mail setup.
 */
export function resolveEmailSender(
  env: NodeJS.ProcessEnv = process.env,
): EmailSender {
  if (env.EMAIL_FROM) {
    return new SesEmailSender({ from: env.EMAIL_FROM, region: env.AWS_REGION });
  }
  return new ConsoleEmailSender();
}

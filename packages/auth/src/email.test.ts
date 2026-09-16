import { describe, expect, it, vi } from "vitest";

import {
  ConsoleEmailSender,
  SesEmailSender,
  resolveEmailSender,
} from "./email.js";

describe("resolveEmailSender", () => {
  it("uses the console sender when no from address is configured", () => {
    expect(resolveEmailSender({})).toBeInstanceOf(ConsoleEmailSender);
  });

  it("uses SES once a from address is configured", () => {
    const sender = resolveEmailSender({
      EMAIL_FROM: "no-reply@ineptengineers.com",
      AWS_REGION: "us-west-2",
    });
    expect(sender).toBeInstanceOf(SesEmailSender);
  });
});

describe("SesEmailSender", () => {
  it("sends through SES with the configured sender identity", async () => {
    const send = vi.fn().mockResolvedValue({});
    const sender = new SesEmailSender({
      from: "Inept Engineers <no-reply@ineptengineers.com>",
      client: { send } as never,
    });

    await sender.send({
      to: "member@example.com",
      subject: "Hello",
      text: "Body",
    });

    expect(send).toHaveBeenCalledOnce();
    const command = send.mock.calls[0]?.[0] as {
      input: Record<string, unknown>;
    };
    expect(command.input).toMatchObject({
      FromEmailAddress: "Inept Engineers <no-reply@ineptengineers.com>",
      Destination: { ToAddresses: ["member@example.com"] },
    });
  });
});

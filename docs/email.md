# Email (Amazon SES)

Verification and password reset emails are sent through Amazon SES in **us-west-2**, the same region
as the API.

## Current state

| Item              | Value                                                        |
| ----------------- | ------------------------------------------------------------ |
| Domain identity   | `ineptengineers.com`, verified                               |
| DKIM              | Easy DKIM, RSA 2048-bit, verified                            |
| Custom MAIL FROM  | `mail.ineptengineers.com`, verified                          |
| Production access | **Requested, pending AWS review**                            |
| Sandbox limits    | 200 messages per day, 1 per second, verified recipients only |

## What "sandbox" means

Until AWS approves production access, SES will only deliver to addresses that have been verified
individually. `dev.croaker@gmail.com` has been added as a verified identity for that reason, so the
real email flow can be exercised before launch.

**Members cannot receive verification emails until production access is granted.** AWS usually
responds within a day. Check with:

```bash
aws sesv2 get-account --region us-west-2 \
  --query '{ProductionAccess:ProductionAccessEnabled,Review:Details.ReviewDetails.Status}'
```

## DNS records

Five records in the `ineptengineers.com` hosted zone support this. They were generated from the SES
API response rather than typed by hand, because a single wrong character in a DKIM token fails
verification silently.

- Three `<token>._domainkey.ineptengineers.com` CNAMEs pointing at `<token>.dkim.amazonses.com`
- `mail.ineptengineers.com` MX pointing at `10 feedback-smtp.us-west-2.amazonses.com`
- `mail.ineptengineers.com` TXT containing `v=spf1 include:amazonses.com ~all`

The custom MAIL FROM is what stops recipients seeing "via amazonses.com", and it lets bounce and
complaint notifications come back to a domain we control. Behaviour on MX failure is
`USE_DEFAULT_VALUE`, so mail still sends if that MX record is ever broken rather than failing
entirely.

## How the application uses it

`packages/auth` puts email behind a small interface:

- With `EMAIL_FROM` unset, the console sender prints messages to the terminal. This is the default
  for local development and needs no AWS access at all.
- With `EMAIL_FROM` set to a verified identity, the SES sender delivers for real.

Set it to something on the verified domain, for example:

```bash
EMAIL_FROM="Inept Engineers <no-reply@ineptengineers.com>"
```

## Not managed by CDK

This is account-level configuration, created through the SES and Route53 APIs rather than a stack.
The identity and its DNS records are stable and rarely change, so the infrastructure work does not
need to own them. If a future rebuild recreates the hosted zone, these records must be recreated
too; the commands are in this document's history.

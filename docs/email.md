# Email (Amazon SES)

Verification and password reset emails are sent through Amazon SES in **us-west-2**, the same region
as the API.

## Current state

| Item                    | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| Domain identity         | `ineptengineers.com`, verified                          |
| DKIM                    | Easy DKIM, RSA 2048-bit, verified                       |
| Custom MAIL FROM        | `mail.ineptengineers.com`, verified                     |
| Production access       | **Granted** (case 178959804600011)                      |
| Sending limits          | 50,000 messages per day, 14 per second, any recipient   |
| `dev.croaker@gmail.com` | Verified; no longer required now that sandbox is lifted |

## Sending limits

Production access was granted, so SES delivers to any recipient. The account allows 50,000 messages
per day at 14 per second, which is far beyond what a group of this size will use.

Individual recipient verification is no longer needed. `dev.croaker@gmail.com` remains verified from
the sandbox period and can be left alone.

Check the account state at any time with:

```bash
aws sesv2 get-account --region us-west-2 \
  --query '{ProductionAccess:ProductionAccessEnabled,Review:Details.ReviewDetails.Status}'
```

Sending can still be paused account-wide by AWS if bounce or complaint rates climb, so those are
worth watching once real mail starts flowing.

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

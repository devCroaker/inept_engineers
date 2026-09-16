# @inept/auth

Better Auth configuration: session handling, sign-in providers, and the bridge between a session
and the member data access policy in `@inept/db`.

## Sign-in methods

Email and password, Google, and Discord. All three land in the same account, because the `account`
table holds one row per method.

## Account linking, and why Discord is not trusted

Better Auth links a provider to an existing user when the email addresses match. That is convenient
and it is also an account takeover route: if a provider does not verify email ownership, someone
can register there using another member's address and inherit their account. In this application
that account owns a `member_medical` row.

So `trustedProviders` contains **Google only**. Google reports email verification reliably.
Discord does not guarantee it and can return no email at all. Discord and password are linked
deliberately from account settings while already signed in, which costs one extra click and closes
the hole. There is a test asserting Discord never appears in `trustedProviders`.

## Membership level

New accounts default to `foe`, and the field is declared with `input: false` so a crafted sign-up
request cannot name its own membership level. Advancement is done by an officer.

## Roles are read per request

`loadUserRoles` reads from `user_roles` on each request rather than baking roles into the session.
Revoking `medical` therefore takes effect immediately instead of whenever that person next signs
in, which is the behaviour you want for revocation.

## Setting up the OAuth applications

Better Auth serves its routes under `/api/auth`, and the callback path is
`/api/auth/callback/<provider>`. In production CloudFront serves the site and forwards `/api/*` to
the API, so everything is same origin. Locally, the Next.js dev server proxies `/api/*` to the API
on port 8787, so the origin is `localhost:3000` in both cases.

Register these redirect URIs:

**Google**, at <https://console.cloud.google.com/apis/credentials>, as an OAuth 2.0 Client ID of
type Web application:

```
http://localhost:3000/api/auth/callback/google
https://ineptengineers.com/api/auth/callback/google
```

**Discord**, at <https://discord.com/developers/applications>, under OAuth2 redirects:

```
http://localhost:3000/api/auth/callback/discord
https://ineptengineers.com/api/auth/callback/discord
```

Then fill in `.env`:

```bash
BETTER_AUTH_SECRET=      # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

These are real secrets. They belong in `.env` locally, which is gitignored, and in GitHub Actions
secrets plus SSM for deployments. Never in a committed file.

## Email

Verification and password reset need to send mail. With no `EMAIL_FROM` set, the console sender
prints messages to the terminal, so both flows can be exercised locally with no mail provider. Set
`EMAIL_FROM` to a verified SES identity and the SES sender is used instead.

A new SES account starts in **sandbox mode** and can only deliver to addresses you have verified.
Production access is a support request that usually clears within a day, so file it before launch
rather than on launch day.

# Roadmap

Tracked here rather than in a chat history so it survives and can be reordered.

## Done

| PR  | What                                                 |
| --- | ---------------------------------------------------- |
| #1  | Monorepo scaffold and CI                             |
| #2  | Database package, auth and member schema             |
| #4  | Better Auth with Google, Discord, and email/password |
| #5  | Hono API with Better Auth mounted                    |
| #6  | Next.js app with MUI and Tailwind                    |
| #7  | Events and RSVP schema                               |
| #8  | SES setup documented, production access granted      |
| #9  | Events and RSVP API                                  |
| #10 | Browse events: app shell, list, detail               |

## In progress

**Events UI.** Being built in three parts so each is reviewable on its own.

1. Browsing: app shell, shared viewer state, event list, and event detail. Done in #10.
2. Replying: the RSVP control and the attendance roster. (This PR.)
3. Organising: the form for creating and editing an event.

## Next

**Infrastructure (CDK).** Certificate, VPC with no NAT Gateway, RDS, API Gateway and Lambda, and
CloudFront serving the web app with `/api/*` routed to the API. Roughly 18 USD per month.

**Deploy pipeline.** GitHub Actions deploying via the existing OIDC role, running migrations through
a Lambda inside the VPC, and a Playwright smoke test against the deployed site.

**Camp food buy-in ledger.** Who owes what, who has paid, settled outside the site via Friends and
Family or Zelle so no payment fees are incurred.

**Volunteer shifts.** Shift definitions per event, self-signup, and a view of where coverage is
missing.

**Feast menus.** Menus per event, drawing on the dietary data already modelled, visible to kitchen
and medical.

## Backlog

**Privacy policy and terms of service pages.** Two static pages at `/privacy` and `/terms`.

Not cosmetic: **publishing the Google OAuth app requires both URLs to be live and reachable.** Until
that happens the app stays in Testing mode, where refresh tokens expire every 7 days and members get
signed out weekly. Needs doing before members rely on Google sign-in, but it cannot happen until the
site is deployed, since Google verifies the URLs resolve.

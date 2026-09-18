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
| #11 | Reply to events, and the attendance roster           |
| #12 | Create and edit events                               |
| #13 | Route events by id, drop slugs                       |
| #14 | Finish routing the event form by id                  |

## In progress

**Privacy policy and terms of service pages.** (This PR.) Written and linked from every page.

Two things remain before this can actually be closed, and neither is writing:

1. **Inbound mail for `privacy@ineptengineers.com`**, which the privacy policy publishes. SES today
   only sends. Receiving needs either forwarding to a real inbox or a mailbox on the domain.
2. **Deployment**, because Google verifies that both URLs resolve before it will publish the OAuth
   app. Until it is published, refresh tokens expire every 7 days and members are signed out weekly.

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

Nothing parked here at the moment.

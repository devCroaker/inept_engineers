# @inept/db

Drizzle schema, migrations, and the database client.

## Membership and roles

Two separate concepts, deliberately modelled differently.

**Membership level** is a single value on the user row that advances through the sponsorship
process. Everyone starts as `foe` (Friend of Engineers) and becomes a `member`. Because it is one
column, the database makes it impossible to be both at once.

**Roles** live in `user_roles`, and a person holds any number of them:

| Role                                                     | Kind                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `sister`, `officer`                                      | Leadership standing. Parallel tracks, not a ranking, so someone can hold both. |
| `captain`, `triad`, `medical`, `money`, `web`, `kitchen` | Jobs.                                                                          |

Holding a job does not require any particular standing, so a `member` can run the kitchen.

Adding a role means a migration widening the `user_roles_role_valid` check, plus adding the value
to `ROLES`. That is intentional: role names are compared in access-control code, so keeping them a
TypeScript union means a typo fails the build instead of silently denying access.

## Sign-in methods

Three ways in, all landing in the same account: email and password, Google, and Discord. The
`account` table holds one row per method, so a person may hold all three at once. The unique index
on `(issuer, account_id)` stops one external account being attached to two different users.

Linking policy, chosen because this database holds medical data:

- **Google links automatically** when the email matches, because Google reliably reports whether an
  email is verified.
- **Discord and password must be linked explicitly** from account settings while already signed in.
  Better Auth will otherwise link any provider whose email matches an existing user, which would let
  someone who created a Discord account with your email address reach your medical row.

Sign-up is open. New accounts arrive as `foe` with no roles, which under the access rules above
means they can see very little until an officer promotes them.

## Member data is split by audience

Personal data is separated by **who may read it**, not by topic. Each table has exactly one
audience, so access is structural: a query cannot leak a field it did not join.

| Table                | Contents                               | Readable by                      |
| -------------------- | -------------------------------------- | -------------------------------- |
| `profiles`           | SCA name, pronouns, city, state, bio   | any signed-in member             |
| `member_contact`     | legal name, phone, accessibility notes | the member, `sister`, `officer`  |
| `emergency_contacts` | next of kin, ordered by priority       | the member, `sister`, `officer`  |
| `member_dietary`     | allergies, dietary restrictions        | the member, `medical`, `kitchen` |
| `member_medical`     | medications, conditions                | the member, `medical`            |

A member can always read their own data, including their own medical row. Signed-out visitors can
read none of it, profiles included: this is a private household roster, not a public directory.

`src/access.ts` holds the policy as data, and `canReadMemberData()` is the single function that
answers the question. The API layer consults it rather than restating the rules, and the tests
assert against the same table, so the policy and its expectations cannot drift.

## Events and RSVPs

`events` covers everything the household puts on: `camping`, `party`, `day_event`, `practice`,
`meeting`, `other`. Status is `draft`, `published`, or `cancelled`, and events start as drafts so
nothing appears to members until an organizer publishes it.

Official SCA registration is not handled here. Events that charge fees carry an
`externalRegistrationUrl` pointing at the kingdom's own system. This site coordinates attendance and
the camp food buy-in; it never takes event fees.

### Why attendance is a date range, not a row per day

`rsvps` records `arrivalDate` and `departureDate` rather than one row per day of a multi-day event.

Per-night headcounts, which is what site fees and meal planning actually need, are derivable from
the range, and a range is how people describe it: "Friday night through Sunday". A per-day table
would only earn its complexity for genuinely non-contiguous attendance, which is rare. If that
turns out to matter, it is an additive migration.

One RSVP exists per member per event, enforced by a unique index, so changing your mind updates the
row rather than adding another. `guestCount` covers non-member companions.

Database-level constraints, all covered by tests that bypass the TypeScript types:

| Constraint                                  | Rejects                            |
| ------------------------------------------- | ---------------------------------- |
| `events_ends_after_starts`                  | an event ending before it starts   |
| `events_kind_valid` / `events_status_valid` | unknown kinds or statuses          |
| `rsvps_event_user_idx`                      | a second RSVP from the same member |
| `rsvps_departure_after_arrival`             | leaving before arriving            |
| `rsvps_guest_count_non_negative`            | negative guest counts              |

Deleting an event removes its RSVPs. Deleting a member removes their RSVPs but **keeps events they
created**, with `createdBy` set to null: the event outlives whoever organised it.

## Local development

```bash
pnpm db:up                              # Postgres 17 on port 5433
pnpm --filter @inept/db db:generate     # generate a migration from the schema
pnpm --filter @inept/db db:migrate      # apply pending migrations
pnpm --filter @inept/db db:studio       # browse the data
```

See `certs/README.md` for the RDS certificate bundle.

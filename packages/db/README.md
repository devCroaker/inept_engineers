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

## Local development

```bash
pnpm db:up                              # Postgres 17 on port 5433
pnpm --filter @inept/db db:generate     # generate a migration from the schema
pnpm --filter @inept/db db:migrate      # apply pending migrations
pnpm --filter @inept/db db:studio       # browse the data
```

See `certs/README.md` for the RDS certificate bundle.

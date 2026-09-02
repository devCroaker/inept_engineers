# RDS certificate authority bundle

## What this is

`rds-us-west-2-bundle.pem` contains the three public root certificate authorities Amazon uses to
sign RDS server certificates in **us-west-2**. It is a trust store, not a credential. It contains
no private keys, it is not secret, and the identical certificates are published by AWS at
<https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem>.

## Why it is committed

When the API connects to the database it verifies that it is really talking to our RDS instance
rather than something impersonating it. Verifying RDS's certificate requires the root CA that
signed it, and Node's built in trust store contains public web CAs but not Amazon's RDS roots.
Without this file, verification cannot succeed.

The usual workaround for that failure is:

```js
ssl: {
  rejectUnauthorized: false;
}
```

which accepts any certificate at all and defeats the purpose of TLS. Shipping the real roots lets
`src/client.ts` keep `rejectUnauthorized: true` instead.

It is committed rather than downloaded at startup because the API Lambda runs in isolated subnets
with no NAT Gateway, deliberately, to avoid roughly 32 USD per month. It has no route to the
internet and cannot fetch anything at runtime.

## Why only one region

AWS publishes a single global bundle covering every region: 108 certificates and about 165 KB. We
only ever connect to one region, so this is trimmed to the three us-west-2 roots, about 4 KB.

**This means the bundle is region specific.** Deploying the database to a different region without
regenerating it will fail TLS verification. `src/client.ts` checks for that and raises a clear
error rather than letting it surface as an opaque handshake failure.

## Regenerating

```bash
pnpm --filter @inept/db ca:fetch              # us-west-2
pnpm --filter @inept/db ca:fetch eu-west-1    # some other region
```

Then update `RDS_CA_REGION` in `src/client.ts` to match, and update the filename reference.

## Expiry

The us-west-2 roots expire in 2061 and 2121, so no rotation is expected. Regenerate if AWS
publishes new regional roots.

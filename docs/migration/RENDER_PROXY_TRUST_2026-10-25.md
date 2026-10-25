# Render ingress and rate-limit proxy trust — 25 October 2026

## Cause

Both runtime configuration loaders previously defaulted to an empty trusted-proxy list. Express therefore kept `trust proxy=false` on Render, even though Render sends X-Forwarded-For through its Cloudflare edge and load balancers. express-rate-limit correctly reported ERR_ERL_UNEXPECTED_X_FORWARDED_FOR, and limits could aggregate ingress clients under a proxy address.

The retained API mounts a maintained API sub-application. Both already accept an address allowlist, but both must receive the same resolved host policy. Disabling library validation or setting global `trust proxy=true` would hide the problem or allow forged IP attribution.

## Fix

The shared `resolveProxyTrust` policy preserves explicit `AUTH_TRUST_PROXY` / `API_TRUST_PROXY` operator IP lists. In staging/production with Render's exact `RENDER=true` marker and no explicit list, it supplies internal proxy ranges (Express loopback/linklocal/uniquelocal) and Cloudflare's published IPv4/IPv6 ranges. Outside Render and in development, the default remains empty/disabled.

Express walks right-to-left through the actual socket and forwarding chain, stopping at the nearest address outside the trusted ranges. This avoids guessing a fixed number of infrastructure hops and rejects arbitrary untrusted forwarding prefixes. No library validation, rate-limit threshold, authentication, CORS, cookie policy or commerce rule is disabled or changed. Both legacy and mounted versioned APIs receive the resolved allowlist through existing startup wiring.

There is no runtime network dependency or Cloudflare-account/DNS requirement. Render uses its own Cloudflare ingress independently of the pharmacy's DNS provider.

## Verification

- Unit configuration checks cover default direct-server mode, Render host detection, explicit override precedence and development isolation for both loaders.
- Real loopback HTTP checks cover multi-hop IPv4/IPv6 infrastructure, forged left prefixes, unknown public intermediaries and direct-server rejection of forwarded identities.
- Legacy and mounted versioned API rate-limit regressions make 121 same-client requests with different forged prefixes: request 121 is limited, while a different resolved client is not. No express-rate-limit validation errors are suppressed.
- Commerce adapter and full isolated foundation production builds, full lint/typecheck, focused security tests and normal unit tests pass. Shared loaders use the package export so Next configuration loading resolves the TypeScript helper correctly. No database or provider is contacted by these tests.

## Operational boundaries

The policy assumes a Render public web service where external ingress passes through Render-managed infrastructure; do not reuse this platform fallback for an arbitrary public server or a network with untrusted private peers. Explicit operator lists override automatic Render defaults and must themselves be kept accurate. Unknown intermediary ranges are not trusted, which can conservatively group traffic at that intermediary until the allowlist is reviewed.

Cloudflare ranges were checked against its official lists on 2026-10-25. Recheck those lists if Render changes routing or address attribution degrades; do not fetch/update trust policy automatically from request data. Review private-network access when introducing additional internal callers.

The resolved IP represents the caller reaching Render. A request made by the Next.js server represents that server's egress unless a separate authenticated client-identity handoff is designed. This change does not invent browser IP headers, replace customer/account authentication or claim that every proxy-origin request identifies an individual shopper. Multi-instance distributed rate-limit storage is a separate deployment concern.

No public IP-debug endpoint or new IP logging is introduced. Actual production log verification remains necessary after the fix is merged and deployed; local tests are not a production deployment claim.

## References

- Render ingress architecture: https://render.com/articles/how-render-handles-ddos-attacks
- Render default environment marker: https://render.com/docs/environment-variables
- Express proxy trust: https://expressjs.com/en/guide/behind-proxies/
- Provider ranges: https://www.cloudflare.com/ips-v4 and https://www.cloudflare.com/ips-v6
- Original validation: https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/

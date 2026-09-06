# Security policy

## Reporting a vulnerability

**Use GitHub's private vulnerability reporting** on this repository: open the
**Security** tab and choose **Report a vulnerability**. That opens a private thread
visible only to the maintainers.

Please do not open a public issue for a security problem, and please do not post one
in a discussion thread.

<!-- TODO: maintainer to supply a monitored contact address for reporters who cannot
     use GitHub. Leaving this blank is better than publishing an address nobody reads
     — the previous version of this file listed security@example.com, which was a
     placeholder that would have silently dropped every report. -->

**What helps:** what you found, how to reproduce it, which mode you were running
(local-first or server), and what an attacker gains. A proof of concept is welcome but
not required.

**What to expect:** an acknowledgement, and an honest answer about whether it is
something we already know about — this document lists several things we do. If it is
new and real, you will be told when a fix lands, and credited unless you would rather
not be.

This is a pre-1.0 project maintained in spare time. You will get a straight answer, not
a service-level agreement.

## Supported versions

There are no releases yet. `package.json` reads `0.0.0` and no tags have been cut, so
the only supported version is the current `main` branch. If a fix is needed, it lands
on `main`.

---

## Two modes, two very different security models

This is the most important section in the document, and the thing most likely to be
misunderstood. Brassworth runs in two modes and they are not equivalent.

|                                           | Local-first (default)                            | Self-hosted server                   |
| ----------------------------------------- | ------------------------------------------------ | ------------------------------------ |
| Where data lives                          | Your browser                                     | SQLite on your server                |
| Is the sign-in screen a security boundary | **No**                                           | Yes                                  |
| Password storage                          | PBKDF2-SHA256, 100,000 iterations, per-user salt | scrypt at OWASP parameters           |
| Sign-in rate limiting                     | Yes, in the browser (clearable)                  | **No** — see known gaps              |
| Authorisation                             | Decided by the page                              | Checked on the server, every request |
| Session                                   | Record in browser storage                        | Opaque token in an httpOnly cookie   |
| Suitable for                              | One person, on a machine they control            | Data that matters                    |

### Local-first mode is not a security boundary

Accounts, roles, memberships and the session are records in your browser's storage,
written by the page itself. **Anyone who can open devtools on that browser can read
them, change them, or grant themselves the administrator role.** The permission system
decides what the interface draws. It decides nothing about what is permitted, because
there is nothing on the other side to enforce it.

This is a deliberate design, not an oversight. Local-first mode exists so the
application can run with no server, no account and nothing uploaded anywhere — that is
a privacy property, and it is a real one. It is not a multi-user access-control
property, and it was never going to be, because there is no trusted party in the
architecture to be one.

**Treat local-first mode as a single-user application on a machine you control.**

Passwords are still hashed properly, and that is worth doing for a reason unrelated to
this app: people reuse passwords. PBKDF2 at 100,000 iterations with a per-user salt
protects the password itself against someone who reads browser storage. It does not
protect the application.

### Server mode enforces things

- **Passwords** are hashed with **scrypt** (N=2^17, r=8, p=1) and verified in constant
  time. Sign-in is timing-equalised for accounts that do not exist, so response time
  does not reveal which email addresses are registered.
- **Sessions** are opaque 256-bit random tokens. Only the SHA-256 of a token is stored,
  so a database disclosure does not hand over usable sessions. The cookie is
  `httpOnly`, `SameSite=Lax`, `Path=/`, and marked `Secure` when `NODE_ENV=production`.
- **Every tenant-scoped request** goes through a single guard that looks up membership
  and role server-side. There is no path that trusts a role asserted by the client.
- **`organizationId` is read from the verified request path, never from the request
  body**, so a client cannot write into a property by naming a different one in a
  payload.
- **A non-member receives 404, not 403.** A 403 confirms that a property exists, which
  is information a stranger should not have. This is intentional; a 404 where you
  expected a 403 is not a bug.

> **Set `NODE_ENV=production`.** It is what marks the session cookie `Secure`. Without
> it you are serving cookies over HTTPS that are not flagged as HTTPS-only.

### scrypt rather than Argon2id

Argon2id would be the first choice on the OWASP list. Every Node binding for it is a
native module, and easy self-hosting is a value of this project — a native module means
build toolchains, architecture-specific images, and installation failures on the exact
machines this is meant to run on. scrypt is OWASP's named second choice, ships in the
Node standard library, and is used here at their recommended parameters.

### Opaque tokens rather than JWTs

A JWT cannot be revoked without a denylist, and a denylist is a session table with
extra steps and a worse failure mode. Sessions are rows. Signing out deletes one.

### OIDC links on subject, never on email

When optional OIDC sign-in is configured, an external account is linked to a local one
by the provider's `subject` claim. **Never by email address alone.** An unverified email
from a provider is an account-takeover path: register at the provider with someone
else's address, sign in here, land in their account. Linking on subject closes it.

OIDC uses PKCE, a nonce, and single-use state. All four of `OIDC_ISSUER`,
`OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and `OIDC_REDIRECT_URI` are required together —
with any one missing, the route reports itself unavailable rather than half-enabling.

---

## Known gaps

Stated plainly, because a security document that lists only strengths is marketing.

- **No server-side sign-in rate limiting.** The browser-side lockout in local mode does
  not apply to the API, and the server has no equivalent. If you expose an instance to
  the internet, put rate limiting in your reverse proxy. This is the most significant
  open item.
- **No password reset.** There is no route for it. An account whose password is lost
  needs database access to recover.
- **No encryption at rest.** The SQLite file is not encrypted, and neither is browser
  storage. Use disk encryption on the host.
- **Multi-user sharing is not usable in server mode.** There is no route to add a
  second member to a property, and inviting reports itself unavailable. This is a
  functionality gap rather than a vulnerability, but it means server mode is
  effectively single-user today.
- **`xlsx` carries two unfixed high advisories** with no upstream fix available. This is
  why CI blocks on `critical` rather than `high` — blocking on `high` would mean a
  permanently red pipeline that everyone learns to ignore, which is worse than a
  documented exception. Replacing the dependency is tracked work.
- **No server-side sign-in rate limiting** is the gap above, and
  `docker-compose.prod.yml` is the supported way to close it: its nginx configuration
  rate-limits `/api/auth/` to 5 requests a minute with a burst of 3. If you run the
  plain `docker-compose.yml` behind your own proxy, add the equivalent yourself. See
  [SELF_HOSTING.md](./docs/SELF_HOSTING.md).
- **Photos are stored as data URLs.** In local-first mode they share the browser's
  storage quota, so a large catalogue can fail to save. That is a reliability problem
  rather than a security one, but losing data is losing data.

## Out of scope

- Anything requiring an attacker to already have access to the browser or the machine
  running local-first mode. That is not a boundary, and this document says so above.
- Denial of service against an instance you host yourself.
- Vulnerabilities in dependencies that are already publicly known and listed here.
- Social engineering.

## If you self-host

- Set `NODE_ENV=production`.
- Terminate TLS in front of the container and set `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and a
  `Referrer-Policy`. Header configuration is in
  [SELF_HOSTING.md](./docs/SELF_HOSTING.md), which owns that topic.
- Add rate limiting at the proxy, given the gap above.
- Keep the container updated, and take backups — see [BACKUP.md](./docs/BACKUP.md).
- Do not expose an instance to the internet expecting it to be hardened against a
  determined attacker. It has not been audited.

## See also

- [Architecture](./docs/ARCHITECTURE.md) — how authentication and isolation are built
- [Data model](./docs/DATA_MODEL.md) — the permission matrix
- [Self-hosting](./docs/SELF_HOSTING.md) — configuration, TLS and headers

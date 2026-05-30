# Dockerized Web App Container Lockdown Runbook

## Scope

Project-agnostic operating runbook for serving a Dockerized web app securely in development or internal environments when the browser must trust a local or private HTTPS origin.

## Core Rule

The server cannot make a browser trust a certificate chain on a separate machine by itself.

To remove browser warnings, one of these must be true:

1. The certificate chains to a public CA on a real delegated domain.
2. The client machine trusts the private root CA that issued the server certificate.

If the hostname is local-only, the trust anchor must be installed on each client.

## Recommended Pattern

Use a high, non-default port for the web app and terminate TLS in the dev server or reverse proxy.

Use a separate Docker access path for operators:

1. `ssh://` Docker context for daemon access.
2. No plaintext Docker TCP socket.
3. No client-side local Docker engine when the daemon host already exists.
4. No `DOCKER_HOST` environment variable overriding the selected context.

## Certificate Model

Create a private development CA and issue a server certificate with subject alternative names for the actual hostnames used by browsers.

Keep the CA private key off client machines.
Only distribute the CA certificate or trust profile.

Minimum certificate checks:

- SAN includes the exact hostname used by the browser.
- Certificate is valid on current date.
- Chain verifies against the intended root CA.
- Server presents the full chain expected by the browser.

## macOS Client Trust

Use one of these paths:

1. System trust store, if admin rights are available.
2. Configuration profile (`.mobileconfig`) for manual installation when admin automation is blocked.

Useful commands:

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /path/to/root-ca.crt
```

If root trust installation is blocked by macOS authorization, use a signed or unsigned configuration profile that carries the CA certificate and install it through System Settings > General > VPN & Device Management.

Silent profile installation via the old `profiles install` flow is no longer reliable on recent macOS releases.

## Linux Client Trust

Install the root CA into the system CA bundle.

Common patterns:

- Debian/Ubuntu: copy to `/usr/local/share/ca-certificates/` and run `update-ca-certificates`
- Fedora/RHEL: use `update-ca-trust`

## Windows Client Trust

Install the root CA into the trusted root store.

Common pattern:

```powershell
certutil -addstore Root path\to\root-ca.crt
```

## Vite Or Similar Dev Server

For a Vite-based dev server:

- Set `server.https` to the certificate and private key.
- Set `server.origin` to the exact HTTPS origin the browser will use.
- Ensure `allowedHosts` includes the hostname when host checking is active.
- Keep the app origin and the dev server origin in environment variables, not hardcoded in multiple places.

## Browser Verification

Use a real browser, not curl, for final verification.

Check these in the browser console:

- `window.isSecureContext === true`
- `typeof window.showSaveFilePicker === 'function'` when file-save flows depend on it
- The page loads with no certificate warning

Check these at the transport level:

```bash
openssl s_client -connect host:port -servername host -CAfile /path/to/root-ca.crt -verify_return_error
```

## File Save Behavior

When using File System Access API save flows:

- Use the current tab or document title as `suggestedName`.
- Update the UI title after save using the returned handle name.
- Treat user cancel as a no-op.

## Docker Access Hardening

Use SSH transport for Docker daemon access:

```bash
docker context create app-ssh --docker host=ssh://user@host
docker context use app-ssh
```

Do not expose the Docker daemon on `tcp://host:2375`.
If TLS on the Docker daemon is required, prefer it only when SSH cannot satisfy the operational need.

## Container Hardening

1. Run the app in a container image with only the runtime it needs.
2. Avoid privileged containers.
3. Avoid mounting the host filesystem unless there is a specific, documented reason.
4. Keep secrets out of the image.
5. Expose only the app port and proxy port that are actually used.
6. Keep the browser-facing origin and the container service origin explicit in environment variables.

## Verification Ladder

1. Confirm the root CA is installed on the client.
2. Confirm the server certificate matches the hostname.
3. Confirm `openssl s_client` verifies cleanly.
4. Confirm the browser shows a secure context.
5. Confirm the app behavior that depends on secure context works.
6. Confirm a second machine trusts the same CA only after that machine has installed the trust anchor.

## Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| “Connection is not private” | Client does not trust the CA | Install the CA or use a public cert on a real domain |
| Browser sees insecure context | HTTPS not in effect or cert is untrusted | Serve over HTTPS with a trusted chain |
| `showSaveFilePicker` missing | Not secure context or unsupported browser | Fix HTTPS trust first |
| Docker CLI ignores context | `DOCKER_HOST` is set | Unset `DOCKER_HOST` |
| Docker daemon reachable by TCP | Insecure daemon exposure | Remove TCP bind, use SSH context |

## Notes From This Run

- A local dev CA is not enough unless the client machine trusts it.
- Recent macOS releases can block non-interactive trust-store modification.
- For machine-wide trust at scale, use a real deployment path: MDM, profile management, or a public CA on a real domain.


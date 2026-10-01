# Security policy

herdr-watcher can type into your terminals. Please report security problems privately.

## Report a vulnerability

Use GitHub's private reporting: open the **Security** tab of this repository and select **Report a vulnerability**. Do not open a public issue.

Include:

- what an attacker can do, and from where (same machine, same network, a web page you visit)
- the steps to reproduce it
- the herdr-watcher version (the git tag or commit) and your OS

You will get a reply within 7 days. Fixes for confirmed problems ship in a new release, and the advisory credits you unless you ask otherwise.

## Supported versions

Only the latest release gets security fixes.

## Security model

- The server listens on `127.0.0.1` only. It has no login of its own.
- Anyone who can load the dashboard can send keys and text to your agents. Only expose it through something that already authenticates you, such as a tailnet, an SSH tunnel, or remote desktop.
- The server refuses requests whose `Host` is not `localhost`, `127.0.0.1`, `::1`, or a host listed in `allowedHosts`. This blocks DNS-rebinding attacks.
- The server refuses writes whose `Origin` does not match the `Host`. This blocks other websites from sending input.
- To answer a prompt, the server reads the screen again and checks that the prompt is unchanged before it sends keys.
- herdr-watcher sends no telemetry and makes no outbound network requests.

These count as vulnerabilities:

- a way around the Host or Origin checks
- a way for a web page or another machine to send input without going through your tunnel
- path traversal in the static file server

Exposing the port without authentication is a deployment choice, not a vulnerability.

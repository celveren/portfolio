# GitHub Actions → Nginx VPS

The workflow builds on pushes to `master` and on manual runs from `master`. It uploads only the static site to a new release directory over SSH, then atomically changes `current`. Failed builds or uploads leave the active release untouched. No Node.js, Git checkout, Docker, sudo, or Nginx restart is needed during deployment.

Assumptions: a Linux VPS with Bash, GNU coreutils, rsync and OpenSSH; native Nginx serving static files; deployment branch `master`. The default base directory is `/var/www/celveren` and SSH port is `22`. Change the GitHub variables below for your server. If changing branch, update both the workflow trigger and job condition.

The supplied `NGINX-VPS.md` (inspected 2026-09-10) identifies the existing static site as `lightsage.dev`, with root `/var/www/html`, worker user `nginx`, and enabled configuration `/etc/nginx/sites-available/default`. These details supersede the earlier `/var/http/` assumption. The deployment targets that static site; the proxy sites and certificates require no changes. The documented hostname `web` may be local-only: use an SSH hostname or IP reachable from GitHub for `VPS_HOST`.

## One-time VPS setup

For Debian/Ubuntu, an administrator can run:

```sh
sudo apt-get update
sudo apt-get install -y rsync
sudo adduser --disabled-password --gecos '' deploy-celveren
sudo install -d -o deploy-celveren -g deploy-celveren -m 0755 /var/www/celveren
sudo install -d -o deploy-celveren -g deploy-celveren -m 0755 /var/www/celveren/releases
sudo install -d -o deploy-celveren -g deploy-celveren -m 0700 /home/deploy-celveren/.ssh
```

Use a dedicated account with no sudo privileges or Docker group membership. It should own only this site's deployment directory and its home directory. Adapt account creation/package installation for other distributions.

Skip account creation if `deploy-celveren` already exists. The `install -d` commands set ownership and mode on the named directories, including if they already exist. For this layout:

| Path | Owner | Mode/access |
| --- | --- | --- |
| `/var/www/celveren` and `releases` | `deploy-celveren:deploy-celveren` | `0755`; deployment user can create releases and replace `current` |
| Uploaded release directories | Deployment user | `0755`, set by the script |
| Uploaded static files | Deployment user | `0644`, set by the script |
| Parent directories `/var` and `/var/www` | Keep existing administrative ownership | Both deployment user and `nginx` need traversal (`x`) access |
| Nginx configuration and TLS keys | Keep existing administrative ownership | No deployment-user write access needed |

The `nginx` worker reads the public files through the other-read/execute bits; neither account needs membership in the other's group. Do not grant passwordless sudo or change ownership of all of `/var/www` or the existing `/var/www/html` tree. If parent directories have restrictive modes or ACLs, grant these two users traversal on the affected parent only. An administrator can inspect the full path with `namei -l /var/www/celveren/releases`.

After provisioning, these one-time checks verify access as each user:

```sh
sudo -u deploy-celveren test -w /var/www/celveren
sudo -u deploy-celveren test -x /var/www/celveren
sudo -u deploy-celveren test -w /var/www/celveren/releases
sudo -u deploy-celveren test -x /var/www/celveren/releases
sudo -u nginx test -x /var/www/celveren/releases
```

These administrative setup/check commands use sudo; the deployment scripts themselves never do. Subsequent static-file updates do not require an Nginx reload.

Generate a dedicated key on your trusted computer:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/celveren-actions -C celveren-github-actions -N ''
```

Install its **public** key in `/home/deploy-celveren/.ssh/authorized_keys`, prefixed with `restrict`:

```text
restrict ssh-ed25519 AAAA... celveren-github-actions
```

Set that file's owner to `deploy-celveren:deploy-celveren` and mode to `0600`. `restrict` disables forwarding and PTY allocation; the key still permits shell commands as this limited account. Do not use a root key, your personal key, or commit either key to the repository.

## GitHub configuration

Create a `production` environment under repository Settings → Environments. Restrict deployment branches to `master`, protect `master`, and require review for workflow/script changes. Environment protection availability depends on repository visibility and GitHub plan.

Add these **environment variables**:

| Name | Value |
| --- | --- |
| `VPS_HOST` | Server DNS hostname or IPv4 address (no URL scheme) |
| `VPS_USER` | `deploy-celveren` |
| `VPS_PORT` | SSH port; defaults to `22` |
| `VPS_PATH` | Base directory; defaults to `/var/www/celveren`, not the `current` subdirectory |
| `DEPLOYMENT_URL` | Set to `https://lightsage.dev` to link the site in GitHub's deployment history |

Add these **environment secrets**:

| Name | Value |
| --- | --- |
| `VPS_SSH_KEY` | Complete contents of the dedicated private key, including BEGIN/END lines |
| `VPS_KNOWN_HOSTS` | Verified SSH host-key entry for the VPS |

Obtain the host key through the provider console or another trusted connection. For example, the console command `cat /etc/ssh/ssh_host_ed25519_key.pub` prints the public host key. Construct the known-hosts entry using the exact `VPS_HOST`:

```text
your-vps.example.com ssh-ed25519 AAAA...host-public-key...
```

For a custom port, use `[your-vps.example.com]:2222` as the first field. Do not blindly trust an `ssh-keyscan` result: compare its fingerprint with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` from the trusted console. The workflow deliberately fails if the host key changes.

The VPS SSH port must be reachable from GitHub-hosted runners. If it is private or limited to fixed source IPs, arrange a private network connection or a runner with controlled egress; do not open SSH broadly just to make this workflow pass.

## GitHub Deployment API reporting

The workflow creates one production deployment for the exact commit SHA per run attempt using GitHub's REST Deployment API. It reports `pending` while building, `in_progress` before SSH upload, and `success` only after the release activation command completes. Build/upload errors report `failure`; cancellation reports `error` because the API has no cancelled state. Statuses link to the exact Actions run attempt and optionally to `DEPLOYMENT_URL`.

The built-in `GITHUB_TOKEN` has `contents: read` and `deployments: write`; no personal access token or extra GitHub secret is needed. `environment.deployment: false` prevents a second, automatic deployment record while retaining environment secrets, branch restrictions, required reviewers, and wait timers. Custom GitHub App deployment protection rules are incompatible with this option; this workflow assumes none are configured.

Deployment creation disables auto-merge and supplies `required_contexts: []`: it records the exact selected commit without waiting for separate commit status contexts. Protect `master` with your required checks before merging. Failed API creation or progress reporting stops the upload. Final reporting uses `always()` so ordinary failures and cancellations can be reported; runner loss, forced termination, timeouts, or an API outage can still leave a stale status. A final reporting failure fails the job but does not undo an already activated release. Deployment history records attempts, not a live health monitor; manual VPS rollback does not update GitHub automatically. Previous production records are retained without automatically marking them inactive.

See [Deployment API](https://docs.github.com/en/rest/deployments/deployments), [deployment statuses](https://docs.github.com/en/rest/deployments/statuses), and [environments without automatic deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments#using-environments-without-deployments).

## First deployment and Nginx cutover

Releases live in `/var/www/celveren/releases/` and Nginx will serve `/var/www/celveren/current/`. This is a sibling of the existing `/var/www/html` root, so preparing the first release does not publish release history through the existing site. If you already set the GitHub `VPS_PATH` variable, update it to `/var/www/celveren`; an existing variable overrides the workflow default.

Keep the existing site root while provisioning. Commit the workflow, script, and site build inputs (including `package.json` and `package-lock.json`), push to `master`, and confirm the deployment succeeds. This creates `/var/www/celveren/current` without modifying the existing web root.

After the first upload, confirm Nginx can read the release:

```sh
sudo -u nginx test -r /var/www/celveren/current/index.html
sudo -u nginx test -r /var/www/celveren/current/styles.css
sudo -u nginx test -r /var/www/celveren/current/assets/celveren-favicon.png
```

Back up the enabled site's definition outside the include tree and edit the actual configuration:

```sh
sudo cp -a --backup=numbered /etc/nginx/sites-available/default /root/celveren-nginx-default.before-deploy
sudoedit /etc/nginx/sites-available/default
```

In the HTTPS server block for `lightsage.dev`, replace `root /var/www/html;` with the following. Keep `index index.html;` and the existing missing-file/404 behavior:

```nginx
root /var/www/celveren/current;
index index.html;
```

Nginx must serve `current`, not the deployment base directory, which contains release history. Preserve the TLS directives, default rejection server and other sites. Editing `/home/frost/default` or `/etc/nginx/conf.d/default.conf` would have no effect according to the supplied notes. Ensure any `disable_symlinks` policy permits this release symlink. If `open_file_cache` is enabled, disable it for this site or account for delayed visibility after deployment.

```sh
sudo nginx -t && sudo systemctl reload nginx
```

Check `https://lightsage.dev/`, `/styles.css`, an image, and `/previews/`. Use HTTPS and the real hostname: the notes report that port 80 reaches the rejection server while the apex HTTP redirect listens on 81. For a local probe on the VPS that preserves TLS SNI, use `curl --fail --max-time 10 --resolve lightsage.dev:443:127.0.0.1 https://lightsage.dev/`. This deployment does not change that HTTP routing. Later updates require no reload. The workflow validates required files before activation; it does not perform a public HTTP health check or automatically roll back an application/content error. Requests spanning the switch can still load files from different releases because asset names are not content-hashed.

## Rollback and retention

Every release is named `COMMIT_SHA-RUN_ID-ATTEMPT`. Previous releases are retained, including incomplete uploads, so monitor disk usage and periodically remove old, inactive releases. Never remove the target of `current`; keep at least one known-good release.

Pause deployments and wait for any active run to finish before rollback. As the deployment user on the VPS, choose a complete known-good release from `ls /var/www/celveren/releases`, then run:

```sh
cd /var/www/celveren
ln -s releases/REPLACE_WITH_KNOWN_GOOD_RELEASE current-rollback
mv -Tf current-rollback current
```

Verify the live site. The next deployment will publish again; revert the faulty source commit on `master` to make the correction persist.

## Security choices

The workflow uses a GitHub token limited to reading contents and writing deployments, commit-pinned actions, no persisted checkout credentials, strict SSH host verification and serialized deployments. Keep action pins updated. Protect deployment code as carefully as the SSH key: code running in this job is trusted and can act as the deployment account.

For tighter isolation, a server-side pull service can fetch approved artifacts using an outbound connection, eliminating GitHub-held inbound SSH credentials. Short-lived SSH certificates are another option if you already operate an identity broker. For this static site, a dedicated unprivileged account is a practical starting point; a root-owned forced-command receiver can further limit it but must be designed to support both upload and activation.

References: [GitHub secure use guidance](https://docs.github.com/en/actions/reference/security/secure-use), [deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), and [OpenSSH authorized_keys options](https://man.openbsd.org/sshd.8).

#!/usr/bin/env python3
"""Report the VPS release lifecycle using the job's short-lived GitHub token."""

import json
import os
import sys
import urllib.error
import urllib.request


def post(endpoint, payload):
    url = f"{os.environ['GITHUB_API_URL']}/repos/{os.environ['GITHUB_REPOSITORY']}/{endpoint}"
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {os.environ['GH_TOKEN']}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2026-03-10",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    # Do not retry creation: an ambiguous response could create duplicate records.
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def status(deployment_id, state, description):
    if not str(deployment_id).isdigit():
        raise ValueError("Expected a numeric deployment ID")
    run_url = (
        f"{os.environ['GITHUB_SERVER_URL']}/{os.environ['GITHUB_REPOSITORY']}"
        f"/actions/runs/{os.environ['GITHUB_RUN_ID']}/attempts/{os.environ['GITHUB_RUN_ATTEMPT']}"
    )
    payload = {
        "state": state,
        "description": description,
        "log_url": run_url,
        "environment": "production",
        "auto_inactive": False,
    }
    if os.environ.get("DEPLOYMENT_URL"):
        payload["environment_url"] = os.environ["DEPLOYMENT_URL"]
    post(f"deployments/{deployment_id}/statuses", payload)
    print(f"Deployment {deployment_id}: {state}")


def main(command):
    if command == "create":
        deployment = post("deployments", {
            "ref": os.environ["GITHUB_SHA"],
            "environment": "production",
            "auto_merge": False,
            "required_contexts": [],
            "production_environment": True,
            "transient_environment": False,
            "description": "Deploy static website to VPS",
            "payload": {
                "run_id": os.environ["GITHUB_RUN_ID"],
                "run_attempt": os.environ["GITHUB_RUN_ATTEMPT"],
            },
        })
        deployment_id = deployment["id"]
        if not str(deployment_id).isdigit():
            raise ValueError("GitHub did not return a numeric deployment ID")
        # Persist before posting pending so finalization can handle a status error.
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
            output.write(f"deployment_id={deployment_id}\n")
        status(deployment_id, "pending", "Building static website")
    elif command == "in_progress":
        status(os.environ["DEPLOYMENT_ID"], "in_progress", "Uploading and activating VPS release")
    elif command == "finish":
        state, description = {
            "success": ("success", "VPS release activated successfully"),
            "failure": ("failure", "Build or deployment failed; see Actions logs"),
            # The Deployment API has no cancelled state.
            "cancelled": ("error", "Run cancelled; verify the active VPS release"),
        }[os.environ["DEPLOYMENT_RESULT"]]
        if state == "success":
            cache_result = os.environ.get("CACHE_RESULT")
            if cache_result == "success":
                description = "Deployment successful; Cloudflare cache purged"
            elif cache_result:
                description = "Deployment successful; failed to refresh Cloudflare cache"
                print(f"::warning title=Cache refresh failed::{description}. The new release remains active.")
            if os.environ.get("GITHUB_STEP_SUMMARY"):
                with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
                    summary.write(f"## Deployment result\n\n{description}.\n")
        status(os.environ["DEPLOYMENT_ID"], state, description)
    else:
        raise ValueError("Use create, in_progress, or finish")


if __name__ == "__main__":
    try:
        main(sys.argv[1])
    except urllib.error.HTTPError as error:
        # Avoid dumping request headers, tokens, or arbitrary response bodies.
        sys.exit(f"GitHub Deployment API returned HTTP {error.code}")

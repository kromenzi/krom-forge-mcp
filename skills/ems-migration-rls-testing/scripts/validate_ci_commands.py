#!/usr/bin/env python3
"""Reject obvious CI placeholders before adapters can emit passed receipts.

This is a static guard, not proof that a test is semantically secure. Real proof
still requires the repository command, raw artifacts, and a GitHub Actions run.
"""
import argparse
import json
import re
import sys

RULES = {
    "RLS": (r"(pytest|unittest|npm|pnpm|yarn|npx|bun|cargo|go\s+test|mvn|gradle|python).*", r"(rls|row[_ -]?level|tenant|policy|row_security|cross[_ -]?tenant)"),
    "REST": (r"(pytest|unittest|npm|pnpm|yarn|npx|bun|cargo|go\s+test|mvn|gradle|python).*", r"(rest|api|http|endpoint|playwright|postman)"),
    "Storage": (r"(pytest|unittest|npm|pnpm|yarn|npx|bun|cargo|go\s+test|mvn|gradle|python).*", r"(storage|bucket|object|upload|download)"),
    "Migration": (r"(pytest|unittest|npm|pnpm|yarn|npx|bun|cargo|go\s+test|mvn|gradle|python).*", r"(migration|migrate|schema|supabase\s+db|rollback|lineage)"),
}
PLACEHOLDERS = {"true", ":", "echo", "printf", "exit 0", "pass"}


def validate(commands, rules=None):
    issues = []
    if not isinstance(commands, dict):
        return ["commands must be an object keyed by RLS, REST, Storage, and Migration"]
    for area, (runner_pattern, domain_pattern) in (rules or RULES).items():
        raw = commands.get(area)
        command = str(raw or "").strip()
        normalized = re.sub(r"\s+", " ", command).lower()
        if not command:
            issues.append(f"{area}: command is missing")
            continue
        if normalized in PLACEHOLDERS or normalized.startswith("echo ") or normalized.startswith("printf "):
            issues.append(f"{area}: placeholder or non-test command is not allowed")
        if not re.search(runner_pattern, normalized):
            issues.append(f"{area}: command does not look like a supported test runner")
        if not re.search(domain_pattern, normalized):
            issues.append(f"{area}: command does not identify the expected test domain")
    return issues


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--json", help="JSON object containing commands"); parser.add_argument("--area", choices=list(RULES)); parser.add_argument("--command"); parser.add_argument("--rls"); parser.add_argument("--rest"); parser.add_argument("--storage"); parser.add_argument("--migration")
    args = parser.parse_args()
    commands = {args.area: args.command} if args.area else (json.loads(args.json) if args.json else {"RLS": args.rls, "REST": args.rest, "Storage": args.storage, "Migration": args.migration})
    issues = validate(commands, {args.area: RULES[args.area]} if args.area else None)
    if issues:
        for issue in issues: print(issue, file=sys.stderr)
        return 2
    print("CI_COMMAND_SHAPE_OK")
    return 0

if __name__ == "__main__": raise SystemExit(main())

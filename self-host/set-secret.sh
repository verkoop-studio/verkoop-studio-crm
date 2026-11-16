#!/usr/bin/env bash
#
# Ask for one secret, put it in the env file, and send it to the service that
# needs it.
#
#   ./self-host/set-secret.sh SMTP_PASS
#
# The value is typed at a prompt, never passed as an argument and never echoed,
# so it stays out of the shell history, out of `ps`, and out of any log.
#
# This exists because the one-liner it replaces — `read -rs K && ...` — is
# silent in a way that looks exactly like a hung command: no dots, no cursor
# movement, nothing. Twice now that has read as "it did not work" when the
# truth was "it is waiting for you".

set -euo pipefail

ENV_FILE="${ENV_FILE:-self-host/.env.production}"

# Which service each secret belongs to, and what it is called there. One table
# rather than three arguments, because the answer is a fact about the stack and
# not something to be remembered at the prompt.
case "${1:-}" in
  SMTP_PASS)                   SERVICE=auth    REMOTE=GOTRUE_SMTP_PASS ;;
  BACKUP_S3_ACCESS_KEY_ID)     SERVICE=backup  REMOTE=BACKUP_S3_ACCESS_KEY_ID ;;
  BACKUP_S3_SECRET_ACCESS_KEY) SERVICE=backup  REMOTE=BACKUP_S3_SECRET_ACCESS_KEY ;;
  "")
    echo "Usage: $0 <SMTP_PASS|BACKUP_S3_ACCESS_KEY_ID|BACKUP_S3_SECRET_ACCESS_KEY>" >&2
    exit 1 ;;
  *)
    echo "$1 is not one of the secrets this knows where to put." >&2
    echo "Add it to the table at the top of $0, or set it by hand." >&2
    exit 1 ;;
esac
NAME="$1"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No $ENV_FILE. Run: node self-host/keys.mjs --out $ENV_FILE" >&2
  exit 1
fi

echo "Setting $NAME — it goes to the $SERVICE service as $REMOTE."
echo "Paste it and press enter. Nothing will appear as you type; that is the point."
printf '  %s: ' "$NAME"
IFS= read -rs value
echo

# A paste often brings a newline, a stray space, or the quotes someone copied
# along with it. None of those belong in the value, and all of them produce an
# authentication failure that looks like a wrong key.
trim() {
  local v="$1"
  v="${v#"${v%%[![:space:]]*}"}"
  printf '%s' "${v%"${v##*[![:space:]]}"}"
}
# Trim, then unquote, then trim again: a pasted value often arrives as
#   "  key  "
# and stripping the quotes only uncovers more whitespace. One pass leaves it in.
value="$(trim "$value")"
value="${value%\"}"; value="${value#\"}"
value="${value%\'}"; value="${value#\'}"
value="$(trim "$value")"

if [[ -z "$value" ]]; then
  echo "Nothing was entered. Nothing changed." >&2
  exit 1
fi

# Enough to recognise a bad paste, not enough to be worth reading over anyone's
# shoulder or keeping in a screenshot.
printf 'Read %d characters, starting %s and ending %s.\n' \
  "${#value}" "${value:0:3}…" "…${value: -2}"
printf 'Send it to %s? [y/N] ' "$SERVICE"
read -r answer
case "$answer" in
  y|Y|yes|YES) : ;;
  *) echo "Left alone. Nothing changed."; exit 1 ;;
esac

# Replace rather than append. The push script reads the FIRST line matching a
# name, so a second one is invisible and the old value wins — which is its own
# afternoon of wondering why the key you just set is not the key being used.
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
grep -v "^${NAME}=" "$ENV_FILE" > "$tmp" || true
printf '%s=%s\n' "$NAME" "$value" >> "$tmp"
cat "$tmp" > "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "  written to $ENV_FILE"

printf '%s' "$value" | railway variables --service "$SERVICE" --skip-deploys --set-from-stdin "$REMOTE" >/dev/null
echo "  set $REMOTE on $SERVICE"
unset value

printf 'Redeploy %s now? [y/N] ' "$SERVICE"
read -r answer
case "$answer" in
  y|Y|yes|YES)
    railway redeploy --service "$SERVICE" --yes >/dev/null
    echo "  redeploying $SERVICE" ;;
  *)
    echo "  not redeployed — $SERVICE keeps the old value until you do" ;;
esac

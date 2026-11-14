#!/usr/bin/env bash
#
# Put a local env file onto a Railway service, without the values ever being
# typed, pasted, or appearing in a shell history.
#
#   node self-host/keys.mjs > self-host/.env.production   # then add the rest
#   ./self-host/railway-variables.sh db self-host/.env.production
#
# Each value goes to Railway through stdin, one at a time, so it is never an
# argument: not in `ps`, not in the history file, not in a log. The file itself
# is covered by the repository's .gitignore (`.env.*`, minus `.env.example`).
#
# Which variables a service gets is decided here rather than by hand, because
# "the storage service also has the service role key" is the kind of thing that
# is obvious on the day and not six months later.

set -euo pipefail

SERVICE="${1:-}"
ENV_FILE="${2:-self-host/.env.production}"

if [[ -z "$SERVICE" ]]; then
  echo "Usage: $0 <db|auth|rest|storage|kong|backup> [env file]" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No such file: $ENV_FILE" >&2
  exit 1
fi

# What each service needs, and nothing more. A service that cannot read a
# secret cannot leak it.
case "$SERVICE" in
  db)      KEYS="POSTGRES_PASSWORD JWT_SECRET AUTH_DB_PASSWORD STORAGE_DB_PASSWORD AUTHENTICATOR_DB_PASSWORD SUPABASE_ADMIN_DB_PASSWORD" ;;
  auth)    KEYS="JWT_SECRET AUTH_DB_PASSWORD PUBLIC_API_URL SITE_URL URI_ALLOW_LIST MAILER_EXTERNAL_HOSTS MAILER_AUTOCONFIRM SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_SENDER SMTP_SENDER_NAME TEMPLATE_BASE_URL" ;;
  rest)    KEYS="JWT_SECRET AUTHENTICATOR_DB_PASSWORD" ;;
  storage) KEYS="JWT_SECRET ANON_KEY SERVICE_ROLE_KEY STORAGE_DB_PASSWORD STORAGE_BACKEND S3_BUCKET" ;;
  kong)    KEYS="" ;;
  backup)  KEYS="SUPABASE_ADMIN_DB_PASSWORD BACKUP_S3_ENDPOINT BACKUP_S3_BUCKET BACKUP_S3_ACCESS_KEY_ID BACKUP_S3_SECRET_ACCESS_KEY BACKUP_S3_REGION BACKUP_PREFIX BACKUP_KEEP_DAYS" ;;
  *) echo "Unknown service: $SERVICE" >&2; exit 1 ;;
esac

if [[ -z "$KEYS" ]]; then
  echo "$SERVICE takes no variables from this file."
  exit 0
fi

sent=0
missing=()
for key in $KEYS; do
  # Read the value without letting the shell expand anything in it, and
  # without echoing it.
  value="$(awk -v k="$key" -F= '$1 == k { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE")"
  if [[ -z "$value" ]]; then
    missing+=("$key")
    continue
  fi
  printf '%s' "$value" | railway variables --service "$SERVICE" --skip-deploys --set-from-stdin "$key" >/dev/null
  echo "  set $key"
  sent=$((sent + 1))
done

echo "$sent variable(s) on $SERVICE."
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Not in $ENV_FILE, so not set: ${missing[*]}" >&2
  exit 1
fi
echo "Deploys were skipped. Redeploy $SERVICE when every variable it needs is in place."

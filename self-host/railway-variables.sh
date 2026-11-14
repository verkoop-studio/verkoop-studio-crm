#!/usr/bin/env bash
#
# Put a local env file onto a Railway service, without the values ever being
# typed, pasted, or appearing in a shell history.
#
#   node self-host/keys.mjs --out self-host/.env.production   # then add the rest
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
  echo "Usage: $0 <db|auth|rest|storage|kong|migrate|backup> [env file]" >&2
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
  auth)    KEYS="" ;;
  rest)    KEYS="" ;;
  storage) KEYS="" ;;
  kong)    KEYS="" ;;
  migrate) KEYS="" ;;
  backup)  KEYS="SUPABASE_ADMIN_DB_PASSWORD BACKUP_S3_ENDPOINT BACKUP_S3_BUCKET BACKUP_S3_ACCESS_KEY_ID BACKUP_S3_SECRET_ACCESS_KEY BACKUP_S3_REGION BACKUP_PREFIX BACKUP_KEEP_DAYS" ;;
  *) echo "Unknown service: $SERVICE" >&2; exit 1 ;;
esac

# Values the services need that are not in the file, because they are made of
# other values: a connection string is a password with a hostname around it.
# Building them here keeps the one copy of "which user does auth connect as"
# next to the one copy of "which user does storage connect as", instead of in
# five web forms.
val() { awk -v k="$1" -F= '$1 == k { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"; }

composed() {
  case "$SERVICE" in
    auth)
      echo "GOTRUE_API_HOST=::"
      echo "GOTRUE_API_PORT=9999"
      echo "GOTRUE_DB_DRIVER=postgres"
      echo "GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:$(val AUTH_DB_PASSWORD)@db.railway.internal:5432/postgres?search_path=auth&sslmode=disable"
      echo "GOTRUE_JWT_SECRET=$(val JWT_SECRET)"
      echo "GOTRUE_JWT_EXP=3600"
      echo "GOTRUE_JWT_AUD=authenticated"
      echo "GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated"
      echo "API_EXTERNAL_URL=$(val PUBLIC_API_URL)"
      echo "GOTRUE_SITE_URL=$(val SITE_URL)"
      echo "GOTRUE_URI_ALLOW_LIST=$(val URI_ALLOW_LIST)"
      echo "GOTRUE_MAILER_EXTERNAL_HOSTS=$(val MAILER_EXTERNAL_HOSTS)"
      echo "GOTRUE_DISABLE_SIGNUP=false"
      echo "GOTRUE_MAILER_AUTOCONFIRM=$(val MAILER_AUTOCONFIRM)"
      echo "GOTRUE_EXTERNAL_EMAIL_ENABLED=true"
      echo "GOTRUE_EXTERNAL_PHONE_ENABLED=false"
      echo "GOTRUE_SMTP_HOST=$(val SMTP_HOST)"
      echo "GOTRUE_SMTP_PORT=$(val SMTP_PORT)"
      echo "GOTRUE_SMTP_USER=$(val SMTP_USER)"
      echo "GOTRUE_SMTP_PASS=$(val SMTP_PASS)"
      echo "GOTRUE_SMTP_ADMIN_EMAIL=$(val SMTP_SENDER)"
      echo "GOTRUE_SMTP_SENDER_NAME=$(val SMTP_SENDER_NAME)"
      for pair in "CONFIRMATION:confirm-signup:Bevestig je e-mailadres" \
                  "RECOVERY:reset-password:Kies een nieuw wachtwoord" \
                  "MAGIC_LINK:magic-link:Je aanmeldlink" \
                  "INVITE:invite:Je bent uitgenodigd" \
                  "EMAIL_CHANGE:email-change:Bevestig je nieuwe e-mailadres"; do
        name=${pair%%:*}; rest=${pair#*:}; file=${rest%%:*}; subject=${rest#*:}
        echo "GOTRUE_MAILER_TEMPLATES_${name}=$(val TEMPLATE_BASE_URL)/${file}.html"
        echo "GOTRUE_MAILER_SUBJECTS_${name}=${subject} · Verkoop Studio Sales"
      done
      ;;
    rest)
      echo "PGRST_DB_URI=postgres://authenticator:$(val AUTHENTICATOR_DB_PASSWORD)@db.railway.internal:5432/postgres"
      echo "PGRST_JWT_SECRET=$(val JWT_SECRET)"
      echo "PGRST_APP_SETTINGS_JWT_SECRET=$(val JWT_SECRET)"
      echo "PGRST_DB_SCHEMAS=public,storage"
      echo "PGRST_DB_ANON_ROLE=anon"
      echo "PGRST_DB_USE_LEGACY_GUCS=false"
      # * is both stacks. !4 is IPv4 only, which on Railway means the gateway
      # cannot reach it at all — the private network has no A records.
      echo "PGRST_SERVER_HOST=*"
      ;;
    storage)
      echo "DATABASE_URL=postgres://supabase_storage_admin:$(val STORAGE_DB_PASSWORD)@db.railway.internal:5432/postgres"
      echo "POSTGREST_URL=http://rest.railway.internal:3000"
      echo "ANON_KEY=$(val ANON_KEY)"
      echo "SERVICE_KEY=$(val SERVICE_ROLE_KEY)"
      echo "PGRST_JWT_SECRET=$(val JWT_SECRET)"
      echo "AUTH_JWT_SECRET=$(val JWT_SECRET)"
      echo "FILE_SIZE_LIMIT=52428800"
      echo "TENANT_ID=verkoop"
      echo "REGION=$(val STORAGE_REGION)"
      echo "STORAGE_BACKEND=$(val STORAGE_BACKEND)"
      echo "GLOBAL_S3_BUCKET=$(val S3_BUCKET)"
      echo "FILE_STORAGE_BACKEND_PATH=/var/lib/storage"
      # Same reason, and the port: left alone this picks up Railway's PORT and
      # listens on 8080 over IPv4, while the gateway is looking for :5000 on a
      # v6 address.
      echo "SERVER_HOST=::"
      echo "SERVER_PORT=5000"
      ;;
    migrate)
      echo "MIGRATE_DATABASE_URL=postgres://supabase_admin:$(val SUPABASE_ADMIN_DB_PASSWORD)@db.railway.internal:5432/postgres"
      ;;
  esac
}

sent=0
missing=()
empty=()
while IFS= read -r line; do
  [ -z "$line" ] && continue
  key=${line%%=*}
  value=${line#*=}
  # An empty value is a variable that has not been decided yet — an S3 bucket
  # before there is one, an SMTP password someone else has to paste. Railway
  # refuses an empty value outright, which would stop the whole push on the
  # first one. Skip it and say so, so the other thirty still land.
  if [ -z "$value" ]; then
    echo "  skipped $key (no value in $ENV_FILE)"
    empty+=("$key")
    continue
  fi
  printf '%s' "$value" | railway variables --service "$SERVICE" --skip-deploys --set-from-stdin "$key" >/dev/null
  echo "  set $key"
  sent=$((sent + 1))
done <<EOF_COMPOSED
$(composed)
EOF_COMPOSED

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
if [[ ${#empty[@]:-0} -gt 0 ]]; then
  echo "Left unset because $ENV_FILE has no value for them: ${empty[*]}"
fi
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Not in $ENV_FILE, so not set: ${missing[*]}" >&2
  exit 1
fi
echo "Deploys were skipped. Redeploy $SERVICE when every variable it needs is in place."

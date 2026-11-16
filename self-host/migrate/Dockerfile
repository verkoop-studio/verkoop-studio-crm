# The migration runner: psql, the migrations, and nothing else.
#
# It exists so that applying the schema does not require putting the database
# on the public internet. It runs as a service in the same project, reaches
# db.railway.internal over the private network, and is safe to run again.
FROM alpine:3.21
RUN apk add --no-cache postgresql17-client bash
COPY supabase/migrations/ /migrations/
COPY self-host/migrate/apply.sh /apply.sh
RUN chmod +x /apply.sh
CMD ["/apply.sh"]

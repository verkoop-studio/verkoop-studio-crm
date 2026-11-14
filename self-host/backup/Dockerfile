# The backup job. Node for the S3 half, the Postgres client for the other.
#
# The client's major version must be at least the server's: pg_dump refuses to
# dump a server newer than itself, and finding that out from a cron log at two
# in the morning is the wrong time. The database runs Postgres 17.
FROM node:22-alpine
RUN apk add --no-cache postgresql17-client
WORKDIR /app
COPY . /app/
# Nothing to install. These scripts have no dependencies on purpose: the job
# whose point is to work on the worst day should not need a registry.
CMD ["node", "/app/backup.mjs"]

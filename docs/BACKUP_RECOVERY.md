# D1 backup and recovery

Local and production data are distinct. Never reset production to rerun tests.

Before approved production migrations, document the database ID, schema version, export location and recovery owner. After approval use Cloudflare D1 export tooling (`wrangler d1 export <database> --remote --env production --output <secure-path>`). Exports contain personal data: encrypt them, restrict access, keep them outside Git and define retention with the owner.

Cloudflare D1 recovery capabilities and retention depend on the configured account/service; verify the current official recovery documentation and account settings at deployment time. Do not claim a recovery window that has not been checked.

Practice restoring an export into a separate disposable database, not the live database. Verify schema, record counts, referential integrity, published content and authentication behavior. Session tokens should be invalidated after recovery. Record elapsed recovery time and any lost events without promising unmeasured RPO/RTO targets.

Rollback of a Worker release does not automatically roll back database migrations. Prefer additive compatible migrations. Destructive schema/data changes need a separate approval, validated backup and tested restoration plan.
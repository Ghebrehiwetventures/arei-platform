# Supabase Security Cleanup Before AREI Pulse

Date: 2026-05-02

Migration: `migrations/028_supabase_security_advisor_cleanup.sql`

## Scope

This cleanup targets Supabase Security Advisor warnings that can affect AREI
Admin and the KazaVerde public feed.

It intentionally avoids AREI Pulse feature code, listing data changes, feed
contract changes, and public feed removal.

## Fixed

### Security Definer Views

The migration sets `security_invoker = true` on these views:

- `public.v1_feed_cv`
- `public.v1_feed_cv_pre_terra_cohort_rollback_20260401`
- `public.v1_feed_cv_indexable`

This keeps view reads subject to the caller's privileges and underlying RLS
instead of silently bypassing them through the view owner.

The migration also preserves public feed grants:

- `GRANT SELECT ON public.v1_feed_cv TO anon, authenticated`
- `GRANT SELECT ON public.v1_feed_cv_indexable TO anon, authenticated`

### Function Search Path Mutable

The migration pins the RPC search path without changing the function body or
return shape:

```sql
ALTER FUNCTION IF EXISTS public.get_source_quality_stats()
  SET search_path = public, pg_temp;
```

This is the minimal fix for `public.get_source_quality_stats` and should keep
AREI Admin source-health reads working.

### content_drafts RLS Cleanup

`content_drafts` is currently used from `arei-admin/data.ts` through the anon
Supabase data client in `arei-admin/supabase.ts`.

Because of that, removing anon `SELECT`, `INSERT`, or `UPDATE` in this PR would
break the existing admin content draft workflow.

The migration does remove stale broader access from the older migration:

- drops `content_drafts_select_all`
- drops `content_drafts_insert_all`
- drops `content_drafts_update_all`
- revokes `SELECT`, `INSERT`, `UPDATE` from `authenticated`

## Intentionally Left Unchanged

The anon `content_drafts_*_anon` policies remain in place because they are
required by the current production admin flow. This remains a known hardening
item: moving content draft writes behind authenticated server-side admin routes
would allow anon write access to be removed later.

No listing rows, feed filters, feed columns, or Pulse feature code are changed.

## Preflight SQL

Run before applying the migration in production:

```sql
select count(*) as before_count
from public.v1_feed_cv;

select *
from public.v1_feed_cv
limit 5;

select n.nspname, c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('listings', 'ingest_runs');

select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'listings',
    'ingest_runs',
    'v1_feed_cv',
    'v1_feed_cv_pre_terra_cohort_rollback_20260401',
    'v1_feed_cv_indexable'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

## Postflight SQL

Run after applying the migration in production:

```sql
select count(*) as after_count
from public.v1_feed_cv;

select *
from public.v1_feed_cv
limit 5;

select *
from public.get_source_quality_stats()
limit 5;

select c.relname, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'v1_feed_cv',
    'v1_feed_cv_pre_terra_cohort_rollback_20260401',
    'v1_feed_cv_indexable'
  );

select polname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'content_drafts'
order by polname;
```

## Acceptance Checks

- `before_count` and `after_count` for `public.v1_feed_cv` match.
- `select * from public.v1_feed_cv limit 5` succeeds with the anon role.
- KazaVerde listing pages still load public listings.
- AREI Admin source health still loads `get_source_quality_stats`.
- Supabase Security Advisor no longer reports the three feed views as Security
  Definer View warnings.
- Supabase Security Advisor no longer reports `public.get_source_quality_stats`
  as Function Search Path Mutable.

## Pulse Activation

AREI Pulse can proceed after this migration if the postflight checks pass.

Remaining known risk: `content_drafts` still allows anon admin draft reads and
writes because the current admin implementation depends on that. That should be
addressed in a separate admin-auth/server-route hardening PR, not mixed into
the feed security cleanup.

-- Admin stats RPC.
--
-- Replaces the JS-side aggregation in /api/admin/stats which previously
-- pulled the full applications + analyses + interviews tables into the
-- function and reduced in-memory. That worked at ~100 rows but won't
-- scale; this RPC pushes all COUNT/AVG/GROUP BY work into Postgres so
-- only a single JSONB blob crosses the wire.

create or replace function admin_stats_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  status_counts jsonb;
  source_counts jsonb;
  by_month      jsonb;
  score_hist    jsonb;
  total         integer;
  funnel        jsonb;
  iv_avg        numeric;
  iv_flags      integer;
  iv_count      integer;
begin
  -- Status counts (jsonb { status: count })
  select coalesce(jsonb_object_agg(status, c), '{}'::jsonb)
  into status_counts
  from (
    select status::text as status, count(*)::int as c
    from applications
    where deleted_at is null
    group by status
  ) s;

  -- Source counts
  select coalesce(jsonb_object_agg(source, c), '{}'::jsonb)
  into source_counts
  from (
    select source::text as source, count(*)::int as c
    from applications
    where deleted_at is null
    group by source
  ) s;

  -- Applications per YYYY-MM
  select coalesce(jsonb_object_agg(month, c), '{}'::jsonb)
  into by_month
  from (
    select to_char(created_at, 'YYYY-MM') as month, count(*)::int as c
    from applications
    where deleted_at is null
    group by 1
    order by 1
  ) s;

  -- Total active applications
  select count(*)::int into total
  from applications where deleted_at is null;

  -- Funnel: cumulative counts for each downstream status. Encoded as a
  -- jsonb object so the API layer doesn't have to know the status order.
  funnel := jsonb_build_object(
    'applied', total,
    'verified', (
      select count(*)::int from applications
      where deleted_at is null
        and status in ('verified','cv_uploaded','analyzed_pending_review',
                       'analyzed_auto_invited','analyzed_auto_rejected',
                       'analyzed_manual_approved','analyzed_manual_rejected',
                       'interview_started','interview_completed')
    ),
    'cv_uploaded', (
      select count(*)::int from applications
      where deleted_at is null
        and status in ('cv_uploaded','analyzed_pending_review',
                       'analyzed_auto_invited','analyzed_auto_rejected',
                       'analyzed_manual_approved','analyzed_manual_rejected',
                       'interview_started','interview_completed')
    ),
    'analyzed', (
      select count(*)::int from applications
      where deleted_at is null
        and status in ('analyzed_pending_review','analyzed_auto_invited',
                       'analyzed_auto_rejected','analyzed_manual_approved',
                       'analyzed_manual_rejected','interview_started',
                       'interview_completed')
    ),
    'invited', (
      select count(*)::int from applications
      where deleted_at is null
        and status in ('analyzed_auto_invited','analyzed_manual_approved',
                       'interview_started','interview_completed')
    ),
    'interview_completed',
      coalesce((status_counts->>'interview_completed')::int, 0)
  );

  -- CV score distribution: 10-bin array indexed 1..10
  select coalesce(jsonb_agg(c order by bin), '[]'::jsonb)
  into score_hist
  from (
    select b.bin,
           coalesce(sum(case when a.score = b.bin then 1 else 0 end), 0)::int as c
    from generate_series(1, 10) as b(bin)
    left join analyses a on a.score = b.bin
    group by b.bin
  ) s;

  -- Interview metrics
  select coalesce(avg(global_score), null), coalesce(sum(coalesce(flags,0))::int, 0), count(*)::int
  into iv_avg, iv_flags, iv_count
  from interviews
  where global_score is not null;

  return jsonb_build_object(
    'total', total,
    'funnel', funnel,
    'status_counts', status_counts,
    'source_counts', source_counts,
    'by_month', by_month,
    'cv_score_histogram', score_hist,
    'interview_avg_score', iv_avg,
    'interview_flags_total', iv_flags,
    'interviews_completed', iv_count
  );
end;
$$;

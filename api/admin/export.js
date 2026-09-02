// GET /api/admin/export?type=applications|interviews
//
// CSV export for admin/reports.

const { supabaseAdmin } = require('../../lib/supabase');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

module.exports.default = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  const type = req.query?.type || 'applications';
  const positionId = req.query?.position_id;
  if (positionId && !UUID_RE.test(positionId)) {
    return res.status(400).json({ error: 'invalid_position' });
  }

  try {
    if (type === 'applications') {
      let q = supabaseAdmin
        .from('applications')
        .select(`
          id, email, name, status, source, experience,
          consent_privacy, consent_ai_decision, requested_human_review,
          utm_source, utm_medium, utm_campaign,
          created_at, verified_at, cv_uploaded_at, analyzed_at,
          interview_completed_at, positions(slug, title)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (positionId) q = q.eq('position_id', positionId);
      const { data } = await q;

      const cols = ['id', 'email', 'name', 'position', 'status', 'source', 'experience', 'consent_privacy', 'consent_ai_decision', 'requested_human_review', 'utm_source', 'utm_medium', 'utm_campaign', 'created_at', 'verified_at', 'cv_uploaded_at', 'analyzed_at', 'interview_completed_at'];
      const rows = [cols.join(',')];
      for (const r of data || []) {
        const row = { ...r, position: r.positions?.slug || '' };
        rows.push(cols.map(c => csvEscape(row[c])).join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="applications_${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.status(200).send(rows.join('\n'));
    }

    if (type === 'interviews') {
      let q = supabaseAdmin
        .from('interviews')
        .select('id, application_id, global_score, flags, answers_count, skipped_count, total_time_sec, verdict, recommendation, final_score, salary, source, completed_at, applications!inner(email, name, position_id, positions(slug))')
        .order('completed_at', { ascending: false });
      if (positionId) q = q.eq('applications.position_id', positionId);
      const { data } = await q;

      const cols = ['id', 'application_id', 'email', 'name', 'position', 'global_score', 'flags', 'answers_count', 'skipped_count', 'total_time_sec', 'verdict', 'recommendation', 'final_score', 'salary', 'source', 'completed_at'];
      const rows = [cols.join(',')];
      for (const r of data || []) {
        const row = {
          ...r,
          email: r.applications?.email || '',
          name: r.applications?.name || '',
          position: r.applications?.positions?.slug || '',
        };
        rows.push(cols.map(c => csvEscape(row[c])).join(','));
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="interviews_${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.status(200).send(rows.join('\n'));
    }

    return res.status(400).json({ error: 'invalid_type' });
  } catch (e) {
    console.error('[admin/export] error:', e.message);
    return res.status(500).json({ error: 'internal_error' });
  }
};

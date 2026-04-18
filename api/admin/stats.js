// GET /api/admin/stats
//
// Aggregates funnel + distribution metrics for /reports. All heavy lifting
// (COUNT/GROUP BY/AVG) runs inside the `admin_stats_summary()` RPC so the
// row volume never crosses the wire — stats endpoint stays constant-time
// w.r.t. application count.

const { supabaseAdmin } = require('../../lib/supabase');

module.exports.default = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });

  try {
    const { data, error } = await supabaseAdmin.rpc('admin_stats_summary');
    if (error) throw error;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data || {});
  } catch (e) {
    console.error('[admin/stats] error:', e.message);
    return res.status(500).json({ error: 'internal_error' });
  }
};

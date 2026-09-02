// Interview AI analysis. Shared between /api/submit-interview (inline on finish)
// and /api/admin/reanalyze-interview (manual re-run by admin).
//
// Produces HTML (no html/body/head) for display in /reports and admin.

const MODEL = 'claude-sonnet-4-20250514';

// No fallback prompt on purpose — see lib/cv-analysis.js. The grading prompt
// always comes from positions.interview_system_prompt.

function safe(s) {
  return String(s || '').replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' })[c]);
}
function stripXmlBreakout(s) {
  return String(s || '').replace(/<\/?interview_responses>/gi, '');
}

// Input: { name, experience, summaryText, signalAbort }
// summaryText: multi-line "[Block] question\nRespuesta: ...\nTiempo: X:YY"
async function analyzeInterview({ name, experience, summaryText, signal, systemPrompt = null }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: 'missing_api_key' };
  if (!summaryText) return { ok: false, error: 'missing_summary' };
  if (typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
    return { ok: false, error: 'missing_system_prompt' };
  }
  const sysPrompt = systemPrompt;

  const userContent = `CANDIDATO: ${safe(name)}
EXPERIENCIA DECLARADA: ${safe(experience || '')}

<interview_responses>
${stripXmlBreakout(String(summaryText).slice(0, 50000))}
</interview_responses>`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: sysPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, error: err.error?.message || `api_error_${resp.status}` };
    }
    const data = await resp.json();
    const html = data.content?.find(c => c.type === 'text')?.text || '';
    return { ok: true, html, model: MODEL };
  } catch (e) {
    return { ok: false, error: e.message || 'network_error' };
  }
}

module.exports = { analyzeInterview, MODEL };

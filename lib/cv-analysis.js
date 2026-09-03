// CV analysis via Claude. Pure function — no DB side effects.
//
// Input: { fileBase64, filename }
// Output: { ok, name, email, score, recommendation, summary, raw, model }

// claude-sonnet-4-20250514 was retired (API now returns not_found). Model is
// overridable via env so a future retirement is a config change, not a deploy.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

// There is deliberately NO fallback prompt. Every application is pinned to a
// position whose `cv_analysis_prompt` is NOT NULL and validated non-empty, so
// a missing prompt means a data bug — fail loud rather than silently grade a
// finance candidate as a Head of Engineering.

function extractFallback(text) {
  const email = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] || '';
  const name = text.match(/"name"\s*:\s*"([^"]+)"/)?.[1] || '';
  return { name, email, fit_score: 1, fit_recommendation: 'revisar', fit_summary: 'No se pudo analizar el CV automaticamente.' };
}

// reviewThreshold: the position's min_score_to_invite — scores below it are
// labelled 'descartar' so the admin label matches the routing decision.
async function analyzeCv({ fileBase64, filename, systemPrompt = null, reviewThreshold = 4 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: 'missing_api_key' };
  if (!fileBase64) return { ok: false, error: 'missing_file' };
  if (typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
    return { ok: false, error: 'missing_system_prompt' };
  }
  const sysPrompt = systemPrompt;

  const isPDF = String(fileBase64).startsWith('JVBERi0') || String(filename || '').toLowerCase().endsWith('.pdf');

  const content = [
    isPDF
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
      : { type: 'text', text: `Filename: ${String(filename || '').slice(0, 255)}` },
    { type: 'text', text: 'Analiza este CV segun las instrucciones del sistema. Responde SOLO con el JSON.' },
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        // Thinking tokens count toward max_tokens on current models; the JSON
        // answer itself is ~150 tokens. Low effort keeps latency well inside
        // the 60 s function budget.
        max_tokens: 4000,
        output_config: { effort: 'low' },
        system: sysPrompt,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, error: err.error?.message || `api_error_${response.status}` };
    }

    const data = await response.json();
    const text = data.content?.find(c => c.type === 'text')?.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      parsed = extractFallback(text);
    }

    const name = String(parsed.name || '').slice(0, 100).replace(/[<>"'&]/g, '');
    const email = String(parsed.email || '').slice(0, 254);
    const emailRx = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const safeEmail = emailRx.test(email) ? email : '';

    const score = Math.min(10, Math.max(1, parseInt(parsed.fit_score) || 1));

    // Normalize recommendation: >=7 enviar, >= position threshold revisar,
    // below threshold descartar (mirrors routeCvScore in lib/positions.js).
    const thr = Math.min(10, Math.max(1, parseInt(reviewThreshold, 10) || 4));
    const rec = score >= 7 ? 'enviar' : score >= thr ? 'revisar' : 'descartar';
    const summary = String(parsed.fit_summary || 'No se pudo analizar el fit.').slice(0, 500);

    return {
      ok: true,
      name,
      email: safeEmail,
      score,
      recommendation: rec,
      summary,
      raw: parsed,
      model: MODEL,
    };
  } catch (e) {
    return { ok: false, error: e.message || 'network_error' };
  }
}

module.exports = { analyzeCv, MODEL };

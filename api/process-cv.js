export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileBase64, filename } = req.body;
  if (!fileBase64 || !filename) return res.status(400).json({ error: 'Missing required fields' });
  if (String(filename).length > 255) return res.status(400).json({ error: 'Filename too long' });
  if (String(fileBase64).length > 10_000_000) return res.status(400).json({ error: 'File too large (max ~7MB)' });

  const isPDF = String(fileBase64).startsWith('JVBERi0') || String(filename).toLowerCase().endsWith('.pdf');

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'Service unavailable' });

  const systemPrompt = `Eres un recruiter senior especializado en perfiles tech de nivel C-level y arquitectura de software.

Tu tarea: analizar un CV y evaluar el fit del candidato para esta posicion:

POSICION: SW Architect / AI Head of Engineering
EMPRESA: Alter5 — fintech de banca de inversion, Madrid (100% remoto)
REQUISITOS CLAVE:
- Arquitectura de software: microservicios, AWS (App Runner, RDS, ECS), PostgreSQL, observabilidad
- IA aplicada: experiencia real con LLMs, agentes, orquestacion (LangChain, CrewAI, Vercel AI SDK, etc.)
- Liderazgo: experiencia gestionando equipos de desarrollo (>3 personas), procesos remotos, evaluacion de rendimiento
- Producto: capacidad de colaborar con negocio, traducir necesidades en decisiones tecnicas
- Dedicacion exclusiva obligatoria
- Experiencia minima: 8+ anos en desarrollo, 3+ en roles de liderazgo tecnico

RESPONDE SOLO con JSON valido, sin texto adicional:
{
  "name": "Nombre completo del candidato",
  "email": "email@encontrado.com",
  "fit_score": 8,
  "fit_recommendation": "enviar",
  "fit_summary": "2-3 frases explicando el fit"
}

REGLAS para fit_score (1-10):
- 8-10: Encaja muy bien. Experiencia directa en la mayoria de requisitos clave.
- 6-7: Buen potencial. Cumple varios requisitos pero le falta alguno relevante.
- 4-5: Fit parcial. Tiene experiencia tecnica pero le faltan areas criticas.
- 1-3: No encaja. Perfil muy alejado de los requisitos.

REGLAS para fit_recommendation:
- "enviar": fit_score >= 6. Merece recibir la entrevista.
- "revisar": fit_score 4-5. El recruiter deberia revisar manualmente.
- "descartar": fit_score <= 3. No tiene sentido para esta posicion.

Se exigente pero justo. No infles puntuaciones. Si el CV no muestra evidencia de algo, no lo asumas.
Si no encuentras nombre o email, usa cadena vacia.`;

  try {
    const content = [
      isPDF
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
        : { type: 'text', text: `Filename: ${String(filename).slice(0, 255)}` },
      { type: 'text', text: 'Analiza este CV segun las instrucciones del sistema. Responde SOLO con el JSON.' }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, system: systemPrompt, messages: [{ role: 'user', content }] })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'API error' });
    }

    const data = await response.json();
    const text = data.content?.find(c => c.type === 'text')?.text || '{}';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch { parsed = extractFallback(text); }

    const name = String(parsed.name || '').slice(0, 100).replace(/[<>"'&]/g, '');
    const email = String(parsed.email || '').slice(0, 254);
    const emailRx = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const safeEmail = emailRx.test(email) ? email : '';

    const fitScore = Math.min(10, Math.max(1, parseInt(parsed.fit_score) || 1));
    const fitRec = ['enviar', 'revisar', 'descartar'].includes(parsed.fit_recommendation)
      ? parsed.fit_recommendation : (fitScore >= 6 ? 'enviar' : fitScore >= 4 ? 'revisar' : 'descartar');
    const fitSummary = String(parsed.fit_summary || 'No se pudo analizar el fit.').slice(0, 500);

    if (!name && !safeEmail) return res.status(422).json({ error: 'No se pudo extraer nombre ni email del CV' });

    return res.status(200).json({ name, email: safeEmail, fit: { score: fitScore, recommendation: fitRec, summary: fitSummary } });
  } catch (e) {
    console.error('process-cv error:', e.message);
    return res.status(500).json({ error: 'Service unavailable' });
  }
}

function extractFallback(text) {
  const email = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] || '';
  const name = text.match(/"name"\s*:\s*"([^"]+)"/)?.[1] || '';
  return { name, email, fit_score: 1, fit_recommendation: 'revisar', fit_summary: 'No se pudo analizar el CV automaticamente.' };
}

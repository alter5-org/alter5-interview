export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, token, baseUrl } = req.body;

  if (!name || !email || !token) {
    return res.status(400).json({ error: 'Missing required fields: name, email, token' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const interviewUrl = `${baseUrl || 'https://technology-leader.alter5.com'}/?c=${encodeURIComponent(name)}&t=${token}`;

  const htmlBody = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
    
    <div style="background: #0A1628; padding: 32px 40px; border-radius: 12px 12px 0 0;">
      <div style="font-family: Georgia, serif; font-size: 22px; color: #ffffff; margin-bottom: 4px;">
        Alter<span style="color: #10B981;">5</span>
      </div>
      <div style="font-size: 13px; color: #94A3B8; letter-spacing: 0.5px;">
        SW Architect / AI Head of Engineering
      </div>
    </div>

    <div style="background: #ffffff; border: 1px solid #E2E8F0; border-top: none; padding: 40px; border-radius: 0 0 12px 12px;">
      
      <p style="font-size: 16px; color: #1E293B; line-height: 1.6; margin: 0 0 20px;">
        Hola ${name},
      </p>

      <p style="font-size: 15px; color: #475569; line-height: 1.7; margin: 0 0 16px;">
        Gracias por tu interés en la posición de <strong>SW Architect / AI Head of Engineering</strong> en Alter5.
      </p>

      <p style="font-size: 15px; color: #475569; line-height: 1.7; margin: 0 0 28px;">
        Como siguiente paso del proceso de selección, te invitamos a completar una entrevista técnica estructurada. Son preguntas cerradas y de escala — no lleva más de 15 minutos.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${interviewUrl}" style="display: inline-block; background: #0A1628; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
          Completar entrevista →
        </a>
      </div>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 28px 0;">
        <p style="font-size: 13px; color: #64748B; line-height: 1.6; margin: 0 0 8px;">
          <strong style="color: #1E293B;">Instrucciones:</strong>
        </p>
        <p style="font-size: 13px; color: #64748B; line-height: 1.6; margin: 0 0 4px;">
          · Responde con ejemplos reales y concretos.
        </p>
        <p style="font-size: 13px; color: #64748B; line-height: 1.6; margin: 0 0 4px;">
          · El tiempo de respuesta es visible para el entrevistador.
        </p>
        <p style="font-size: 13px; color: #64748B; line-height: 1.6; margin: 0;">
          · Este enlace es personal e intransferible.
        </p>
      </div>

      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 8px;">
        Si tienes alguna pregunta, responde directamente a este email.
      </p>

      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">
        Un saludo,<br>
        <strong>Equipo de Alter5</strong>
      </p>

    </div>

    <div style="text-align: center; padding: 24px 0;">
      <p style="font-size: 12px; color: #94A3B8; margin: 0;">
        Alter5 Financial Technologies · Madrid
      </p>
    </div>

  </div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Alter5 Hiring <hiring@alter5.com>',
        to: [email],
        subject: `Alter5 — Entrevista técnica · ${name}`,
        html: htmlBody,
        reply_to: 'careers@alter-5.com'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Resend error', detail: data });
    }

    return res.status(200).json({ success: true, id: data.id, interviewUrl });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

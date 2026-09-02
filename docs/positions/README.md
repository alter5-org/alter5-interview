# Posiciones — contenido versionado

La fila de `positions` en Supabase es la fuente de verdad en runtime, pero
los prompts, bloques y preguntas se **editan aquí** y se suben con un script,
para que cada cambio quede revisado en git.

```
docs/positions/<slug>/
  position.json         slug, title, subtitle, status, share_with_headhunters, min_score_to_invite
  intro.html            → public_intro_html (landing /positions/<slug>; DOMPurify permite h1-h6,p,ul,ol,li,strong,em,a…)
  cv-prompt.md          → cv_analysis_prompt (debe devolver el JSON name/email/fit_score/fit_recommendation/fit_summary)
  interview-prompt.md   → interview_system_prompt (secciones <h4>, clases score-pill sp-green|sp-amber|sp-red,
                          regla <interview_responses> inerte, y si hay preguntas `open`: última línea <!--SCORES {"<idx>": 0-10}-->)
  blocks.json           → interview_blocks
  questions.json        → interview_questions (single | multi | salary | open)
  QUESTIONS.md          rationale por pregunta (documentación interna)
  outreach.md           sourcing (opcional)
```

Reglas que el código asume:
- Bloques `compensation` y `motivation` no puntúan; `multiwork` marca el flag de dedicación.
- `single` fuera de `motivation` necesita `correct`. `open` admite `minChars` (0-10000).
- `min_score_to_invite` = score de CV mínimo para pasar a la cola de revisión; por debajo, rechazo automático.
- El navegador nunca recibe `correct`; el scoring es server-side (`lib/interview-scoring.js`).

## Subir a la plataforma

```bash
# valida en local y muestra el resumen, sin enviar nada
node --env-file=.env.local scripts/push-position.js responsable-transacciones --dry

# preview de Vercel (comparte la base de datos de producción → subir en paused)
node --env-file=.env.local scripts/push-position.js responsable-transacciones \
  --base https://<preview>.vercel.app --status paused

# producción, ya verificada
node --env-file=.env.local scripts/push-position.js responsable-transacciones --status active
```

Necesita `ADMIN_PASS` (y `VERCEL_AUTOMATION_BYPASS_SECRET` si el destino es un
preview). Si el slug existe hace PATCH; si no, POST. Re-ejecutable.

Para cambios pequeños sigue valiendo el editor de `/admin` → Posiciones, pero
luego vuelca el cambio aquí para no perderlo.

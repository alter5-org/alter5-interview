# Responsable de Transacciones — punto de situación (2026-09-03)

**Producción:** https://careers.alter-5.com · `main` en `af1d9a1` desplegado a mano con `vercel deploy --prod`.
**Posición:** `responsable-transacciones` (id `77eeddbc-7595-404c-8bec-05a86e038e3b`), **activa**, `min_score_to_invite = 5`, compartida con headhunters.
**Landing:** https://careers.alter-5.com/positions/responsable-transacciones · Índice: https://careers.alter-5.com/

---

## Qué está hecho

**Plataforma (release 2026-09-03)**
- Scoring de entrevista **server-side** (`lib/interview-scoring.js`): el navegador ya no recibe `correct`; `submit-interview` y `reanalyze-interview` recalculan `global_score`/`dim_scores`/`verdict` desde el banco de la posición. Las notas del grader para preguntas abiertas llegan como `<!--SCORES {...}-->` y se guardan como evento `interview_case_scored` (sin cambio de esquema).
- Tipo de pregunta `open` (+`minChars`) admitido en el validador de posiciones.
- `min_score_to_invite` gobierna el routing de CV (`routeCvScore`). Fila HoE ajustada a 4 por admin API (comportamiento idéntico al anterior).
- Fail-loud: apply exige slug; subidas manual/headhunter exigen posición; agente de email usa `EMAIL_AGENT_DEFAULT_POSITION_SLUG=hoe` (env en Vercel Production). Sin prompts por defecto de HoE.
- `/` es un índice de posiciones activas (`index.html`); textos HoE-hardcoded neutralizados; exports CSV con columna `position` y filtro `?position_id=`.
- **Modelo Anthropic**: `claude-sonnet-4-20250514` estaba retirado y rompía todo análisis en silencio. Ahora `claude-opus-5`, configurable con `ANTHROPIC_MODEL` (env), `effort: low`, `max_tokens` 4000/8000, abort del informe 50 s.
- Nuevo `POST /api/admin/reanalyze-cv` + botón "Relanzar análisis de CV" en el detalle del candidato. Usado para recuperar un candidato real atascado desde el 14-ago (ahora en cola con 6/10).
- Tests: `npm run test:unit` (13) · Playwright `tests/positions-v2.spec.js` + specs previos, 36/36 contra producción. Rutas absolutas obsoletas de `.env` en `positions.spec.js` corregidas.

**Contenido (versionado en `docs/positions/`)**
- `responsable-transacciones/`: `cv-prompt.md`, `interview-prompt.md`, `blocks.json`, `questions.json` (14 MCQ situacionales + mini-caso de ejecución + track record + salario + motivación), `intro.html`, `QUESTIONS.md` (rationale), `outreach.md` (sourcing).
- `hoe/`: extraído verbatim de la migración, mismo formato.
- `scripts/push-position.js <slug> [--base URL] [--dry] [--status …]`: valida en local y hace POST/PATCH por admin API. Ver `docs/positions/README.md`.

**Verificación en producción (2026-09-03)**
- Smoke 31/31: subida manual con autoInvite → config sin `correct` → submit → recálculo servidor (10/10, verde) → informe con arquetipo → evento `interview_case_scored` `{12: 9, 13: 8}` → reanalyze.
- Candidato sintético `SMOKE TEST RT` (app `529843ee-a929-4290-92e2-6df5c7404884`, email `salvador.carrillo+smoke-rt@alter-5.com`) sigue en la BD; descartar desde /admin cuando se quiera.

## Qué NO está hecho / deuda

- **Integración GitHub→Vercel rota desde el 20-abr.** Cada release requiere `vercel deploy --prod --yes` a mano. Arreglo: `vercel git connect --yes` o re-enlazar en el dashboard.
- Default de columna `positions.min_score_to_invite` sigue en 7 (código y admin API usan 4). Solo importa si se inserta una fila por SQL.
- `/reports` no filtra por posición (`admin_stats_summary` sin parámetro). Exports sí.
- Sin alerta ante `cv_analysis_failed`: una retirada de modelo vuelve a ser silenciosa. Mitigación: `ANTHROPIC_MODEL` en env + botón de relanzar.
- Candidato `raul…` (abril, `cv_uploaded`) no tiene CV en storage; no recuperable.
- Anti-extracción del test (copy/click derecho bloqueados) heredado de HoE; para un perfil senior de banca puede sonar agresivo. Decisión pendiente.

## Sourcing (siguiente paso)

- MCP Nova Talent registrado para este proyecto (`claude mcp add … nova-talent`); requiere sesión nueva para cargar herramientas.
- Plan en `docs/positions/responsable-transacciones/outreach.md`: booleanos, empresas objetivo, mensaje de 80 palabras.
- Orden: lista `RT-calibración` (3-5 perfiles conocidos, validar que el mini-caso discrimina) → lista `RT-ola1` (~40) → secuencia con link a la landing.

## Cómo operar

```bash
# editar contenido y subirlo (PATCH si el slug existe)
node --env-file=.env.local scripts/push-position.js responsable-transacciones --status active

# pausar / reactivar sin tocar contenido: /admin → Posiciones → editar → Estado

# tests
npm run test:unit
PLAYWRIGHT_BASE_URL=https://careers.alter-5.com POSITION_SLUGS=hoe,responsable-transacciones npx playwright test --project=chromium

# release
git push origin main && vercel deploy --prod --yes
```

`.env.local` (ignorado por git) necesita `ADMIN_PASS`; `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` son sensibles en Vercel y no se exportan.

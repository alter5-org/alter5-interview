# Growth & Marketing Manager B2B — punto de situación (2026-09-10)

**Producción:** https://careers.alter-5.com · sin cambios de código; la posición se subió por admin API.
**Posición:** `growth-marketing-manager` (id `767edaf5-55a2-4d42-9d85-ad05a0a31676`), título público "Growth & Marketing Manager B2B | IA y automatización", `min_score_to_invite = 5`, compartida con headhunters.
**Landing:** https://careers.alter-5.com/positions/growth-marketing-manager · Índice: https://careers.alter-5.com/
**Fuente de la JD:** `~/Downloads/Alter5_JD_Growth_Marketing_Manager.pdf.pdf` (2026-09-10).

---

## Decisiones (Salvador, 2026-09-10)

- Título: variante de GPT 6 Astra, "Growth & Marketing Manager B2B | IA y automatización" (evita que "AI" se lea como producto). Subtítulo: "Ejecución del plan de marketing · Analítica, atribución y agentes IA".
- Experiencia: desde 1 año, sin tope. El filtro de CV no penaliza años; solo expectativa de Head/CMO sin hands-on.
- Condiciones publicadas: 35.000-40.000 € fijos + 15 % variable + posibilidad de plan de acciones. Madrid centro (Cuzco), híbrido.
- Candidatura: landing + CV + test. La "media página" de la JD es el mini-caso (#10 y #11). Email `info@alter-5.com` solo como alternativa en outreach.
- Régimen anti-IA en el test: igual que HoE y RT (pegados y cambios de pestaña como señales).
- La landing declara que el filtro de CV usa IA y que todo descarte automático lo revisa una persona. **Compromiso operativo:** revisar en `/admin` la cola `analyzed_auto_rejected` de esta posición antes de comunicar descartes.

## Base de la decisión de título (Nova Talent, 2026-09-10)

Searches 15103 (growth nice-to-have), 15104 (analytics nice-to-have), 15106 (growth, IA como MUST), 15107 (analytics, IA como MUST). `totalResults` satura en 500; el discriminador es `totalResultsNova`: growth 12 vs analytics 3 con la misma señal dura (Claude Code, agentes, n8n, MCP, RAG, LLM). La rama analytics deriva a Power BI / BI corporativo. Los perfiles con Claude Code explícito en Madrid tienen 9-15 años.

## Qué está hecho

- `docs/positions/growth-marketing-manager/`: `position.json`, `intro.html`, `cv-prompt.md`, `interview-prompt.md`, `blocks.json`, `questions.json` (10 supuestos w2 + mini-caso en 2 abiertas w5 + trayectoria w3 + compromiso w2 + salario + motivación), `QUESTIONS.md`, `outreach.md`.
- Revisión externa con GPT 6 Astra (codex 0.154.0). Adoptado: tres supuestos con números (coste por oportunidad, atribución multi-toque, agente con muestra fallida), mayor peso del mini-caso (29 % del total), trayectoria de una iniciativa, "evidencia insuficiente" en el filtro de CV. Rechazado: fallo = 0 en scoring (global, afectaría a HoE y RT).
- `push-position.js --dry` OK · `npm run test:unit` 13/13 · POST 201 en producción, estado `paused`.

## Qué NO está hecho / deuda

- **Activación** (`--status active`) y verificación de landing, índice y config pública sin `correct`.
- Smoke de punta a punta con candidato sintético (CV → test → informe con `<!--SCORES {"10","11","12"}-->` → evento `interview_case_scored`).
- Playwright `positions-v2.spec.js` con `POSITION_SLUGS=hoe,responsable-transacciones,growth-marketing-manager`.
- Pills de bloque sin color en `interview.html` para `medicion`, `ia`, `caso`, `trackrecord` (cosmético, heredado; RT tampoco los tiene). Arreglarlo requiere deploy manual (`vercel deploy --prod --yes`; integración GitHub→Vercel rota desde el 20-abr).
- Scoring global fallo = w×1 (Astra propone 0). Deuda de plataforma, no de esta posición.
- Sourcing: shortlist `GMM-ola1` desde search 15106; proveedor LinkedIn de Nova sigue NOT_CONNECTED.

## Cómo operar

```bash
node --env-file=.env.local scripts/push-position.js growth-marketing-manager --dry
node --env-file=.env.local scripts/push-position.js growth-marketing-manager --status active
npm run test:unit
PLAYWRIGHT_BASE_URL=https://careers.alter-5.com POSITION_SLUGS=hoe,responsable-transacciones,growth-marketing-manager npx playwright test --project=chromium
```

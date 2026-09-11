# Sourcing — Growth & Marketing Manager B2B (Nova Talent)

Sondeo de mercado 2026-09-10 (searches Nova 15103 nice-to-have / 15106 con IA
como MUST). Revisado con GPT 6 Astra. Perfil: growth/marketing B2B que
ejecuta, mide y automatiza con agentes IA. Desde 1 año, sin tope.

## Booleanos (Nova Talent / LinkedIn)

```
("growth" OR "marketing manager" OR "demand generation" OR "performance marketing" OR "digital marketing manager")
AND ("Claude Code" OR Claude OR "AI agents" OR agentes OR n8n OR Make OR Zapier OR LLM OR RAG OR "prompt engineering" OR "marketing automation")
AND (Madrid)
```

Excluir: `brand manager` puro, `community manager`, `social media manager`,
`BI analyst`, `data engineer`, `Head of` / `CMO` / `Director` sin hands-on,
agencia sin cuenta propia.
Seniority: desde 1 año; los perfiles con señal dura de IA en Madrid tienen
9-15 años y encajan si siguen ejecutando personalmente. Títulos: Growth
Manager, Growth Marketing Manager, Demand Generation Manager, Performance
Marketing Manager, Digital Marketing Manager, Marketing Manager B2B.

## Empresas objetivo

- **B2B / SaaS / fintech (prioridad):** GetAccept, Make, Loxo, Stratio,
  Wellhub, Lodgify, micro1, Devengo, Otovo, Sportian, Pleo, PropHero.
- **Corporativo con marketing digital instrumentado:** CBRE, GN Group,
  Sulzer, SGS, Wolters Kluwer, Pluxee, Telpark, British Council, Sanitas.
- **Consultoras de marketing digital y analítica (solo con ownership de
  cuenta):** Improving Metrics, NATEEVO, Garaje de ideas, hiberus.
- **Descartar como fuente:** consultoras de BI/data (ALTEN, Capgemini,
  Keepler, knowmad mood): rama analytics sin ejecución de marketing.

## Listas

1. `GMM-ola1` — 30-40 perfiles desde la search 15106 (IA como MUST) más los
   marcados en 15103 con Claude Code, n8n o agentes en el titular. Secuencia
   de contacto con link a `/positions/growth-marketing-manager`.
2. `GMM-ola2` — toda España fuera de Madrid (search Nova **15194**), abierta
   el 2026-09-11 al pasar la posición a remoto: el pool de Madrid tiene
   salario estimado mediana ≈57k€, por encima de la banda 35-40k.

## Mensaje de contacto (≈80 palabras)

> Hola {{nombre}}, en Alter5 (plataforma de financiación para empresas y
> proyectos de infraestructura, más de 250 M€ cerrados) buscamos un/a Growth
> & Marketing Manager B2B que ejecute el plan de marketing reportando a un
> cofundador: iniciativas de principio a fin, medición con atribución y
> automatización con agentes IA. Vi en tu perfil {{señal: Claude Code / n8n /
> agentes}} y me encaja con lo que necesitamos. Banda 35-40k más variable y
> plan de acciones, remoto desde España. ¿Te apetece comentarlo 15 minutos?

Seguimiento (día +4): enlace directo a la landing y mención de que el proceso
es asíncrono (CV + test breve en línea, respuesta en horas). Como
alternativa, CV y media página a `info@alter-5.com` para quien prefiera
email; se sube desde `/admin`.

## Entrada de candidatos

- Landing pública `/positions/growth-marketing-manager` (apply + CV).
- CVs recibidos por email o LinkedIn → `/admin` → Subir CV manual con la
  posición seleccionada.
- Descartes automáticos del filtro de CV: revisar en `/admin` antes de
  comunicar (compromiso publicado en la landing).

## Campaña Nova (2026-09-11)

Decisión general en `docs/sourcing/nova-replication-analysis.md` (híbrido: Nova
busca y contacta; sin motor propio; listas propias más adelante).

- Campaña **2146** `Growth & Marketing Manager — ola 1`, template `LINKEDIN_FIRST`,
  Europe/Madrid, L-V. Shortlist **5039** (40 perfiles; 8 abiertos a ofertas,
  8 verificados Nova; **0 con email público**). Estado: DRAFT hasta conectar
  LinkedIn en Nova Recruiter → Settings → Connections. Coste: 40 créditos
  (hay 50).
- Pasos activos: invitación LinkedIn **sin nota** (compatible con cuenta
  gratuita) → mensaje LinkedIn 1 h tras aceptar → follow-up a 48 h con URL →
  Nova follow-up (solo `isNova`). Deshabilitados: 2º/3º follow-up LinkedIn y
  todos los pasos Email (provider no conectado; sin emails públicos).
- Límites recomendados en Nova tras conectar: 15-20 invitaciones/día,
  ~30 mensajes/día (cuenta gratuita ≈ 100 invitaciones/semana).
- UTM: `utm_source=nova`, `utm_medium=linkedin|nova`, `utm_campaign=gmm-ola1`.
  Se ven en `/admin` (columna UTM) y en el export CSV.
- RGPD art. 14: línea en el follow-up con URL (origen perfil público, uso solo
  para este proceso, `https://careers.alter-5.com/apply/privacy`, opción de no
  volver a ser contactado).
- Lanzar: `campaign_set_message` en cualquier paso para obtener `previewToken`
  fresco → `campaign_launch(2146, previewToken)`.

**Mensaje LinkedIn (tras aceptar):**

> Hola {{firstName}}, en Alter5 (plataforma de financiación de deuda y proyectos, más de 250 M€ cerrados, empresa nativa de IA) buscamos un/a Growth & Marketing Manager B2B que ejecute el plan de marketing reportando a un cofundador: iniciativas de principio a fin, medición con atribución y automatización con agentes IA. Tu perfil encaja con lo que necesitamos. Banda 35-40k fijos más 15 % variable y opción a plan de acciones, remoto desde España. ¿Te apetece comentarlo 15 minutos?

**Follow-up LinkedIn (+48 h):**

> Hola {{firstName}}, retomo mi mensaje sobre el rol de Growth & Marketing Manager B2B en Alter5. Te dejo el detalle de la posición: https://careers.alter-5.com/positions/growth-marketing-manager?utm_source=nova&utm_medium=linkedin&utm_campaign=gmm-ola1
>
> El proceso es asíncrono: subes tu CV, un test online de unos 5 minutos y tienes respuesta en horas. Si no es el momento, un "ahora no" me sirve igual.
>
> Tus datos profesionales proceden de tu perfil público de LinkedIn y solo los usamos para este proceso (más información: https://careers.alter-5.com/apply/privacy). Si prefieres que no te vuelva a contactar, dímelo y lo respeto.

**Nova follow-up:** mismo contenido con `utm_medium=nova`.

2026-09-11: posición pasa a **remoto desde España** (JD, cv-prompt y mensajes actualizados). Motivo: la shortlist 5039 (Madrid) tiene salario estimado mediana ≈57k€, muy por encima de la banda 35-40k; se abre `GMM-ola2` fuera de Madrid.

## Supresión (manual hasta tener listas propias)

Anotar aquí los "no me contactes" y rechazos explícitos para respetarlos en
olas futuras. Nova corta la secuencia automáticamente al rechazo
(`HAS_REJECTED_CONTACT_LINKEDIN` / `_NOVA`).

- (vacío)

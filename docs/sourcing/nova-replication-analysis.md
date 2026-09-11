# ¿Replicar el MCP de Nova Talent? — análisis Fable + Astra (2026-09-11)

## Contexto

Alter5 usa el MCP de Nova Recruiter para sourcing (búsqueda de candidatos), shortlists y campañas multicanal (LinkedIn → email → Nova). Dependencia incómoda: 50 créditos, providers LinkedIn/Email `NOT_CONNECTED`, pool verificado Nova diminuto (13 perfiles growth/marketing Madrid), `totalResults` capado a 500. Pregunta: ¿podemos replicarlo para no depender de ellos? ¿Cuánto cuesta construirlo y ejecutarlo?

Método: inventario del tool surface del MCP (schemas + perfil muestra `elena-prada` + grafo real de la campaña 2031) → dos análisis independientes con búsqueda web y fuentes citadas: **Claude Fable 5.1** y **GPT-6 Astra**. Repo: HTML estático + Vercel functions + Supabase + Resend + Anthropic; NO existe modelo de prospectos/listas/campañas (solo `applications` inbound con consentimiento).

## Qué hace el MCP (inventario)

| Bloque | Tools | Lo difícil de replicar |
|---|---|---|
| **Sourcing** | `agent_search_criteria` (NL→criterios con memoria), `taxonomy_get`, `search_*` (persistidas, ranking, paginación), `profile_get/details` (perfil LinkedIn completo, `isOpenToOpportunities`, email si público, salario estimado, `novaPercentage`) | El **índice de perfiles** (vendor: ContactOut, por `images.contactout.com`) y los filtros tipo LinkedIn (roles temporales, funding, B2B/B2C, idiomas con nivel) |
| **Listas** | `shortlist_*` CRUD + `add/remove_profiles`, `profile_notes`, `contact_create` | Nada |
| **Campañas** | `campaign_create` (4 templates), grafo CONDITION/ACTION con esperas 1h/48h/72h y ramas `IS_LINKEDIN_CONTACT`/`HAS_REJECTED`/`IS_NOVA`, `campaign_preview_message` (LLM desde JD+tono+CTA), `conversation_*` inbox unificado, `provider_*` | **Ejecutar acciones en LinkedIn** (invitación, mensaje, InMail) sin baneo; inbox unificado LinkedIn+email; webhooks de aceptación/respuesta |

Dato observado: las lecturas por MCP (`profile_get`, `shortlist_add_profiles`) **no consumen créditos** (50 el 03-09 y 50 el 11-09 tras ~90 perfiles leídos y 2 shortlists creadas). Solo consumen contacto y exportación.

## Análisis Fable 5.1

- **Sourcing: BAJA.** Sin vía oficial: LinkedIn Talent Solutions/RSC solo para partners con contrato y es sync ATS↔Recruiter, no people search. ContactOut API solo Enterprise (precio custom). **Proxycurl cerrado jul-2025** tras demanda LinkedIn. Opciones: PDL $0,28/perfil, mín ~$100/mes; Coresignal $49/2.500 créditos (~$0,20–0,40/perfil, emails solo desde $199); Crustdata sin precio público; Apollo/Lusha/Kaspr = ficheros de ventas, filtros pobres para recruiting; **Unipile €49/mes** sobre la cuenta LinkedIn propia da search con los mismos filtros que la UI (Classic/Sales Nav/Recruiter) pero viola UA 8.2; manual: Recruiter Lite ~€206/mes con IVA, Sales Nav Core ~€145.
- **Listas: ALTA.** 2 tablas Supabase, 0,5–1,5 días. Merece la pena para tener memoria propia entre posiciones.
- **Campañas: MEDIA-BAJA.** Motor de estados + cron + webhooks Unipile + inbox = 8–14 días y mantenimiento perpetuo. Comprar: HeyReach $79, LGM €60, Waalaxy €19–69, Expandi $99, lemlist $69–109. Phantombuster = mayor riesgo de restricción.
- **Email**: Resend Free 3.000/mes cubre volumen, pero **no cold outreach desde hiring@alter-5.com** (reputación transaccional + AUP Resend). Subdominio o buzón Google Workspace del CEO.
- **Nova pricing** (HeroHunt): Free 10 créditos; **Starter €49/50 créditos (+€1 extra)**; **Growth €199/300 (+€0,50)**. Búsquedas y shortlists ilimitadas gratis. 1 crédito = 1 candidato contactado o exportado. ⇒ **€99–199/posición, €0 en meses sin contratar**.
- **Esfuerzo total build**: 13–22 días + ~1 día/mes mantenimiento ⇒ €7.500–12.000 (a €500–800/día) ⇒ €2.500–4.000/posición amortizado vs €99–199 en Nova.
- **LLM**: ~$5–8/posición. Irrelevante.
- **Legal**: UA 8.2 prohíbe automatización; hiQ acabó 2022 con injunction permanente + $500k (LinkedIn ganó por contrato). RGPD art. 14: informar en primer contacto o ≤1 mes; interés legítimo con LIA; no guardar foto ni salario; borrar no interesados al cerrar; tabla `do_not_contact`. Deliverability: SPF+DKIM+DMARC, subdominio, warm-up.
- **Recomendación: híbrido mínimo, no build.** S1 = Nova pay-per-use (Free entre procesos, Starter/Growth el mes activo, comprar extras a €1) + `prospects/shortlists` propias en Supabase (1–2 días) + cláusula art. 14 + `do_not_contact`. ~€300–600/año. S2 (Coresignal+HeyReach, €255/mes activo, 6–10 días) solo si Nova sube precio o cierra. S3 (Unipile+Sales Nav+motor propio, 13–22 días) descartar.

## Análisis GPT-6 Astra

- **Sourcing: MEDIA comprando datos, BAJA sin proveedor** (5–8 días). APIs oficiales LinkedIn no dan people search; tener Recruiter Lite/Sales Nav **no concede permisos API**. PDL $98/mes 350 perfiles, $0,28/perfil devuelto (150 perfiles = $42 pero pagas mínimo $98); Coresignal Mini $49/2.500; Apollo search 0 créditos + enrich 1; Kaspr €59; ContactOut API bajo presupuesto; Proxycurl descartado. **Sin benchmark público de cobertura en España**: probar 30–50 perfiles conocidos antes de integrar; 50% útiles duplica coste efectivo. El adaptador debe distinguir "ausente" de "incumplido" (idiomas, B2B, funding, open-to-work no vienen homogéneos); no inventar salario ni equivalente a `novaPercentage`.
- **Listas: ALTA** (2–3 días). Tablas `prospects, searches, search_results, shortlists, shortlist_members, notes, suppression`; guardar URL normalizada, proveedor, fecha, base jurídica. Prospecto ≠ candidatura consentida; vincular con `applications` solo al iniciar proceso.
- **Campañas: ALTA para borradores/tareas asistidas (2–3 días); MEDIA automatizadas (7–12 días).** Comprar transporte (Unipile €49, HeyReach $79, LGM €60–120, lemlist $69–109, Waalaxy €19–69, Expandi $99, Linked Helper $15 pero app local). Motor propio = estados + `next_action_at` + cron + cola + webhooks; idempotencia; parar seguimientos ante respuesta/baja. **Resend prohíbe destinatarios no solicitados** → buzón real vía OAuth/IMAP.
- **Infra transversal**: +3–5 días (auth, auditoría, retención). MVP automatizado total **17–28 jornadas** (€8.500–14.000 a €500/día); híbrido manual 4–6.
- **Nova**: confirma 1 crédito por candidato/secuencia y **otro por perfil exportado**; extras €1/€0,50; cuota base no verificada. Exportar 150 perfiles = 150 créditos (ojo si alimentamos listas propias por exportación).
- **Costes stacks** (2 meses activos/vacante, 6/año): #1 Sales Nav manual + listas propias + buzón €126–146/mes activo (€252–292/vacante); #2 PDL + listas + contacto manual €93–113 (€186–226); #3 PDL + Unipile + motor propio €142–162 (€284–324). LLM ~€10/vacante.
- **Legal**: hiQ no legalizó scraping; LOPDGDD art. 19 no autoriza automáticamente contactar a un empleado para ficharlo; art. 14 en primer contacto; LIA documentada; propone borrar prospectos inactivos a 90 días; si el mensaje promociona servicios aplica LSSI art. 21; empezar 5–10 contactos/día, spam <0,1%.
- **Recomendación**: no replicar íntegro. 4–6 días en híbrido manual (listas + importación + tareas), probar PDL vs Nova con muestra. "Si Nova ofrece precio razonable para 300 contactos/año, conservarla puede ser la decisión económica correcta; la independencia útil está en los datos operativos propios y adaptadores intercambiables."

## Síntesis: dónde coinciden y dónde no

**Coinciden (alta confianza):**
1. El CRUD (listas, campañas, inbox) es trivial; lo caro es **datos + acciones LinkedIn**. Ningún API oficial de LinkedIn sirve. Proxycurl muerto. ContactOut API solo con presupuesto.
2. **Cualquier alternativa exige conectar la cuenta LinkedIn del CEO igual que Nova** (Unipile, HeyReach, LGM…). El bloqueo `NOT_CONNECTED` no lo resuelve replicar; lo resuelve conectar.
3. Automatizar LinkedIn = incumplimiento UA 8.2 + riesgo de restricción de cuenta. Nova traslada ese riesgo a nosotros también.
4. Resend NO para cold outreach. Buzón real (Google Workspace) + SPF/DKIM/DMARC.
5. RGPD: art. 14 en primer mensaje, LIA, supresión, retención corta. `applications` no sirve para prospectos.
6. Build completo: **13–28 días ≈ €7.500–14.000** + mantenimiento. Para 3 posiciones/año no compensa frente a €99–199/posición en Nova.
7. LLM cost irrelevante (€5–10/posición).
8. Listas propias en Supabase sí merecen la pena (memoria entre posiciones, independencia de datos operativos).

**Discrepan:**
- Fable encontró precios base Nova (Starter €49/50, Growth €199/300, fuente terceros); Astra solo verificó extras. Tratar como orientativo hasta ver la página de billing.
- Fable #1 = quedarse en Nova; Astra #1 = Sales Nav manual + listas propias. Diferencia real: Astra pesa más el riesgo proveedor y la exportación a créditos. Resolución: **las lecturas MCP no consumen créditos** (verificado), así que alimentar listas propias vía `profile_get` es gratis — el argumento de Astra contra "listas alimentadas por Nova" no aplica si se hace por MCP.
- Astra añade 3–5 días de infra transversal; Fable no. Tomar Astra como cota superior.

## Recomendación

**Híbrido mínimo. No replicar sourcing ni motor de campañas.**

| Bloque | Decisión | Coste |
|---|---|---|
| Sourcing | Seguir en Nova, pay-per-use (Free entre procesos; Starter/Growth el mes activo). Búsquedas/shortlists/lecturas gratis. | €49–199/posición |
| Listas | Construir en Supabase: `prospects`, `shortlists`, `shortlist_members`, `notes`, `suppression`. Alimentar vía MCP `profile_get` (0 créditos). Solo datos profesionales, sin foto/salario. | 2–3 días una vez; €0/mes |
| Campañas | Usar las de Nova (conectar LinkedIn + Gmail del CEO en Nova → Settings → Connections; requisito idéntico en cualquier alternativa). Plan B si Nova falla: HeyReach/LGM + buzón propio, 1–2 días de integración. | Créditos Nova; Plan B €60–80/mes activo |
| Legal | Cláusula art. 14 + link política + opt-out en primer mensaje; LIA documentada; retención 90 días para no respondedores; `suppression` transversal. | 0,5 día |
| Validación opcional | Free tier PDL/Coresignal con 30–50 perfiles Madrid conocidos → medir cobertura antes de considerar S2. | 0,5 día; €0 |

Total: ~€300–600/año en Nova + 3–4 días de build. Frente a €7.500–14.000 + €100–250/mes por replicar.

## Siguientes pasos (al aprobar este plan)

1. Guardar el informe en `docs/sourcing/nova-replication-analysis.md` (este documento) y actualizar memoria (`nova-talent-mcp.md`: lecturas MCP no consumen créditos; pricing Nova orientativo; decisión híbrido).
2. **Decisión aparte (no incluida aquí)**: si se quiere construir el módulo de listas en Supabase, se planifica como feature propia (migración SQL + 4–5 funciones + MCP mínimo).
3. Desbloqueo inmediato de campañas 2031 / GMM: conectar LinkedIn en Nova. Ninguna alternativa evita ese paso.

## Verificación

- Informe legible en `docs/sourcing/nova-replication-analysis.md`; enlaces de fuentes funcionan (spot-check 5).
- Memoria actualizada y `MEMORY.md` apuntando a ella.
- Sin cambios de código ni de infra en este plan.

## Fuentes principales
Nova pricing: herohunt.ai/blog/nova-recruiter-pricing-alternatives-2026 · help-recruiter.novatalent.com · LinkedIn RSC: learn.microsoft.com/linkedin/talent/recruiter-system-connect · Proxycurl cierre: nubela.co/blog/goodbye-proxycurl, news.linkedin.com/2025/LinkedInWinsLegalBattleToProtectMemberData · PDL: support.peopledatalabs.com pricing-credits · Coresignal: coresignal.com/pricing · Unipile: unipile.com/pricing-api · HeyReach: heyreach.io/pricing · LGM: lagrowthmachine.com/pricing · lemlist: lemlist.com/pricing · Resend AUP: resend.com/legal/acceptable-use · LinkedIn UA prohibiciones: linkedin.com/help/linkedin/answer/a1341387 · hiQ: zwillgen.com hiq-v-linkedin-wrapped-up · AEPD guía relaciones laborales: aepd.es · Google sender guidelines: support.google.com/mail/answer/81126

---

## Decisión (Salvador, 2026-09-11)

**Híbrido con Nova automatizado. No replicar.**

| Bloque | Decisión |
|---|---|
| Búsqueda y shortlists | Nova MCP. Lecturas (`search_*`, `profile_get`, `shortlist_*`) no consumen créditos. |
| Contacto | Flujo conectar → mensaje **automatizado por Nova** (template `LINKEDIN_FIRST`). Descartados: motor propio con Unipile (€49/mes + 5-8 días + riesgo UA por ~9 h/año ahorradas), Claude en Chrome, scraper propio. |
| Email extraído de LinkedIn | Descartado como canal: **0/40 perfiles** de `GMM-ola1` exponen email por MCP; Nova solo lo revela al gastar crédito. Paso Email deshabilitado en ambas campañas. |
| Cuenta LinkedIn | Gratuita del CEO. Compatible: la invitación de Nova va **sin nota** (`data: {}`), el límite de ~5 notas/mes no aplica. Límites prudentes: 15-20 invitaciones/día, ~100/semana. |
| Listas propias en Supabase | **Más adelante**, tras evaluar la ola 1 (2 semanas). Sustituto: `outreach.md` de cada posición. |
| Atribución | UTM en todas las URLs de mensajes: `utm_source=nova`, `utm_medium=linkedin\|nova\|email`, `utm_campaign=<slug>-ola1`. El repo ya guarda y muestra estos campos en `applications` / `/admin`. Sin cambios de código. |
| RGPD art. 14 | Línea en el primer mensaje con URL: procedencia (perfil público LinkedIn), finalidad (este proceso), enlace `https://careers.alter-5.com/apply/privacy`, opción de no volver a ser contactado. |

Campañas preparadas: **2146** `Growth & Marketing Manager — ola 1` (shortlist 5039, 40 perfiles) y **2031** `Responsable de Transacciones — ola 1` (shortlist 4431, 49 perfiles). Ambas en DRAFT hasta conectar LinkedIn en Nova Recruiter → Settings → Connections. Créditos: 50; GMM cabe entera, RT requiere comprar créditos (Starter €49/50, orientativo) o recortar la lista.

Criterios para reabrir esta decisión: más de ~150 contactos/año, subida de precio o cierre de Nova, o restricción de la cuenta LinkedIn. En ese caso: listas propias en Supabase + HeyReach/Unipile con buzón Google Workspace propio.

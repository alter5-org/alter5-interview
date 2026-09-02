# Entrevista técnica — Head of Engineering (AI & Infrastructure)

Documento de referencia interno para el proceso de selección de Alter5.
Describe cada pregunta del test, la opción correcta, el **objetivo** (qué
pretende discriminar) y por qué las otras opciones son trampas creíbles.

**Formato general:**
- 20 preguntas totales · 10–15 min estimados
- 18 de opción única (single) + 1 multi-select + 1 numérica (sueldo)
- El sistema de scoring sólo evalúa los bloques técnicos / liderazgo /
  producto / compromiso. **Compensación** y **Motivación** son metadatos
  y no puntúan.
- El grader (Claude Sonnet 4) recibe además por pregunta: tiempo, pegados,
  cambios de pestaña y ráfagas de tecleo — señales anti-IA.

---

## Bloque 1 · Arquitectura técnica (6 preguntas)

### Q1 · Monolito modular vs. microservicios (w=3)

> Tu equipo de 4-6 developers arranca un producto nuevo. ¿Qué pesa MÁS en
> la decisión "monolito modular vs. microservicios desde el día 1"?

- ✅ **El tamaño actual del equipo y la velocidad de iteración en los primeros 6 meses**
- ❌ La escalabilidad futura prevista: si habrá 20+ developers en 18 meses
- ❌ La familiaridad del equipo con cada paradigma
- ❌ Lo nítidos que estén los bounded contexts del dominio antes de escribir código

**Objetivo:** distinguir el arquitecto pragmático del dogmático. Un senior
con cicatrices sabe que premature-microservices es la causa nº 1 de
productos muertos en early stage. Las otras opciones son "bonitas" pero
segundarias: la escalabilidad futura es hipotética, la familiaridad es
importante pero no decisiva, y los bounded contexts rara vez están claros
antes de escribir código (falacia del "DDD-first").

### Q2 · Connection pooling (w=2)

> Tienes 14 microservicios, cada uno con su propio pool de 5 conexiones a
> PostgreSQL RDS (70 conexiones simultáneas). Empiezas a ver timeouts
> intermitentes contra la BD. ¿Cuál es tu primer paso?

- ❌ Aumentar max_connections en RDS al doble para absorber el pico
- ✅ **Introducir un connection pooler centralizado (PgBouncer o RDS Proxy) delante de RDS**
- ❌ Bajar las conexiones por servicio a 2 y añadir retry con backoff exponencial
- ❌ Migrar a Aurora Serverless v2 para que max_connections escale solo

**Objetivo:** ver si el candidato entiende el problema estructural (N
servicios × K conexiones no escala) en vez de parchearlo subiendo
parámetros o migrando de producto. PgBouncer/RDS Proxy es la respuesta
operativa estándar en AWS con Postgres; quien lleva tiempo en producción
lo ha implementado al menos una vez.

### Q3 · Cold start en App Runner (w=2)

> Tu backend Node.js en App Runner tarda 8 s en arrancar en frío tras un
> pico. Ya tienes provisioned concurrency configurada pero el pico la
> desborda. ¿Qué investigas primero?

- ❌ Reducir la imagen Docker con multi-stage build y base distroless
- ✅ **El coste real del arranque: handshake con RDS, SDKs de AWS, descarga de secretos, carga de configuración externa**
- ❌ Cambiar a ECS Fargate con capacity provider para tener instancias siempre calientes
- ❌ Añadir un self-ping cada 30 s como warm-up

**Objetivo:** separar el perfil que ha profileado arranques de verdad del
que sólo repite mantras. En Node + AWS, los 8 s casi nunca son por la
imagen — son conexiones lentas a RDS, `aws-sdk` cargando credenciales, o
descargas bloqueantes al boot. Quien no ha diagnosticado esto tira de la
salida fácil (migrar a otro servicio, cambiar la imagen).

### Q4 · Incidente P1 sin causa clara (w=3)

> Incidente P1 en producción. Tras 20 min de investigación no tienes una
> causa clara y el impacto sigue creciendo. ¿Qué es lo PRIMERO que haces?

- ❌ Sigo investigando — no quiero tomar una acción que pueda empeorarlo sin entender la causa
- ✅ **Revierto al último deploy estable conocido; investigación a fondo después, con el sangrado cerrado**
- ❌ Escalo: llamo al siguiente nivel para tener más manos y perspectivas distintas
- ❌ Comunico estado a stakeholders y clientes antes de cualquier acción técnica

**Objetivo:** pregunta clave — separa al ingeniero teórico del operativo.
En P1 el principio es "stop the bleeding first, diagnose later". Quien
responde "sigo investigando" suele ser alguien que nunca ha estado de
guardia en un incidente con pérdida de dinero cada minuto. Las otras
opciones no son malas pero vienen después del revert.

### Q5 · Observabilidad desde cero (w=2)

> Heredas una plataforma AWS (Node + Postgres en App Runner) sin ninguna
> observabilidad. ¿Qué montas en las dos primeras semanas?

- ❌ CloudWatch Logs + Alarms de CPU/memoria — suficiente para empezar
- ❌ Sentry para errores + CloudWatch para métricas de infraestructura
- ✅ **Logging estructurado JSON, Sentry, métricas de negocio custom (Datadog/Grafana) y tracing distribuido (OpenTelemetry) en los endpoints críticos**
- ❌ Stack ELK self-hosted para tener control total del pipeline de logs

**Objetivo:** ver ambición y estándar de calidad. En 2024-2025 un stack
mínimo viable incluye logging estructurado + error tracking + métricas de
negocio + tracing. Quien elige sólo CloudWatch está atrasado 5 años;
quien elige ELK self-hosted está eligiendo trabajo operativo en vez de
trabajo de producto. La opción correcta es la que un senior monta en 2
semanas y deja funcionando sin self-host.

### Q6 · Credenciales hardcodeadas (w=2)

> Descubres credenciales de BD hardcodeadas en un script de migración que
> lleva 6 meses en el repo. ¿Cuál es tu primer paso?

- ✅ **Rotar las credenciales inmediatamente en RDS, después mover a Secrets Manager y purgar el histórico**
- ❌ Mover a variables de entorno y hacer un commit revirtiendo el script
- ❌ Abrir un ticket en el backlog para el próximo sprint
- ❌ Auditar el histórico de Git primero para detectar más secretos expuestos

**Objetivo:** instinto de seguridad. Un secret leakeado 6 meses es un
secret comprometido: rotar YA, el resto viene después. Quien elige
"auditar primero" no entiende que cada minuto de delay amplía la
ventana; quien elige "ticket para el sprint" es una bandera roja.

---

## Bloque 2 · IA aplicada (4 preguntas)

### Q7 · Guardrail crítico en agente con side-effects (w=3)

> Pones en producción un agente que llama APIs internas (consulta BD,
> envía emails, crea tickets). ¿Qué guardrail es MÁS crítico para evitar
> daño operativo real?

- ❌ Rate-limit por usuario y por tool para controlar el coste
- ✅ **Allowlist de tools + paso de confirmación humana para acciones con efectos secundarios (escrituras, emails, pagos)**
- ❌ Logging exhaustivo y trazas para auditoría post-hoc
- ❌ Retries con backoff exponencial ante errores de tool

**Objetivo:** experiencia real operando agentes. Quien ha roto cosas con
un agente en producción sabe que el guardrail que te salva no es el
logging (reactivo) ni el rate-limit (de coste) — es la allowlist +
human-in-the-loop para acciones destructivas. Respuesta equivocada suele
indicar que el candidato sólo ha hecho demos, no producción.

### Q8 · Frameworks de orquestación (multi, w=2)

> ¿Con qué frameworks de orquestación de agentes has trabajado en
> proyectos reales puestos en producción? (multi-select)

Opciones: LangChain/LangGraph · Mastra · AutoGen/AG2 · CrewAI · Vercel AI
SDK · Semantic Kernel · Claude Agent SDK · Orquestación propia ·
Ninguno todavía.

**Objetivo:** inventario rápido de experiencia real. No hay "correcta" —
marcar muchos sin contexto es sospechoso; marcar "ninguno" es honesto y
puede ser válido si el candidato ha montado orquestación propia. El
scoring da crédito parcial por haber marcado al menos 2.

### Q9 · Alucinación con tool-call "not_found" (w=2)

> Un agente en producción responde con información fabricada sobre un
> cliente (datos que no existen en la BD). Los logs muestran que el
> tool-call correcto se invocó y devolvió "not_found". ¿Causa más
> probable?

- ✅ **El prompt no obligaba al agente a priorizar el resultado del tool sobre su conocimiento previo — el modelo rellenó el hueco**
- ❌ El modelo está mal afinado para tu dominio y hay que cambiar de proveedor
- ❌ Falta un retry loop que reintente el tool al recibir "not_found"
- ❌ El contexto se truncó y el modelo no llegó a ver la respuesta del tool

**Objetivo:** identificar al que entiende cómo los LLMs interpretan
tool-results. Cuando un tool dice "not_found", el modelo decide si usa
ese resultado o su knowledge-base — y sin un prompt claro ("si el tool
devuelve not_found, responde 'no encontrado'"), alucina. Las otras
opciones son distractores plausibles pero equivocados.

### Q10 · Mejora real de programación agéntica (w=2)

> Llevas 2+ meses usando Claude Code/Cursor en tu flujo diario. ¿Dónde
> ves la mejora MÁS significativa?

- ❌ Velocidad de escribir código rutinario (boilerplate, tests, CRUD)
- ❌ Exploración de código ajeno y onboarding a repositorios nuevos
- ✅ **Abordar refactors de gran alcance que antes no hacías por coste-beneficio**
- ❌ Eliminar tareas "de fontanería" (CI, scripts, configuración) que antes aplazabas

**Objetivo:** los que llevan 2+ meses usando agentic coding en serio
coinciden en que el cambio real no es la velocidad (efecto superficial)
sino el **cambio en lo que te atreves a hacer**: refactors amplios,
migraciones grandes, exploraciones que antes descartabas por coste. Quien
elige "velocidad" suele ser usuario casual. Las otras dos son respuestas
parciales pero no capturan el cambio cualitativo.

---

## Bloque 3 · Liderazgo de equipo (4 preguntas)

### Q11 · Senior que frena code reviews (w=3)

> Un senior de tu equipo escribe código excelente pero sus code reviews
> tardan y frenan al resto del equipo. Llevas 3 sprints detectando el
> patrón. ¿Qué haces PRIMERO?

- ❌ Le quito los code reviews y los reasigno a otros seniors para desbloquear al equipo
- ✅ **1:1 directo: expongo el patrón con datos y le pregunto qué está pasando**
- ❌ Defino un SLA de review (<24 h) y lo muestro públicamente en el dashboard del equipo
- ❌ Escalo a su manager o a RRHH para documentar el problema de rendimiento

**Objetivo:** instinto de gestión de personas. El primer movimiento con
un senior siempre es la conversación 1:1, no la acción estructural. Las
otras opciones no son incorrectas pero son segundo o tercer paso —
quitar los reviews es castigo, el SLA público es management by metric, y
escalar es nuclear. Un líder ingenieril maduro conversa primero.

### Q12 · Primer hire crítico (w=3)

> Entras como Head of Engineering y heredas un equipo de 3 developers
> (1 senior, 2 mid) sin tech lead. El producto debe escalar y añadir
> agentes de IA en los próximos meses. ¿Cuál es tu PRIMER hire?

- ❌ Otro mid-level backend para añadir capacidad de desarrollo
- ❌ Un DevOps senior para profesionalizar la infraestructura
- ❌ Un ML/AI engineer para liderar la capa de agentes
- ✅ **Un senior generalista / tech lead que eleve el estándar técnico y pueda mentorizar a los mid-level**

**Objetivo:** distingue el ingeniero-ejecutor del líder-organizativo. La
trampa aquí son las opciones "especialistas" (DevOps o ML engineer) —
parecen sensatas porque sí hay necesidad de infra e IA, pero añadir un
especialista a un equipo sin leadership técnico **crea silos sin
mentorship**. El hire correcto antes de especializar es el que eleva el
estándar del equipo existente, multiplica los 2 mid-level y puede
arquitecturar la fase de agentes cuando llegue. Piensa en leverage
organizativo, no en coverage de skills. Respuesta equivocada sugiere que
el candidato piensa como IC senior, no como Head of Engineering.

### Q13 · Productividad en remoto multi-zona (w=2)

> ¿Cómo garantizas productividad y alineación de un equipo de desarrollo
> 100% remoto repartido en 2-3 husos horarios?

- ❌ Standup diario obligatorio por videollamada + entregables de granularidad diaria
- ❌ Objetivos semanales escritos + revisión asíncrona de código + métrica de throughput por PR
- ❌ Confianza total — mido solo por resultados trimestrales, sin cadencia fija
- ✅ **Objetivos semanales escritos, daily async en texto, PR review en <24 h y una call síncrona semanal**

**Objetivo:** pragmatismo en remoto. La única opción que combina:
objetivos escritos (porque remoto sin escribir = caos), async por
defecto (porque husos), cadencia corta pero no diaria (porque no
sobrecargar), y un punto sincrónico mínimo para cohesión. Standup diario
por video en husos distintos es tortura; "confianza total, sólo
trimestres" es abdicación.

### Q14 · Organización con productividad x3 (w=2)

> Tu equipo está escribiendo código x3 más rápido gracias a programación
> agéntica. ¿Qué cambia estructuralmente en cómo organizas el trabajo?

- ❌ Nada estructural — mismo proceso, solo que caben más features en el sprint
- ❌ Subo el listón de code review y añado más testing porque se genera más código
- ✅ **Rediseño el flujo: más tiempo en especificación y arquitectura antes de escribir, el code review pasa a ser el cuello de botella, y los sprints se miden en "problemas resueltos" y no en "tickets cerrados"**
- ❌ Reduzco el equipo a la mitad y mantengo el output — optimización de coste

**Objetivo:** entiende el candidato que agentic engineering cambia la
función del ingeniero. Quien elige "nada cambia" o "mismo proceso +
tests" no ha sentido el cambio real. Quien elige "reducir el equipo" no
ha pensado en la calidad del output. La respuesta correcta es la que se
alinea con la visión del puesto en Alter5.

---

## Bloque 4 · Producto y negocio (2 preguntas)

### Q15 · Stakeholder sin background técnico (w=2)

> Un stakeholder de negocio sin background técnico te pide una feature
> urgente. Su propuesta técnica no tiene sentido y bloquearía el
> roadmap. ¿Qué haces primero?

- ❌ Le explico por qué no es viable y propongo una alternativa técnica
- ✅ **Entiendo primero el problema de negocio real que quiere resolver antes de evaluar si su solución es la correcta**
- ❌ Lo implemento como pide para no bloquear al negocio y lo refactorizo después
- ❌ Lo escalo al Product Manager para que lo priorice y lo traduzca

**Objetivo:** principio básico de diseño de producto: separar problema
de solución. La opción 0 "le explico por qué no" es la respuesta del
ingeniero que nunca ha trabajado con negocio — entra directamente al
cómo sin entender el qué. La opción 3 es abdicación. La correcta
requiere humildad y curiosidad hacia el problema.

### Q16 · Cliente enterprise con plazo corto (w=2)

> Un cliente enterprise clave necesita una integración funcionando en 2
> semanas o cancela el contrato. La solución técnicamente correcta tarda
> 6 semanas. Una solución "sucia" cabe en 2. ¿Qué haces?

- ✅ **Entrego la solución sucia en 2 semanas con deuda técnica explícita y plan de refactor a 3 meses**
- ❌ Entrego la sucia y el refactor lo vemos más adelante cuando haya tiempo
- ❌ Rechazo el plazo — la deuda técnica causará problemas peores más adelante
- ❌ Escalo al CEO/CTO para que decida, esto no es decisión mía

**Objetivo:** madurez técnica + sentido de negocio. La deuda técnica se
gestiona, no se evita. Entregar sucio sin plan de refactor es
irresponsable; rechazar el plazo es inmaduro (perder un cliente
enterprise por pureza arquitectural); escalar al CEO es no asumir
responsabilidad. La correcta combina las dos cosas: entregar + gestionar
la deuda con fecha.

---

## Bloque 5 · Compromiso y dedicación (2 preguntas)

### Q17 · Compromisos profesionales activos (w=3)

> ¿Tienes actualmente algún compromiso profesional activo que tendrías
> que compatibilizar con este rol?

- ✅ **No, dedicación exclusiva desde el día 1**
- ⚠️ Tengo un compromiso menor que termina en menos de 30 días
- ❌ Tengo compromisos activos pero creo que puedo compatibilizarlos
- ❌ Prefiero no responder

**Objetivo:** filtro crítico. Alter5 ha tenido (y está teniendo) el
problema de contratar gente que mantiene empleos en paralelo — es la
razón del bloque entero. La opción correcta es la inequívoca. Las
opciones 1 y 2 son **bandera amarilla/roja** según el caso; la opción 3
("prefiero no responder") es descarte casi automático.

### Q18 · Developer trabaja en paralelo sin declararlo (w=2)

> Detectas que uno de tus developers trabaja para otra empresa en
> paralelo sin haberlo declarado. ¿Cómo actúas?

- ✅ **Conversación directa, primera advertencia formal, y si reincide, despido**
- ❌ Despido inmediato — es una falta de confianza irrecuperable
- ❌ Analizo primero si afecta a su rendimiento antes de tomar acción
- ❌ Lo escalo a RRHH o dirección para que lo gestionen

**Objetivo:** medida proporcional. Un líder maduro no despide en la
primera infracción (opción 1, reacción emocional) ni relativiza el tema
por rendimiento (opción 2, no entiende que el problema es la confianza,
no la productividad) ni delega (opción 3, abdicación). La respuesta
correcta es la que combina confrontación directa + consecuencia
proporcional + escalado si reincide.

---

## Bloque 6 · Compensación (1 pregunta · no puntúa)

### Q19 · Sueldo bruto anual

> ¿Cuál es tu expectativa de sueldo bruto anual?

**Formato:** input numérico con formateo automático (`75000` → `75.000 €`).
**Objetivo:** información de compatibilidad con banda salarial del puesto.
No influye en la puntuación del candidato — sólo en la decisión final de
oferta.

---

## Bloque 7 · Motivación (1 pregunta · no puntúa)

### Q20 · ¿Qué te atrae MÁS de la posición?

> ¿Qué es lo que MÁS te atrae de esta posición en Alter5?

- Liderar la adopción de agentic engineering (x3 productividad) en un equipo real
- La oportunidad técnica: arquitectura AWS + IA en un stack que crece rápido
- El proyecto de negocio: construir la capa tecnológica de una fintech de banca de inversión
- La autonomía: ser el responsable técnico principal de toda la plataforma
- Las condiciones económicas y el nivel de responsabilidad del rol

**Objetivo:** señal cualitativa de alineación. No hay respuesta correcta.
El recruiter usa esto para:
- Decidir cómo "vender" la oferta en la llamada final (qué eje enfatizar)
- Detectar mismatch cuando un candidato que puntúa alto técnicamente
  elige exclusivamente "condiciones económicas" — puede no quedarse
- Detectar alineación fuerte cuando elige "agentic engineering" o
  "autonomía" — ese perfil encaja con la visión de la posición

El grader (LLM) incluye esta respuesta en el informe con 1 línea de
interpretación.

---

## Apéndice · Anti-cheating

Por cada pregunta el sistema registra:

- **Tiempo de respuesta** (`min` / `sus` por pregunta): muy rápido = no
  razonó, muy lento = consultó externamente
- **Pegados** (`pasteCount`, `pasteChars`): cualquier pegado >20 chars se
  flagea
- **Cambios de pestaña** (`tabSwitches`, `tabAwayTime`): >2 cambios o
  >30 s fuera se flagea
- **Ráfagas de tecleo** (`burstCount`): teclas a <50 ms sugieren pegado
  con teclado simulado

El grader de Claude recibe todo esto y lo menciona explícitamente en la
sección "Señales de alerta" del informe.

---

## Apéndice · Scoring client-side

```
Por pregunta (single):
  - acierto:       pts = w × 3
  - fallo:         pts = w × 1  (algo de crédito parcial)

Por pregunta (multi):
  - ≥2 opciones:   pts = w × 3
  - 1 opción:      pts = w × 2
  - 0 opciones:    pts = 0

Dimensiones excluidas del scoring: compensation, motivation
```

La puntuación global (`globalScore /10`) y las puntuaciones por dimensión
(`%`) se calculan en cliente y se muestran en `/reports`. El informe
cualitativo del grader es lo que realmente se lee para decidir.

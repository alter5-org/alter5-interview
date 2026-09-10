# Test — Growth & Marketing Manager B2B (IA y automatización)

Documento de referencia interno. Describe cada pregunta, la opción correcta,
el **objetivo** (qué discrimina) y por qué los distractores son creíbles.
Fuente de verdad del banco: `questions.json` (se sube con
`scripts/push-position.js growth-marketing-manager`).

**Formato general:**
- 16 ítems · prueba breve (sin duración publicada; los supuestos son cortos)
- 10 de opción única (puntúan, w2) + 3 de respuesta libre (puntúa el grader
  LLM, 0-10 cada una vía `<!--SCORES-->`, guardadas como evento
  `interview_case_scored`) + 1 compromiso (w2) + 1 salario + 1 motivación (no
  puntúan)
- Scoring server-side (`lib/interview-scoring.js`): acierto `w×3`, fallo
  `w×1`, abierta `w×3×score/10`. Bloques `compensation` y `motivation`
  excluidos. `multiwork` marca flag de dedicación.
- Pesos efectivos (máximo por bloque = suma de w×3): Ejecución 18 · Medición
  24 · IA 18 · Caso 30 (dos abiertas w5) · Trayectoria 9 · Compromiso 6.
  Total 105: caso 29 %, supuestos 57 %, trayectoria 9 %.
- Diseño revisado con GPT 6 Astra (2026-09-10). Cambios adoptados de esa
  revisión: retirar tres ítems de deseabilidad obvia (iniciativa sin owner,
  informe sin distribución, contenido IA de relleno) y sustituirlos por
  situaciones con números; subir el peso del mini-caso partiéndolo en dos
  abiertas; trayectoria de una sola iniciativa con contribución propia;
  filtro de CV con "evidencia insuficiente" en vez de descarte por palabras
  clave. Rechazado: cambiar el scoring global (fallo = 0) porque afecta a
  HoE y RT; queda como deuda de plataforma.
- Decisiones del fundador: título "Growth & Marketing Manager B2B | IA y
  automatización"; desde 1 año sin tope; banda 35-40k + 15 % variable + plan
  de acciones; régimen anti-IA igual que RT; landing declara filtro con IA y
  revisión humana de descartes.

---

## Bloque 1 · Ejecución del plan (3 × w2)

### #0 · Primera semana, ocho iniciativas
✅ Acordar dos o tres en marcha con objetivo, métrica y fecha; el resto en
cola explícita con criterio de entrada.
**Objetivo:** capacidad de priorizar y de negociar alcance con el cofundador.
Abrir las ocho es deseabilidad de "hacerlo todo"; empezar por marca elige lo
visible sobre lo medible; pedir refuerzo antes de arrancar es no asumir el rol.

### #1 · Proveedor con dos semanas de retraso, publicación en diez días
✅ Recortar a versión publicable, entregables diarios para lo que falta, fecha
nueva comunicada con plan.
**Objetivo:** gestionar alcance y expectativas bajo restricción. Presionar sin
cambiar alcance no resuelve; retrasar en silencio rompe la confianza del
cofundador; cambiar de proveedor a diez días es inviable.

### #2 · Informe terminado, cero presupuesto, 1.200 contactos
✅ Segmentar, secuencia con landing tras formulario y UTM, tres piezas en
LinkedIn, lista semanal a originación.
**Objetivo:** distribución instrumentada que termina en reuniones. Publicar y
esperar no genera pipeline; el correo único adjunto no mide ni segmenta; la
nota de prensa busca alcance, no reuniones cualificadas.

## Bloque 2 · Medición y atribución (4 × w2)

### #3 · Campaña A vs campaña B (GPT 6 Astra)
✅ Aumentar B de forma limitada y seguir midiendo avance y valor.
**Objetivo:** economía del embudo. B tiene menor coste por oportunidad (500 €
frente a 1.000 €). Escalar A seduce por coste por lead; triplicar B extrapola
seis oportunidades sin cierres; congelar paraliza el aprendizaje.

### #4 · Informe → evento de partner → solicitud directa (GPT 6 Astra)
✅ Registrar origen y contactos influyentes con regla fija y documentada, sin
afirmar causalidad.
**Objetivo:** honestidad en la atribución. Último clic y primer contacto son
modelos habituales pero incompletos; el reparto a tercios parece equilibrado
pero inventa precisión causal.

### #5 · Métrica principal del observatorio
✅ Registros de empresas que encajan con el criterio de originación;
descargas y visitas como secundarias.
**Objetivo:** distinguir métrica de negocio de métrica de vanidad. Descargas
es el distractor creíble: es un indicador temprano útil, pero no discrimina
la calidad del lead.

### #6 · UTM inconsistentes y 40 % de origen vacío, cuadro esta semana
✅ Convención de UTM y origen obligatorio desde hoy, reconstruir lo que
permitan reglas, entregar con "origen desconocido" explícito y su porcentaje.
**Objetivo:** entregar con datos imperfectos sin mentir. Retrasar hasta
limpiar todo incumple; rellenar como directo falsea el cuadro; dejar el CRM
fuera esconde el 40 %.

## Bloque 3 · Agentes IA y automatización (3 × w2)

### #7 · Agente selecciona 200 empresas, 6 de 20 erróneas (GPT 6 Astra)
✅ Bloquear la activación, clasificar errores, corregir y validar otra muestra.
**Objetivo:** control operativo de una automatización. Regenerar sin
verificar confía en una corrección no probada; retirar seis extrapola
indebidamente la muestra (30 % de error); revisar a mano las 200 resuelve el
lote pero conserva el fallo.

### #8 · Flujo del informe semanal roto un viernes
✅ Localizar el paso, sacar el informe de esta semana con parche o a mano, y
añadir alerta y validación de salida.
**Objetivo:** cumplir el compromiso y evitar el fallo silencioso. Esperar a
tecnología es no asumir el flujo; reconstruir en otra herramienta es
sobrerreacción; volver al manual permanente renuncia a la automatización.

### #9 · Boletín mensual automatizado con IA
✅ Datos estructurados de entrada, plantilla fija, redacción citando datos,
revisión humana antes del envío, apertura y clic por edición.
**Objetivo:** diseño de un flujo con validación. El prompt abierto con envío
automático es el riesgo real; escribir a mano con IA de corrector no
automatiza; el freelance ignora la responsabilidad del puesto.

## Bloque 4 · Mini-caso (#10 y #11 · open · w5 · minChars 500 / 300)

Datos de partida comunes: 6.000 € para seis semanas, tiempo completo más 4 h
de producto y 2 h de originación semanales, 1.200 contactos con
consentimiento, LinkedIn con 3.000 seguidores, CRM y analítica web configurados.
Objetivo: reuniones cualificadas con empresas que necesitan 1-10 M€.

- **#10 Plan de seis semanas.** Rúbrica en `interview-prompt.md`: 30 %
  priorización, secuencia y entregables · 30 % embudo, métrica principal,
  instrumentación y regla de decisión en semana 4 · 20 % coherencia con la
  iniciativa y el objetivo · 10 % coordinación y dependencias · 10 % riesgos
  y alternativas. Genérico ≤3; ejecutable con semanas, métrica correcta y
  regla ≥8.
- **#11 Automatización con IA.** Rúbrica: 30 % entradas, herramientas y
  salida · 30 % validación antes de llegar al cliente u originación · 20 %
  modos de fallo y detección · 20 % beneficio cuantificado. "Usaría ChatGPT
  para los correos" ≤3; flujo con validación, fallo y ahorro ≥8. No se
  premian marcas de herramientas.
**Objetivo:** la señal real del test. Es lo que hará el primer trimestre.
Sustituye a la "respuesta de media página" de la JD original.

## Bloque 5 · Trayectoria (#12 · open · w3 · minChars 250)

Una iniciativa ejecutada por el candidato: punto de partida, periodo,
contribución propia frente a la del equipo, qué midió y resultado. Se aceptan
rangos y datos anonimizados. **Objetivo:** separar "participé" de "lo hice y
lo medí". Base para la segunda entrevista.

## Bloque 6 · Compromiso y dedicación (#13 · single · w2)

Heredada de HoE / RT. ✅ Dedicación exclusiva desde el día 1. Peso reducido a
w2 porque el rol no tiene acceso a operaciones; la pregunta de conflicto de
interés de RT no aplica.

## Bloque 7 · Compensación (#14 · salary · no puntúa)
Fijo bruto anual. La pista muestra la banda publicada (35-40k + 15 % variable
+ plan de acciones) para que la respuesta sea comparable.

## Bloque 8 · Motivación (#15 · single sin correct · no puntúa)
Cinco ejes. "Condiciones económicas y plan de acciones" en solitario se
destaca en el informe; "ejecutar de principio a fin", "medir y demostrar" y
"construir automatizaciones sobre un caso real" alinean con el puesto.

---

## Anti-cheating

Igual que HoE y RT (decisión del fundador 2026-09-10): tiempo por pregunta
(`min`/`sus`), pegados, cambios de pestaña, ráfagas de tecleo, copy/click
derecho/atajos/drag bloqueados. Las abiertas usan `sus` amplio (1500 / 1200 /
900 s). El grader recibe las señales y las cita en "Señales de alerta"; para
las abiertas se le pide además una pregunta de segunda entrevista que obligue
a reconstruir el razonamiento sin apoyo. El navegador **no recibe** `correct`.

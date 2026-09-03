# Test — Responsable de Transacciones (ejecución de operaciones)

Documento de referencia interno. Describe cada pregunta, la opción correcta,
el **objetivo** (qué discrimina) y por qué los distractores son creíbles.
Fuente de verdad del banco: `questions.json` (se sube con
`scripts/push-position.js responsable-transacciones`).

**Formato general:**
- 18 ítems · 30-35 min estimados
- 14 de opción única (puntúan) + 2 de respuesta libre (puntúa el grader LLM,
  0-10 cada una vía `<!--SCORES-->`, guardadas como evento
  `interview_case_scored`) + 1 salario + 1 motivación (no puntúan)
- Scoring server-side (`lib/interview-scoring.js`): acierto `w×3`, fallo
  `w×1`, abierta `w×3×score/10`. Bloques `compensation` y `motivation`
  excluidos. `multiwork` marca flag de dedicación.
- Pesos efectivos: Ejecución 15 · Partes 9 · Documentación 4 · Análisis 4 ·
  Caso 5 · Track record 3 · Compromiso 5 (máximo por bloque = suma de w×3).
- Diseño revisado con GPT 5.5 (2026-09-02). Perfil: deal advisor que ejecuta
  y cierra; análisis como apoyo; financiación estructurada deseable.

---

## Bloque 1 · Ejecución de transacciones (5 × w3)

### #0 · De conversación a ejecución
✅ NDA firmado + data room abierto + calendario acordado.
**Objetivo:** distinguir al que sabe cuándo un deal es real. El "nos interesa"
por email y el IC memo interno no comprometen recursos ni los controlamos; el
mandato es prerequisito comercial, no ejecución. Quien elige el mandato piensa
en su comisión, no en el proceso.

### #1 · CP nueva 48 h antes del closing
✅ Evaluar impacto real, alinear promotor y abogados, redacción acotada o
compromiso post-closing.
**Objetivo:** madurez en la recta final. Aceptar sin más es sumisión; rechazar
por "estaba cerrado" rompe el cierre por orgullo; escalar al CEO es no asumir
el rol. La correcta cuantifica y propone.

### #2 · Señal de DD descontrolada
✅ Respuestas tardías, contradictorias y sin owner.
**Objetivo:** el volumen (140 preguntas, 800 documentos, segunda visita) es
normal en una DD seria. El descontrol es de proceso: sin owners y con
contradicciones el inversor pierde confianza. Quien elige volumen no ha
llevado una DD grande.

### #3 · Primer borrador del contrato, dos horas
✅ CPs, reps & warranties, eventos de incumplimiento, mecánica de disposición.
**Objetivo:** saber dónde está el riesgo económico y de cierre en un contrato
de financiación. Ley aplicable e índice son de abogados; los anexos numéricos
vienen después. Distingue al ejecutor del que "revisa formato".

### #4 · Certificado societario menor el día del closing
✅ Waiver condicionado / undertaking post-closing por escrito y trazado.
**Objetivo:** proporcionalidad. Cerrar "sin más" es descuido; posponer por un
documento menor con fondos en escrow es inmadurez; el notario no da fe verbal.
La correcta protege a las partes sin perder el cierre.

## Bloque 2 · Gestión de partes y negociación (3 × w3)

### #5 · DSCR 1,15x vs 1,30x
✅ Cuantificar, traducir posiciones, proponer estructura cerrable.
**Objetivo:** el rol no es abogado de una parte ni espectador. Defender solo al
promotor rompe la credibilidad con el inversor; delegar en despachos o escalar
al CEO es abdicar. La correcta combina números y solución (1,20x + cash sweep
o DSRA).

### #6 · Inversor en silencio 10 días
✅ Llamar al deal lead para entender qué cambió y calentar alternativas sin
romper exclusividad.
**Objetivo:** iniciativa con criterio. Esperar es pasividad; el email con plazo
es torpe; dar el deal por muerto es prematuro. Quien ha cerrado sabe que el
silencio suele ser comité o prioridades, no rechazo.

### #7 · Litigio oculto del promotor
✅ Hablar con el promotor ya y acordar cómo y cuándo se comunica al inversor.
**Objetivo:** integridad + gestión. Retirarlo del data room es grave; esperar a
que pregunte destruye la confianza si lo descubre; ir directo al inversor
rompe la relación con el cliente. La correcta protege el proceso y la
reputación.

## Bloque 3 · Documentación, DD y closing (2 × w2)

### #8 · 40 documentos abiertos a tres semanas
✅ Closing checklist único con owner/estado/fecha, revisión bisemanal,
escalado.
**Objetivo:** método. Delegar en el despacho es perder el control; el email
diario es ruido; priorizar solo lo económico deja CPs societarias que bloquean
notaría.

### #9 · Despacho lento
✅ Issues list consolidada + sesiones de negociación conjuntas.
**Objetivo:** desbloquear sin romper. Cambiar de despacho a mitad es
inviable; redactar cláusulas uno mismo es invadir; ampliar calendario es
rendirse antes de intentarlo.

## Bloque 4 · Análisis y modelización (2 × w2)

### #10 · "Aguanta 30 M€ porque 6x EBITDA"
✅ En project finance se dimensiona por CFADS/DSCR sobre el tenor, no por
múltiplo.
**Objetivo:** criterio financiero mínimo para hablar con un inversor de deuda.
"Depende del inversor" y "por prudencia 20 M€" son evasivas; "6x es estándar"
es error conceptual.

### #11 · Presentar sensibilidades al comité
✅ Impacto por variable en DSCR mínimo y TIR, cuál rompe covenants primero,
más downside combinado.
**Objetivo:** saber qué necesita un comité de inversión. Tres escenarios con
TIR es lo que hace un junior; "solo P90" confunde bancos con fondos.

## Bloque 5 · Mini-caso de ejecución (#12 · open · w5 · minChars 500)

Refinanciación de 25 M€ con term sheet no vinculante, DD abierta, data room
incompleto, despacho lento e inversor con 4 semanas. Rúbrica en
`interview-prompt.md`: 30% proceso/hitos/owners · 25% DD y data room ·
20% coordinación y negociación · 15% CPs y closing checklist · 10% riesgos y
plan B. Genérico ≤3; ejecutable con semanas y entregables ≥8.
**Objetivo:** la señal real del test. Es lo que hará el primer mes.

## Bloque 6 · Track record (#13 · open · w3 · minChars 250)

Dos operaciones end-to-end con tipo, importe, partes, rol exacto, fase crítica
y resultado. **Objetivo:** separar "participé" de "cerré". Base para las
preguntas de la segunda entrevista.

## Bloque 7 · Compromiso y dedicación (`multiwork`, 2 preguntas)

### #14 · Compromisos activos (w3) — heredada de HoE
✅ Dedicación exclusiva desde el día 1. "Prefiero no responder" es descarte
casi automático.

### #15 · Compañero asesorando por su cuenta (w2)
✅ Hablar con él, pedirle que lo declare, y comunicarlo si no lo hace.
**Objetivo:** conflicto de interés en un rol con acceso a deals. "No es asunto
mío" y "que me incluya" son banderas rojas; ir a dirección sin hablar antes es
correcto en fondo pero pobre en forma.

## Bloque 8 · Compensación (#16 · salary · no puntúa)
Fijo bruto anual. El variable por operaciones cerradas se define en la oferta.

## Bloque 9 · Motivación (#17 · single sin correct · no puntúa)
Cinco ejes. "Condiciones económicas" en solitario se destaca en el informe;
"cerrar con autonomía" y "tú a tú con inversores" alinean con el puesto.

---

## Anti-cheating

Igual que HoE: tiempo por pregunta (`min`/`sus`), pegados, cambios de
pestaña, ráfagas de tecleo, copy/click derecho/atajos/drag bloqueados. Las
abiertas usan `sus` amplio (1500 s / 900 s) para no flaggear a quien escribe
con calma; el grader recibe las señales y las cita en "Señales de alerta".
Desde esta versión el navegador **no recibe** `correct`.

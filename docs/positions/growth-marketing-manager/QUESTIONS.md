# Test — Growth & Marketing Manager B2B (IA y automatización)

Documento de referencia interno. Fuente de verdad del banco: `questions.json`
(se sube con `scripts/push-position.js growth-marketing-manager`).

**Formato general (v2, 2026-09-10):**
- 12 ítems · objetivo 3-5 minutos reales. Decisión del fundador tras probar la
  v1 (16 ítems con mini-caso largo): la prueba debe ser corta y centrarse en
  automatización, atribución con datos propios y herramientas reales (Claude
  Code, GitHub, n8n, agentes), con 3 preguntas de negocio como máximo.
- 2 selección múltiple (declaración de herramientas y de cuadros de mando
  montados) + 1 respuesta libre corta (flujo de IA propio, 120 caracteres
  mínimo) + 6 opción única + compromiso + salario + motivación.
- Scoring server-side (`lib/interview-scoring.js`): single acierto `w×3`,
  fallo `w×1`; multi ≥2 opciones `w×3`, 1 opción `w×2`; abierta
  `w×3×score/10` (grader vía `<!--SCORES {"1": n}-->`). `compensation` y
  `motivation` no puntúan; `multiwork` marca flag.
- Pesos efectivos (máximo por bloque): IA 33 (48 %) · Atribución 15 (22 %) ·
  Negocio 18 (26 %) · Compromiso 3. Total 69.
- Duración mostrada: `interview.html` estima por tipo (0,4 min single, 0,6
  multi, 1,5 abierta, mínimo 5, rango de 2) → "unos 4-6 minutos" con este banco. La
  fórmula anterior (`máx(10, ítems×0,75 + abiertas×7)`) decía 11-16.
- Las dos preguntas múltiples son autodeclaraciones: el grader las contrasta
  con la respuesta libre y propone preguntas de entrevista que pidan un
  ejemplo verificable por herramienta marcada.

---

## Bloque IA y automatización (#0-#3)

### #0 · Herramientas usadas para construir (multi · w3)
Claude Code · GitHub · n8n/Make/Zapier · APIs de modelos · Agentes/MCP/RAG ·
Cursor/Copilot · Scripts Python/JS. Sin opciones negativas: marcar dos o más
da el máximo; la verificación es la #1 y la entrevista.

### #1 · Flujo de IA propio (open · w4 · minChars 120)
Entrada, herramienta, salida, validación, ahorro. Rúbrica en
`interview-prompt.md`: 30 % entrada/herramienta/salida · 30 % validación ·
20 % fallo y detección · 20 % beneficio y autoría. "Uso ChatGPT para correos"
≤3; flujo con validación y ahorro ≥8. No se premian marcas.

### #2 · Agente selecciona 200 empresas, 6 de 20 erróneas (single · w2)
✅ Bloquear, clasificar errores, corregir, validar otra muestra. Regenerar sin
verificar, retirar seis (extrapola un 30 % de error) y revisar a mano las 200
sin arreglar el flujo son los distractores. (GPT 6 Astra)

### #3 · Flujo del informe semanal roto un viernes (single · w2)
✅ Localizar, sacar el informe con parche o a mano, añadir alerta y validación.
Esperar a tecnología, rehacer en otra herramienta y volver al manual son
distractores creíbles.

## Bloque Atribución y cuadros de mando (#4-#5)

### #4 · Qué has montado tú (multi · w3)
UTM + origen obligatorio · cuadro de embudo automático · atribución
multi-toque documentada · eventos de conversión propios · informe periódico
automatizado · coste por oportunidad por canal. Autodeclaración contrastada
en entrevista.

### #5 · Informe → evento → solicitud directa (single · w2)
✅ Registrar origen e influencias con regla fija, sin afirmar causalidad.
Último clic, primer contacto y reparto a tercios son los distractores. (GPT 6
Astra)

## Bloque Decisiones de negocio (#6-#8)

### #6 · Campaña A vs B (single · w2)
✅ Aumentar B de forma limitada y seguir midiendo (coste por oportunidad 500 €
vs 1.000 €). Escalar A por coste por lead, triplicar B, congelar. (GPT 6
Astra)

### #7 · Ocho iniciativas, primera semana (single · w2)
✅ Dos o tres en marcha con objetivo, métrica y fecha; el resto en cola.
Abrir las ocho, empezar por marca, pedir refuerzo.

### #8 · Informe terminado, cero presupuesto (single · w2)
✅ Segmentar, secuencia con landing y UTM, tres piezas en LinkedIn, lista
semanal a originación. Publicar y esperar, correo único adjunto, nota de
prensa.

## Compromiso (#9 · single · w1) · Compensación (#10 · salary) · Motivación (#11)
Heredados. Motivación añade la opción "empresa nativa de IA".

---

## Anti-cheating
Igual que HoE y RT: tiempos por pregunta (`min`/`sus`), pegados, cambios de
pestaña, ráfagas, copy/click derecho/atajos bloqueados. La abierta usa `sus`
420 s. El navegador no recibe `correct`.

## Historial
- v1 (2026-09-10, mañana): 16 ítems con mini-caso en dos abiertas w5; diseño
  revisado con GPT 6 Astra. Retirada el mismo día por duración.
- v2 (2026-09-10, tarde): 12 ítems cortos, foco en herramientas de IA y
  atribución propia.

# Vídeo de Julie Swan — Responsable de Transacciones

Guion de 30 s (≤ 80 palabras) para la tarjeta de vídeo de la landing
`/positions/responsable-transacciones` (ver `docs/julie-swan/README.md`, sección
"Per-position video"). **Estado: validado por Miguel Solana el 2026-09-11 (ver hilo
"Guion vídeo Julie Swan — Responsable de Transacciones (para validar)"). Listo para generar.**

> Hola, soy Julie Swan, agente de IA y Talent Manager de Alter5; trabajo supervisada por el
> equipo. El proceso para Responsable de Transacciones tiene tres pasos. Uno: subes tu CV; lo
> revisamos en horas. Dos: una prueba online de 30-35 minutos: catorce situaciones prácticas de
> ejecución de operaciones, un mini-caso y tu historial de operaciones. Valoramos el criterio en
> la ejecución, no las respuestas de manual. Tres: entrevista con el equipo directivo. Todo
> confidencial. Te esperamos.

Cambios de Miguel sobre el borrador original (email 2026-09-11 18:32):
- "30–35 minutos" en vez de "unos treinta minutos", para que coincida exactamente con el proceso.
- "catorce situaciones prácticas" en vez de "catorce supuestos prácticos" — "supuestos" sonaba
  académico.
- Se quitó "con una persona detrás de cada decisión": si ya se explica al principio que Julie es
  una agente de IA supervisada por el equipo, es suficiente.
- Se mantienen "valoramos el criterio en la ejecución, no las respuestas de manual" y "entrevista
  con el equipo directivo" (sin personalizar), que Miguel confirmó explícitamente conservar.

**Nota 2026-09-12:** el mismo hilo de correo derivó en el diseño de una entrevista técnica
conversacional (ver `docs/positions/responsable-transacciones/orchestrator-prompt.md` cuando
exista) que sustituirá el test de 14+2 preguntas descrito arriba. Este guion describe el proceso
**actual** (MCQ). Cuando la entrevista conversacional esté en producción, reescribir este guion
una sola vez para reflejar el proceso final (10-12 min, conversación de texto) y regenerar el
vídeo — no generar dos veces.

Generación prevista: mismo pipeline que GMM (Higgsfield Seedance 2.5, `omni_reference`, 30 s,
720p, 16:9, referencia = retrato canónico de Julie `julie/avatar.webp`), ~195 créditos.
**Bloqueado 2026-09-14: saldo Higgsfield 139.61 créditos, insuficiente.** Generar cuando se
recargue el saldo o se liberen créditos de otro trabajo.
Salida: `julie/rt-proceso.mp4`, `julie/rt-proceso-poster.jpg`, `julie/rt-proceso.es.vtt` y
entrada `responsable-transacciones` en `julie/videos.json`.

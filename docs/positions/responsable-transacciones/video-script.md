# Vídeo de Julie Swan — Responsable de Transacciones

Guion de 30 s (≤ 80 palabras) para la tarjeta de vídeo de la landing
`/positions/responsable-transacciones` (ver `docs/julie-swan/README.md`, sección
"Per-position video"). Julie solo narra el proceso; la entrevista técnica en sí es la
conversación de texto en la web (`/interview-chat`, ver `orchestrator-prompt.md`), nunca un
vídeo. **Estado: reescrito 2026-09-14 para describir el proceso conversacional. Pendiente de
validación de Miguel Solana (no se ha revisado esta versión) antes de generar en definitiva.**

> Hola, soy Julie Swan, agente de IA y Talent Manager de Alter5; trabajo supervisada por el
> equipo. El proceso para Responsable de Transacciones tiene tres pasos. Uno: subes tu CV; lo
> revisamos en horas. Dos: una entrevista técnica conversacional de 10 a 12 minutos, por texto,
> con un sistema de IA supervisado por nuestro equipo, sobre financiación corporativa, Project
> Finance e inversores. No buscamos respuestas de manual, sino tu razonamiento. Tres: entrevista
> con el equipo directivo. Todo confidencial. Te esperamos.

Cambios respecto a la versión anterior (validada por Miguel para el test MCQ, ahora obsoleta):
- El paso 2 ya no describe una prueba online de opción múltiple de 30-35 minutos, sino la
  entrevista conversacional de texto (10-12 min, tope 15) de `orchestrator-prompt.md` /
  `anchor-bank.json` / `adaptive-bank.json`.
- Se mantiene la apertura de Julie sin cambios ("agente de IA... supervisada por el equipo") y el
  cierre ("entrevista con el equipo directivo... Te esperamos"), que Miguel ya validó y siguen
  aplicando igual.

Generación prevista: mismo pipeline que GMM (Higgsfield Seedance 2.5, `omni_reference`, 30 s,
720p, 16:9, referencia = retrato canónico de Julie `julie/avatar.webp`), ~195 créditos.
Salida: `julie/rt-proceso.mp4`, `julie/rt-proceso-poster.jpg`, `julie/rt-proceso.es.vtt` y
entrada `responsable-transacciones` en `julie/videos.json`.

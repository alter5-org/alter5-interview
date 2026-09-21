# Vídeo de Julie Swan — Responsable de Transacciones

Guion de 30 s (≤ 80 palabras) para la tarjeta de vídeo de la landing
`/positions/responsable-transacciones` (ver `docs/julie-swan/README.md`, sección
"Per-position video"). Julie solo narra el proceso; la entrevista técnica en sí es la
conversación de texto en la web (`/interview-chat`, ver `orchestrator-prompt.md`), nunca un
vídeo. **Estado: reescrito 2026-09-14 para describir el proceso conversacional. Validado por Salvador
el 2026-09-15 sin esperar a Miguel Solana; el texto de abajo es el definitivo para generar.**

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

## Pronunciación (obligatorio al generar)

El TTS de Seedance falla sistemáticamente en dos palabras de este guion, en los dos vídeos
(GMM y RT). Detectado por Salvador el 2026-09-14 revisando las tomas publicadas:

| El guion dice | El TTS pronuncia | Hay que escribir en el prompt |
| --- | --- | --- |
| Alter5 | "Alter finfo" | `Álter Cinco` |
| CV | "sebi" | `ce uve` |

La sustitución va **solo en el texto que se le pasa al generador**. El `.vtt` y el `transcript`
de `videos.json` siguen diciendo "Alter5" y "CV" en letra: son lo que el candidato lee, y además
`npm run test:unit` exige que coincidan entre sí.

Mismo patrón que el arreglo de "IA" vs "AI" de `c01caa6`: fonetizar en el prompt, no en el
subtítulo. Ninguna de las dos tomas publicadas incorpora todavía esta corrección.

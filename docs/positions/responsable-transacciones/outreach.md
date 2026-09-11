# Sourcing — Responsable de Transacciones (Nova Talent)

Revisado con GPT 5.5 (2026-09-02). Perfil: deal advisor que ejecuta y cierra.

## Booleanos (Nova Talent / LinkedIn)

```
("M&A" OR "debt advisory" OR "corporate finance" OR "transaction services" OR "investment banking")
AND ("deal execution" OR execution OR closing OR "due diligence" OR "term sheet")
AND (VP OR "Vice President" OR "Associate Director" OR Director OR Manager)
AND (Spain OR Madrid OR Barcelona)
```

Excluir: `audit junior`, `FP&A`, `controller`, `equity research`, `legal counsel` (si no hay deals).
Seniority: 6-12 años (ideal 7-10). Títulos: VP, Associate Director, Director, Senior Manager Deals/CF, IB Associate/VP, Transaction Manager.

## Empresas objetivo

- **Big4 Corporate Finance / Deals:** Deloitte, PwC, KPMG, EY.
- **Boutiques y advisory:** Arcano, Alantra, AZ Capital, ONEtoONE, Norgestion, Clearwater, DC Advisory, Beka Finance, GBS Finance.
- **Bancos (CIB):** Santander CIB, BBVA CIB, CaixaBank CIB, Sabadell, Bankinter, BNP Paribas, Société Générale, Crédit Agricole CIB.
- **Real estate / infra / deuda:** CBRE Capital Advisors, JLL Capital Markets, Colliers, Savills, Astris, Augusta.
- **In-house M&A / corporate development:** energía, real estate, infraestructuras, industrial con actividad transaccional recurrente.

## Listas

1. `RT-calibración` — 3-5 perfiles conocidos. Objetivo: validar que el mini-caso y el track record discriminan antes de abrir el grifo.
2. `RT-ola1` — ~40 perfiles de las empresas objetivo. Secuencia de contacto con link a `/positions/responsable-transacciones`.

## Mensaje de contacto (≈80 palabras)

> Hola {{nombre}}, estamos buscando un/a Responsable de Transacciones para Alter5, fintech que digitaliza operaciones de deuda y capital para inversores institucionales. Buscamos perfil deal advisory / M&A / corporate finance con experiencia cerrando procesos completos: documentación, DD, negociación, condiciones precedentes y closing. No es un rol solo analítico: requiere interlocución senior con promotores e inversores. Me interesa tu experiencia en transacciones y ver si puede encajar. ¿Te apetece comentarlo 15 minutos?

Seguimiento (día +4): enlace directo a la landing y mención de que el proceso es asíncrono (CV + test de 30 minutos, respuesta en horas).

## Entrada de candidatos

- Landing pública `/positions/responsable-transacciones` (apply + CV).
- CVs recibidos por email o LinkedIn → `/admin` → Subir CV manual con la posición seleccionada.

## Campaña Nova (actualizado 2026-09-11)

Decisión general en `docs/sourcing/nova-replication-analysis.md`.

- Campaña **2031** `Responsable de Transacciones — ola 1`, `LINKEDIN_FIRST`,
  Europe/Madrid, L-V. Shortlist **4431** `RT-ola1` (49 perfiles). DRAFT hasta
  conectar LinkedIn en Nova. Coste: 49 créditos; hay 50 y GMM-ola1 (40) va
  primero → comprar créditos (Starter €49/50, orientativo) o recortar 4431
  con `shortlist_remove_profiles` antes de lanzar.
- Pasos activos: invitación sin nota → mensaje LinkedIn → follow-up 48 h con
  URL → Nova follow-up. Deshabilitados: 2º/3º follow-up LinkedIn y todos los
  pasos Email (2026-09-11; antes el Email intro estaba activo).
- 2026-09-11: UTM añadidos a las 3 URLs (`utm_campaign=rt-ola1`,
  `utm_medium=linkedin|nova|email`) y línea RGPD art. 14 en follow-up, Nova y
  Email. El mensaje inicial de LinkedIn no cambia (ver arriba).
- Lanzar: `campaign_set_message` en cualquier paso → `previewToken` fresco →
  `campaign_launch(2031, previewToken)`.

## Supresión (manual hasta tener listas propias)

- (vacío)

# Estrategia de IA — Wolf (Julio 2026)

## Decisión

**Rebrand temporal: NO vender IA hasta tener acciones tipadas reales.**

La auditoría de producto encontró que el chat (“Asistente AI”) es simulado:

- Mensaje inicial fabricado (RPE 9/10)
- Respuestas por keywords + `setTimeout`
- Acciones “deload / reducir volumen” mutan datos legacy de `AppContext`, no programas WL reales
- Cero integración LLM (OpenAI / Anthropic)

Prometer IA con un mock **destruye confianza** más rápido que no tener asistente.

## Qué hacemos ahora

1. Renombrar UI de “Asistente AI / Wolf AI Assistant” → **“Asistente / Coaching tips”** (tips estáticos honestos, sin fingir análisis).
2. Quitar el mensaje fabricado de fatiga/RPE.
3. Deshabilitar acciones que mutan estado demo sin efecto real en WL programs.
4. Mantener el nombre de producto “Wolf AI” a nivel marca de empresa (histórico), pero **no** presentar el chat como inteligencia artificial funcional.
5. Documentar el path futuro a IA real (abajo).

## Qué NO hacemos aún

- Integrar OpenAI/Anthropic en este sprint (requiere keys, costos, evals, y capa de acciones tipadas).
- Auto-aplicar cambios de programa sin preview humano.

## Path futuro (cuando se reactive IA)

Ver sección 6 de [`PRODUCT_AUDIT_2026.md`](PRODUCT_AUDIT_2026.md):

1. LLM traduce intención → mutaciones tipadas (`sessionMutations`, `programStructureMutations`)
2. Contexto JSON estructurado (roster, PRs, adherencia, programa)
3. Human-in-the-loop: preview diff antes de aplicar
4. Exercise OS como RAG

**Criterio de salida para volver a llamar “AI” al asistente:**

- [ ] Al menos 3 acciones tipadas (progresar %, deload, copiar semana) aplicadas al programa WL real
- [ ] Preview + undo
- [ ] Feature flag + plan Pro
- [ ] Logging / evals mínimas de éxito

## Dueño

Producto + Engineering. UX puede rediseñar el panel una vez removida la promesa falsa.

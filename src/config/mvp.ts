/**
 * Contrato MVP — datos en cliente (sin backend obligatorio en deploy).
 *
 * - **Origen:** JSON embebidos (`src/data/*.json`) vía `loadMockData`, más estado en
 *   `localStorage` (p. ej. asignaciones WL, intakes en AppContext).
 * - **Netlify / drag-and-drop `dist`:** válido; no hace falta levantar Express en producción.
 * - **`npm run server`:** API mock opcional para desarrollo o futura integración; el front
 *   actual no la consume.
 */
export const MVP_CLIENT_USES_MOCK_DATA_ONLY = true as const;

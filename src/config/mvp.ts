/**
 * Contrato MVP — datos en cliente (sin backend obligatorio en deploy).
 *
 * Histórico: Netlify / drag-and-drop `dist` podía funcionar sin Express.
 * **Actualización Julio 2026:** con `VITE_API_URL` el front consume la API (WolfAssignContext).
 * Sin `VITE_API_URL`, sigue el fallback localStorage/demo.
 */
export const MVP_CLIENT_USES_MOCK_DATA_ONLY = false as const;

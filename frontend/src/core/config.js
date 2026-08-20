/**
 * Global Frontend Configuration Object resolving REST API and WebSocket gateway endpoints.
 */
export const config = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/ws/call',
};

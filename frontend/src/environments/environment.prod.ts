export const environment = {
  production: true,
  // URL absoluta del backend en Render — el WebSocket del ranking y los links
  // a /uploads derivan su origen de esta URL, por eso no puede ser relativa.
  // Si el servicio de Render se llama distinto, actualizar aquí y redeployar.
  apiUrl: 'https://legendaryclass-api.onrender.com/api/v1',
};

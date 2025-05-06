const config = {
  apiUrl: process.env.NODE_ENV === 'production'
    ? 'https://meu-backend-amsync.up.railway.app'
    : 'http://localhost:3001',
  frontendUrl: process.env.NODE_ENV === 'production'
    ? 'https://meu-frontend-amsync.up.railway.app' // Corrigido para o URL correto do frontend
    : 'http://localhost:3000'
};

export default config;
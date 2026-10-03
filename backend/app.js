const { createServer } = require('node:http');

const port = Number(process.env.PORT) || 3000;

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/api/health') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ status: 'ok', service: 'julieta-suite-backend' }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'Route tidak ditemukan' }));
});

server.listen(port, () => {
  console.log(`Julieta Suite backend berjalan di http://localhost:${port}`);
});

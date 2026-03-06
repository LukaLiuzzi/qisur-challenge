import 'dotenv/config';
import http from 'http';
import app from './app';
import { initWsServer } from './websocket/server';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
initWsServer(server);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

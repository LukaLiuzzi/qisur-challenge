# qisur-challenge

Backend para el challenge técnico de Qisur. API REST con autenticación JWT, roles, historial de cambios y notificaciones en tiempo real por WebSocket.

## Si bien el challenge fue solicitado con GO, lo implementé en Node.js con TypeScript ya que es mi stack principal y me permite entregar un proyecto más completo y pulido en el tiempo disponible.

Stack: Node.js, TypeScript, Express, PostgreSQL, Prisma, ws, Zod.

## Instalación

Necesitás Node.js 22+ y PostgreSQL corriendo.

```bash
git clone <repo>
cd qisur-challenge
npm install
cp .env.example .env
```

Editá `.env` con tu `DATABASE_URL` y un `JWT_SECRET`, después ejecutá las migraciones:

```bash
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Compilación y producción

```bash
npm run build
npm start
```

## Variables de entorno

```
DATABASE_URL=postgresql://user:password@localhost:5432/qisur_db
JWT_SECRET=token
JWT_EXPIRES_IN=24h
PORT=3000
```

## Usuarios del seed

- admin@qisur.com / password123 (ADMIN)
- client@qisur.com / password123 (CLIENT)
- viewer@qisur.com / password123 (VIEWER)

## Endpoints

**Auth**

- `POST /api/auth/register`
- `POST /api/auth/login`

**Productos** (escritura requiere ADMIN)

- `GET /api/products` — lista paginada. Params: `name`, `minPrice`, `maxPrice`, `categoryId`, `page`, `limit`, `sortBy`, `order`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id` — si cambian `price` o `stock` guarda automáticamente un registro en el historial
- `DELETE /api/products/:id`
- `GET /api/products/:id/history` — params opcionales: `start`, `end`

**Categorías** (escritura requiere ADMIN)

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

**Búsqueda**

- `GET /api/search?type=product&name=solar&minPrice=100`
- `GET /api/search?type=category&name=ilum`

**Logs** (solo ADMIN)

- `GET /api/logs` — lista paginada de registros. Params: `level` (error/warn/info/http/debug), `start`, `end`, `page`, `limit`
- `GET /api/logs/:id`

Documentación en `http://localhost:3000/api/docs`.

## WebSocket

Conectarse con el JWT recibido en el login:

```
ws://localhost:3000/ws?token=<jwt>
```

El servidor cierra la conexión con código `4001` si el token es inválido. Los eventos que llegan son objetos con la forma `{ event, data }`:

- `product:created`, `product:updated`, `product:deleted`
- `category:created`, `category:updated`, `category:deleted`

## Logging

Cada solicitud HTTP se registra automáticamente con su método, ruta, código de respuesta, duración y el ID del usuario si está autenticado. Los errores internos también se loguean con su stack trace. Los logs se escriben en consola en desarrollo y se persisten en la tabla `Log` de la base de datos.

Winston gestiona los niveles `error`, `warn`, `info`, `http` y `debug`. El transporte a la base de datos se activa solo fuera del entorno de test.

## Tests

La suite cubre todos los endpoints REST y el servidor WebSocket con Jest y supertest. Para correr los tests:

```bash
npm test
```

Los tests usan mocks de Prisma para no requerir base de datos. Hay test para auth, productos, categorías, búsqueda, logs y WebSocket.

## Docker

```bash
docker compose up --build
```

Esto levanta la base de datos y la API. Las migraciones y el seed se ejecutan automaticamente al iniciar el contenedor, pero si necesitás correrlos manualmente los comandos son:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed
```

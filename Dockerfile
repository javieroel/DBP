# Imagen de la API: la usan el servidor Ubuntu (docker compose) y Render (producción)
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
# sequelize-cli se necesita para correr migraciones al arrancar
RUN npm ci

COPY . .

# No ejecutar como root dentro del contenedor
USER node
EXPOSE 3000

# Al arrancar: 1) aplica migraciones pendientes, 2) si SEED_ON_START=true carga los datos iniciales
# (los seeders son idempotentes), 3) enciende el servidor. Si un paso falla, el servidor no arranca.
CMD ["sh", "-c", "npx sequelize-cli db:migrate && if [ \"$SEED_ON_START\" = \"true\" ]; then npx sequelize-cli db:seed:all; fi && node app.js"]

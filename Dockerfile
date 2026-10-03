# Imagen de la API para ejecutar en el servidor Ubuntu
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
# sequelize-cli se necesita para correr migraciones al arrancar
RUN npm ci

COPY . .

# No ejecutar como root dentro del contenedor
USER node
EXPOSE 3000

# Aplica migraciones pendientes y luego enciende el servidor
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node app.js"]

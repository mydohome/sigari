FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

RUN mkdir -p /app/downloads /app/downloads/backups

# Commit git da cui e' stata costruita l'immagine (passato da docker-compose,
# valorizzato da update.sh): usato solo per la pagina Impostazioni > Versione.
ARG GIT_COMMIT=dev
ENV GIT_COMMIT=$GIT_COMMIT

EXPOSE 4000

CMD ["node", "src/index.js"]

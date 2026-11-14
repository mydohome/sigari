FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN mkdir -p /app/downloads /app/downloads/backups

# Commit git da cui e' stata costruita l'immagine (passato da docker-compose,
# valorizzato da update.sh): usato solo per la pagina Impostazioni > Versione.
ARG GIT_COMMIT=dev
ENV GIT_COMMIT=$GIT_COMMIT

EXPOSE 4000

# Il compose aspetta che il backend sia sano prima di avviare nginx; il controllo usa l'endpoint di salute
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]

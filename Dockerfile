# ====================================================================
# Dockerfile Multi-Stage: Frontend (Vite) + Backend (Node.js/Express)
# Catálogo de Filmes - Tom Hanks - Professor @siriani
# ====================================================================

# Estágio 1: Build do Frontend React
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Estágio 2: Ambiente de Execução do Backend Node.js
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalação de dependências do backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# Copia o código fonte do backend
COPY backend/ ./

# Copia os arquivos compilados do frontend para a pasta estática do backend
COPY --from=frontend-builder /app/frontend/dist ./public

# Define variáveis padrão
ENV PORT=3000
ENV NODE_ENV=production

# Expõe a porta de execução
EXPOSE 3000

# Inicializa o servidor
CMD ["node", "server.js"]

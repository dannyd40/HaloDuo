# ---- Stage 1 : Build frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
ARG VITE_API_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_STRIPE_PUBLISHABLE_KEY
RUN npm run build

# ---- Stage 2 : Production ----
FROM node:20-alpine
RUN apk add --no-cache nginx supervisor

# Backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ .
RUN mkdir -p /app/backend/uploads

# Frontend static files
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Nginx config
COPY nginx/nginx.production.conf /etc/nginx/nginx.conf

# Supervisor config
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 8080

CMD ["supervisord", "-c", "/etc/supervisord.conf"]

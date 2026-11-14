# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production server stage (pinned; bump deliberately)
FROM nginx:1.30.6-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --chmod=755 docker/15-validate-env.sh /docker-entrypoint.d/
# envsubst fills the proxy URLs and PVE token from env at start
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

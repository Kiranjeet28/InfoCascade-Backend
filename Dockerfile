FROM node:22-slim

WORKDIR /usr/src/app

# Install dependencies first (Docker layer cache)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source
COPY config/ ./config/
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "const http=require('http');http.get('http://localhost:'+process.env.PORT+'/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "src/index.js"]

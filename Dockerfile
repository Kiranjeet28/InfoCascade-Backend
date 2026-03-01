FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
RUN npm install --production

# Bundle app source
COPY . .

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]

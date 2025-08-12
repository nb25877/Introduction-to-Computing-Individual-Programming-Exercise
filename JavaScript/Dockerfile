# Use official Node.js LTS image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Copy .env file (for local dev; for production, use secrets or env variables)
COPY .env .env

# Start the application
CMD ["npm", "start"]
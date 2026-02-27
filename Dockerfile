FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the project files
COPY . .

# Generate Prisma Client after schema is available
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Run migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

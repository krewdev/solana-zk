FROM node:20-slim

# Create app directory
WORKDIR /app

# Install runtime deps
COPY package.json package-lock.json* ./
RUN npm ci --production || npm install --production

# Copy app sources and precompiled artifacts (if present)
COPY . .

# Default command runs the proof script
CMD [ "node", "run_proof.mjs" ]

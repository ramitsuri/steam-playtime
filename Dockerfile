# Stage 1: Build the React application
FROM node:20-alpine AS build-stage

# Set working directory
WORKDIR /app

# Copy dependency files first for layer caching
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Run the build script (Vite) to generate the 'dist' folder
RUN npm run build

# Stage 2: Serve the static files using Nginx
FROM nginx:stable-alpine

# Copy the production build from the first stage to Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
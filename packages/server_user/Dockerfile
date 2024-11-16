# Use an official Node.js runtime as the base image
FROM node:18.20.3   

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install --save

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port on which your server will listen
EXPOSE 3000

# Start the server
CMD [ "node", "server.js" ]
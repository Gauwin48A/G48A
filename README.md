# Verified Mobile Phone Sale Platform

This is a full-stack application for a verified mobile phone sale platform. It includes a React frontend, a Node.js/Express backend, and a PostgreSQL database. This guide provides all the necessary instructions to set up and launch the application in a production environment.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: [Download and install Node.js](https://nodejs.org/) (LTS version recommended).
- **PostgreSQL**: [Download and install PostgreSQL](https://www.postgresql.org/download/).

## Production Launch Guide

Follow these steps to get the application running in a production environment.

### 1. Database Setup

The first step is to create the database and user that the application will connect to.

- **Connect to PostgreSQL**: Open a terminal and connect to your PostgreSQL instance using a superuser account (e.g., `postgres`).
- **Run the setup scripts**: The `database` directory contains all the necessary SQL scripts. Follow the instructions in the `database/README.md` to create the database, user, schema, and seed data.

### 2. Configure Environment Variables

The backend server requires a `.env` file to store sensitive configuration details, such as database credentials and JWT secrets.

- **Create the `.env` file**: Navigate to the `server` directory and create a new file named `.env`.
- **Add the following variables**:

```env
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# JSON Web Token
JWT_SECRET=your_super_secret_jwt_key

# Port for the server to run on
PORT=5000
```

Replace the placeholder values with the credentials you created during the database setup. Ensure you use a strong, unique key for `JWT_SECRET`.

### 3. Install Dependencies and Build the Application

This process involves two main steps: building the client and installing the server dependencies.

#### a. Build the Frontend Client

First, you need to build the static files for the React application.

- **Navigate to the client directory**:
  ```bash
  cd client
  ```
- **Install client dependencies**:
  ```bash
  npm install
  ```
- **Build the client**:
  ```bash
  npm run build
  ```

This will create an optimized production build in the `client/dist` directory.

#### b. Install Server Dependencies

Next, install the dependencies for the backend server.

- **Navigate to the server directory**:
  ```bash
  cd server
  ```
- **Install server dependencies**:
  ```bash
  npm install
  ```

### 4. Start the Application

Once the client is built and the server dependencies are installed, you can start the application.

- **Navigate to the server directory** (if you are not already there):
  ```bash
  cd server
  ```
- **Start the server**:
  ```bash
  npm start
  ```

- **Start the server**:
  ```bash
  npm start
  ```

The server will start, and you can access the application by navigating to `http://localhost:5000` in your web browser. The Express server will serve the React application and handle all API requests.

Your application is now running in production mode!
# Database Setup Guide

This guide provides step-by-step instructions for setting up the PostgreSQL database for this application. The scripts in this directory will create the necessary schema, functions, and seed data.

## Prerequisites

- **PostgreSQL**: You must have PostgreSQL installed and running on your system. You can download it from the [official PostgreSQL website](https://www.postgresql.org/download/).

## Setup Steps

Follow these steps to create the database, user, and tables required for the application to run correctly.

### 1. Create a Database and User

First, you need to create a new database and a user with privileges to access it. You can do this by connecting to your PostgreSQL instance with a superuser account (e.g., `postgres`) and running the following SQL commands:

```sql
-- Create a new database
CREATE DATABASE your_database_name;

-- Create a new user with a secure password
CREATE USER your_username WITH PASSWORD 'your_secure_password';

-- Grant all privileges on the new database to the new user
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;
```

Replace `your_database_name`, `your_username`, and `your_secure_password` with your desired values.

### 2. Configure Environment Variables

The server application connects to the database using credentials stored in an `.env` file in the `server` directory. Create a file named `.env` in the `server` directory and add the following variables, replacing the placeholder values with the ones you just created:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_secure_password
DB_NAME=your_database_name
```

### 3. Run the SQL Scripts

Next, you need to run the SQL scripts in this directory to set up the database schema, functions, and initial data. It is crucial to run them in the correct order to ensure that dependencies are met.

You can run these scripts using the `psql` command-line tool. Connect to your newly created database and execute the files one by one:

```bash
# Connect to the database
psql -U your_username -d your_database_name

# Run the schema script
\i 01_schema.sql

# Run the functions script
\i 02_functions.sql

# Run the seed data script
\i 03_seed.sql
```

Alternatively, you can run them directly from your terminal without entering the `psql` interactive shell:

```bash
# Run the schema script
psql -U your_username -d your_database_name -f 01_schema.sql

# Run the functions script
psql -U your_username -d your_database_name -f 02_functions.sql

# Run the seed data script
psql -U your_username -d your_database_name -f 03_seed.sql
```

## Verification

After running all the scripts, you can verify that the tables have been created by connecting to the database and listing the tables:

```bash
psql -U your_username -d your_database_name -c "\dt"
```

You should see a list of tables, including `users`, `posts`, and `sales`.

Your database is now set up and ready to be used by the application. You can start the server, and it should be able to connect to the database successfully.
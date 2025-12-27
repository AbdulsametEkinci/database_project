# MedicoDB Project

A full stack hospital management dashboard application built with a React frontend, a Flask (Python) backend, and a MySQL database. This project provides a centralized view of patients, encounters, procedures, medications, billing, and more, simulating a real-world hospital information system.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have the following software installed on your machine:

- **MySQL Server 8.0+**: The database used for this project
- **Python 3.8+**: For the backend server
- **Node.js 18+**: For the frontend development server and package management
- **npm** or **yarn**: Package manager for Node.js

### Installation & Setup

Follow these steps to set up your development environment.

#### 1. Database Setup

This project uses an automated script to create the database, build all tables, and load data from CSV files.

- Open the `settings.py` file and update the values to match your local MySQL setup:

  ```python
  # settings.py
  DB_HOST = "localhost"
  DB_USER = "your_mysql_username"      # e.g., "root"
  DB_PASSWORD = "your_mysql_password"  # The password you set for MySQL
  DB_NAME = "medico_db"
  DB_PORT = 3306
  ```

- Once your settings are configured, run the setup script:

  ```bash
  python setup_database.py
  ```

  This script will:
  - Create the `medico_db` database
  - Create all 11 tables with proper constraints
  - Load data from CSV files in the `Dataset_renewed/` directory
  - Set up foreign key relationships and constraints

#### 2. Backend Setup

- Navigate to the project root directory:

  ```bash
  cd Medico_db
  ```

- Install Python dependencies:

  ```bash
  pip install -r requirements.txt
  ```

  Or if you prefer using a virtual environment:

  ```bash
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  pip install -r requirements.txt
  ```

- The backend server will run on `http://localhost:5000`

#### 3. Frontend Setup

- Navigate to the frontend directory:

  ```bash
  cd medico-frontend
  ```

- Install Node.js dependencies:

  ```bash
  npm install
  ```

- The frontend development server will run on `http://localhost:5173` (Vite default port)

## Running the Application

### 1. Start the Backend Server

From the project root directory:

```bash
python run.py
```

Or:

```bash
cd backend
python app.py
```

The backend API will be available at `http://localhost:5000`

### 2. Start the Frontend Server

Open a new terminal window and navigate to the frontend directory:

```bash
cd medico-frontend
npm run dev
```

The frontend development server will start and display the URL (usually `http://localhost:5173`)

### 3. Open the Application

Your React application should now be running. Open your web browser and navigate to:

```
http://localhost:5173
```

**Note**: If you encounter missing dependencies, you may need to install:
```bash
npm install react-router-dom
```

## Troubleshooting

### Database Connection Issues

- Verify MySQL server is running
- Check `settings.py` has correct credentials
- Ensure database `medico_db` exists (run `setup_database.py`)

### Port Already in Use

- Backend: Change port in `backend/app.py` (default: 5000)
- Frontend: Vite will automatically use the next available port

### Import Errors

- Ensure all Python dependencies are installed: `pip install -r requirements.txt`
- Ensure all Node.js dependencies are installed: `npm install`

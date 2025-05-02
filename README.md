# Pressure Falloff Test Analysis

This application provides analysis tools for pressure falloff test data.

## Project Structure
```
.
├── backend/
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.js
│       └── components/
└── EDB_02_Raw_Data_Injection_Gauge.csv
```

## Setup Instructions

### Backend Setup
1. Create a Python virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

### Frontend Setup
1. Install Node.js if not already installed
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

## Running the Application

1. Start the backend server:
   ```bash
   cd backend
   python app.py
   ```
   The backend will run on http://localhost:5000

2. In a new terminal, start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on http://localhost:3000

## Features
- Data visualization of pressure falloff test data
- Analysis tools for pressure transient testing
- Interactive plots and data manipulation
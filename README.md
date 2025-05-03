# Pressure Falloff Test Analysis Tool

## Introduction

This web-based application provides analysis tools for Diagnostic Fracture Injection Tests (DFITs) and pressure falloff test data. It enables interactive semi-derivative curve matching to extract critical reservoir parameters from pressure transient data.

### What is DFIT?

Diagnostic Fracture Injection Tests (DFITs) are small-volume injection ("mini-frac") tests used to create a short fracture in a low-permeability formation and then monitor the pressure decline after shut-in. Analysis of this pressure-transient data yields key properties:

- Closure pressure (stress)
- Formation permeability
- Leak-off behavior
- Flow regime identification

## Key Features

- **Interactive Data Visualization**: Upload and visualize pressure falloff test data
- **Semi-Derivative Analysis**: Automatically computes diagnostic plots (log-log or Bourdet derivative)
- **Reference Slope Lines**: Overlay standard slopes (0, 0.25, 0.5, 1, -0.5) representing ideal flow regimes
- **Interactive Segment Selection**: Click-and-drag to highlight and analyze specific data segments
- **Automated Parameter Calculation**: Extract permeability, leak-off coefficient, closure pressure, and more
- **Flow Regime Identification**: Automatically identify linear, bilinear, radial, and spherical flow regimes
- **Results Dashboard**: View calculated parameters and interpretations in real-time

## Technical Approach

The tool employs established DFIT analysis methodologies:
- Log-log derivative plots for flow regime diagnosis
- Semi-derivative analysis for parameter extraction
- Reference slopes indicating specific flow regimes:
  - 0.25 slope: Bilinear flow
  - 0.5 slope: Linear flow
  - 0 slope (flat): Radial flow
  - -0.5 slope: Spherical flow

## Project Structure

```
.
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── utils.py
│   └── routes/
│       ├── diagnostic.py
│       ├── model.py
│       └── pressure.py
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── services/
│       └── pages/
├── EDB_02_Raw_Data_Bottom_Gauge.csv
├── EDB_02_Raw_Data_Injection_Gauge.csv
├── Reservoir_Information.xlsx
├── main.py
└── Pressure_falloff_test.ipynb
```

## Setup Instructions

### Backend Setup

1. Create a Python virtual environment (recommended):
   ```bash
   python -m venv venv
   venv\Scripts\activate  # On Windows
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

### Frontend Setup

1. Install Node.js if not already installed.
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

## Usage Guide

1. **Upload Data**: Select or drag-and-drop a CSV file containing time and pressure data.
2. **View Raw Data**: Examine the initial pressure vs. time semilog plot.
3. **Switch to Diagnostic View**: View the log-log derivative plot with reference slope lines.
4. **Select Segments**: Click and drag to select linear segments on the plot.
5. **Interpret Results**: View calculated parameters (permeability, leak-off coefficient, closure pressure).
6. **Export Results**: Download the analysis report and plots.

## Academic Background

This tool implements methods established in petroleum engineering literature, including:
- Nolte's G-function method (1979)
- Carter's fluid leak-off model (1957)
- Bourdet's derivative theory
- Barree's holistic interpretation framework
- Modern flow regime identification techniques
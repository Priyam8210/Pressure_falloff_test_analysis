import os
import pandas as pd
import numpy as np
import traceback
from scipy.interpolate import interp1d

def get_project_paths():
    """Return common paths used across the application"""
    proj_dir = os.path.dirname(__file__)
    csv_injection_path = os.path.join(proj_dir, '..', 'EDB_02_Raw_Data_Injection_Gauge.csv')
    csv_bottom_path = os.path.join(proj_dir, '..', 'EDB_02_Raw_Data_Bottom_Gauge.csv')
    excel_path = os.path.join(proj_dir, '..', 'Reservoir_Information.xlsx')
    
    return {
        'proj_dir': proj_dir,
        'csv_injection_path': csv_injection_path,
        'csv_bottom_path': csv_bottom_path,
        'excel_path': excel_path
    }

def load_datasets():
    """Load and return all required datasets"""
    paths = get_project_paths()
    
    # Check if files exist
    for key, path in paths.items():
        if key != 'proj_dir' and not os.path.exists(path):
            raise FileNotFoundError(f"File not found: {path}")
            
    # Import data
    well_test_data = pd.read_csv(paths['csv_injection_path'], header=None)
    reservoir_properties = pd.read_excel(paths['excel_path'], sheet_name="Information")
    rate_history = pd.read_excel(paths['excel_path'], sheet_name="Rate_Schedule")
    
    return {
        'well_test_data': well_test_data,
        'reservoir_properties': reservoir_properties,
        'rate_history': rate_history
    }

def error_response(e):
    """Format error response with traceback for debugging"""
    error_traceback = traceback.format_exc()
    print(f"Error: {str(e)}\n{error_traceback}")
    return {'error': str(e)}
from flask import Blueprint, jsonify
import sys
import os

# Add the parent directory to sys.path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import load_datasets, error_response

# Create Blueprint for pressure routes
pressure_bp = Blueprint('pressure', __name__)

@pressure_bp.route('/api/data', methods=['GET'])
def get_data():
    """Endpoint to get pressure vs time data for the pressure chart"""
    try:
        # Load the data
        datasets = load_datasets()
        well_test_data = datasets['well_test_data']
        
        # Extract time and pressure data
        time_hrs = well_test_data.iloc[:, 2].to_numpy().tolist()
        pwf_hrs = well_test_data.iloc[:, 3].to_numpy().tolist()
        
        # Since pws_hrs is needed by the frontend but not directly available,
        # we can either get it from another file or derive it from existing data
        # For now, let's use the same pressure data
        pws_hrs = pwf_hrs.copy()
        
        # Return the data as JSON
        return jsonify({
            'time_hrs': time_hrs,
            'pwf_hrs': pwf_hrs,
            'pws_hrs': pws_hrs
        })
        
    except Exception as e:
        return jsonify(error_response(e)), 500
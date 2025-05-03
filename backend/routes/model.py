from flask import Blueprint, jsonify, request
import numpy as np
import sys
import os

# Add the parent directory to sys.path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import load_datasets, error_response

# Create Blueprint for model routes
model_bp = Blueprint('model', __name__)

@model_bp.route('/api/calculate-parameters', methods=['POST'])
def calculate_parameters():
    """Endpoint to calculate reservoir parameters based on user-selected points"""
    try:
        # Get input parameters from the request
        data = request.json
        x2_1 = float(data.get('x2_1', 0))
        x2_2 = float(data.get('x2_2', 0))
        y2_1 = float(data.get('y2_1', 0))
        y2_2 = float(data.get('y2_2', 0))
        x3 = float(data.get('x3', 0))
        y3 = float(data.get('y3', 0))
        x4 = float(data.get('x4', 0))
        y4 = float(data.get('y4', 0))
        
        # Load reservoir properties
        datasets = load_datasets()
        reservoir_properties = datasets['reservoir_properties']
        
        # Calculate the parameters based on user inputs exactly as in the notebook
        # Calculate stabilization (average of y values)
        stabilization = (y2_1 + y2_2) / 2
        
        # Calculate permeability using derivative method
        perm_derivative = (70.6 * reservoir_properties['Flow_Rate'].iloc[0] * 
                          reservoir_properties['Viscosity'].iloc[0] * 
                          reservoir_properties['FVF'].iloc[0] / 
                          stabilization /
                          reservoir_properties['Formation_Thickness'].iloc[0])
        
        # Calculate skin factor
        delta_p_for_skin = y3
        skin = 1.15 * ((delta_p_for_skin / 2.303 / stabilization) - 
                      np.log10(x3) - 
                      (np.log10(perm_derivative / 
                               reservoir_properties['Porosity'].iloc[0] /
                               reservoir_properties['Viscosity'].iloc[0] /
                               reservoir_properties['Total_Compressibility'].iloc[0] /
                               reservoir_properties['Wellbore_Radius'].iloc[0]**2)) + 3.23)
        
        # Calculate wellbore storage constant
        time_for_Cs = x4
        slope_wellbore_storage = y4 / time_for_Cs
        wellbore_storage_constant = (reservoir_properties['FVF'].iloc[0] / 24 / slope_wellbore_storage)
        
        # Return the calculated parameters
        return jsonify({
            'stabilization': float(stabilization),
            'permeability': float(perm_derivative),
            'skin': float(skin),
            'wellbore_storage': float(wellbore_storage_constant),
            'x2_1': x2_1,
            'x2_2': x2_2,
            'y2_1': y2_1,
            'y2_2': y2_2,
            'x3': x3,
            'y3': y3,
            'x4': x4,
            'y4': y4
        })
    except Exception as e:
        return jsonify(error_response(e)), 500
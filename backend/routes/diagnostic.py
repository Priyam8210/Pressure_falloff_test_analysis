from flask import Blueprint, jsonify
import numpy as np
import pandas as pd
import sys
import os
from scipy.interpolate import interp1d

# Add the parent directory to sys.path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import load_datasets, error_response

# Create Blueprint for diagnostic routes
diagnostic_bp = Blueprint('diagnostic', __name__)

@diagnostic_bp.route('/api/diagnostic-test', methods=['GET'])
def get_diagnostic_test_data():
    """Test route to return a simple diagnostic dataset for testing the frontend"""
    test_data = {
        'delta_t_hrs': [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0],
        'delta_p_psi': [1.0, 1.5, 2.3, 4.5, 8.2, 15.6, 30.0],
        'm_graph1': [0.5, 0.8, 1.2, 2.0, 4.0, 8.0, 16.0],
        'm_graph_effective_time': [0.6, 0.9, 1.3, 2.1, 4.2, 8.4, 17.0],
        'p_line_fall_off': [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0],
    }
    return jsonify(test_data)

@diagnostic_bp.route('/api/diagnostic', methods=['GET'])
def get_diagnostic_data():
    """Endpoint to get diagnostic plot data"""
    try:
        # Calculate the diagnostic data directly
        print("Calculating diagnostic data...")
        diagnostic_data = calculate_diagnostic_data()
        
        # Return the data as JSON
        return jsonify(diagnostic_data)
    except Exception as e:
        return jsonify(error_response(e)), 500

def calculate_diagnostic_data():
    """Calculate and return diagnostic plot data following the exact steps from the notebook"""
    try:
        # Load the data
        datasets = load_datasets()
        well_test_data = datasets['well_test_data']
        reservoir_properties = datasets['reservoir_properties']
        rate_history = datasets['rate_history']
        
        # Define time periods for analysis
        injection_start_time = 16.3322
        injection_end_time = 25.2925
        falloff_end_time = 145.164
        injection_period = injection_end_time - injection_start_time

        # Extract relevant data from the well test data
        time_hrs = well_test_data.iloc[:, 2].to_numpy()
        pwf_hrs = well_test_data.iloc[:, 3].to_numpy()

        # Extract falloff test data
        extracted_data = well_test_data[(time_hrs >= injection_end_time) & (time_hrs <= falloff_end_time)]
        fall_off_time = extracted_data.iloc[:, 2].to_numpy()
        fall_off_pressure = extracted_data.iloc[:, 3].to_numpy()
        fall_off_pressure1 = fall_off_pressure[0] - fall_off_pressure

        # Create well test table for falloff period
        well_test_table1 = pd.DataFrame({
            'fall_off_time': fall_off_time, 
            'fall_off_pressure': fall_off_pressure, 
            'fall_off_pressure1': fall_off_pressure1
        })

        # Further data extraction and processing
        extracted_data1 = well_test_table1[(well_test_table1.iloc[:, 2] > 0)]
        fall_off_time = extracted_data1['fall_off_time'].to_numpy()
        fall_off_pressure = extracted_data1['fall_off_pressure'].to_numpy()
        delta_t_hrs = fall_off_time - fall_off_time[0]

        # Calculate parameters for analysis
        h_1 = len(rate_history)
        q_last = rate_history['FlowRate'].iloc[-1]

        effective_time = injection_period * delta_t_hrs / (injection_period + delta_t_hrs)
        
        # Ensure no zeros in effective_time for logarithm calculation
        # Replace zeros with a small positive number
        effective_time_safe = np.where(effective_time <= 0, 1e-10, effective_time)
        
        delta_p_psi = fall_off_pressure[0] - fall_off_pressure
        dPdt = np.diff(delta_p_psi) / np.diff(effective_time)
        smoothing_parameter = 0.03

        # Create main analysis dataframe
        T1 = pd.DataFrame({
            'delta_t_hrs': delta_t_hrs, 
            'effective_time': effective_time, 
            'fall_off_pressure': fall_off_pressure, 
            'delta_p_psi': delta_p_psi, 
            'log_effective_time': np.log(effective_time_safe)
        })

        # Filter out zero effective time entries
        T1 = T1[(T1['effective_time'] != 0)]
        T1 = pd.DataFrame(T1)
        T1.index = range(len(T1))

        # Calculate superposition time
        h1 = len(T1)
        summation_ = [0] * h1
        superposition_time = [0] * h1

        for i in range(h1):
            sum = 0
            for k in range(1, h_1):
                x1 = rate_history.loc[k-1, 'FlowRate'] - rate_history.loc[k, 'FlowRate']
                a1 = rate_history.loc[h_1-1, 'End_Time'] + T1.loc[i, 'delta_t_hrs'] - rate_history.loc[k-1,'End_Time']
                b1 = rate_history.loc[h_1-1, 'End_Time'] - rate_history.loc[k-1, 'End_Time']
                y1 = np.log10(a1/b1)
                z1 = (x1*y1)/q_last
                sum = sum + z1
            
            # Ensure delta_t_hrs is not zero before taking logarithm
            t_hrs = max(T1.delta_t_hrs[i], 1e-10)
            summation_[i] = sum + np.log10(t_hrs)
            superposition_time[i] = 10**(summation_[i])
            
        T1['summation_'] = np.array(summation_)
        T1['superposition_time'] = np.array(superposition_time)
        
        # Ensure no zeros in superposition_time for logarithm calculation
        superposition_time_safe = np.where(np.array(superposition_time) <= 0, 1e-10, np.array(superposition_time))
        T1['log_superposition_time'] = np.log10(superposition_time_safe)

        # Calculate offset parameters for analysis
        offset_log_superposition_time = [0] * h1
        offset_delta_pressure = [0] * h1

        for i in range(h1):
            offset_log_superposition_time[i] = T1.loc[h1-i-1, 'log_superposition_time']
            offset_delta_pressure[i] = T1.loc[h1-i-1, 'delta_p_psi']
            
        T1['offset_log_superposition_time'] = -1 * np.array(offset_log_superposition_time)
        T1['offset_delta_pressure'] = np.array(offset_delta_pressure)

        # Calculate offset_log_effective_time
        T1['offset_log_effective_time'] = -T1['log_effective_time'].iloc[::-1].reset_index(drop=True)

        # Create interpolation functions for superposition time derivatives
        int_xl = interp1d(T1['log_superposition_time'], T1['log_superposition_time'], fill_value = "extrapolate")
        int_pl = interp1d(T1['log_superposition_time'], T1['delta_p_psi'], fill_value = "extrapolate")
        int_xr = interp1d(T1['offset_log_superposition_time'], -T1['offset_log_superposition_time'], fill_value = "extrapolate")
        int_pr = interp1d(T1['offset_log_superposition_time'], T1['offset_delta_pressure'], fill_value = "extrapolate")

        # Calculate smoothed values for superposition time
        T1['XL'] = int_xl(T1['log_superposition_time'] - smoothing_parameter)
        T1['PL'] = int_pl(T1['log_superposition_time'] - smoothing_parameter)
        T1['XR'] = -1 * int_xr((-1 * T1['log_superposition_time']) - smoothing_parameter)
        T1['PR'] = int_pr((-1 * T1['log_superposition_time']) - smoothing_parameter)

        # Calculate slopes for superposition time
        T1['mL'] = (T1['delta_p_psi'] - T1['PL']) / (T1['log_superposition_time'] - T1['XL'])
        T1['mR'] = (T1['PR'] - T1['delta_p_psi']) / (T1['XR'] - T1['log_superposition_time'])

        # Calculate m_graph1 (superposition time derivative)
        T1['m_graph1'] = ((T1['mL'] * (T1['XR'] - T1['log_superposition_time'])) + 
                      (T1['mR'] * (T1['log_superposition_time'] - T1['XL']))) / (T1['XR'] - T1['XL'])

        # Calculate PPD1
        T1['PPD1'] = T1['m_graph1'] / T1['superposition_time']

        # Create interpolation functions for effective time derivatives
        int_xl_eff = interp1d(T1['log_effective_time'], T1['log_effective_time'], fill_value="extrapolate")
        int_pl_eff = interp1d(T1['log_effective_time'], T1['delta_p_psi'], fill_value="extrapolate")
        
        # Calculate smoothed values for effective time
        T1['XL1'] = int_xl_eff(T1['log_effective_time'] - smoothing_parameter)
        T1['PL1'] = int_pl_eff(T1['log_effective_time'] - smoothing_parameter)
        T1['XR1'] = -1 * int_xr((-1 * T1['log_effective_time']) - smoothing_parameter)
        T1['PR1'] = int_pr((-1 * T1['log_effective_time']) - smoothing_parameter)
        
        # Calculate slopes for effective time
        T1['mL1'] = (T1['delta_p_psi'] - T1['PL1']) / (T1['log_effective_time'] - T1['XL'])
        T1['mR1'] = (T1['PR1'] - T1['delta_p_psi']) / (T1['XR'] - T1['log_effective_time'])
        
        # Calculate m_graph_effective_time (effective time derivative)
        T1['m_graph_effective_time'] = ((T1['mL1'] * (T1['XR1'] - T1['log_effective_time'])) + 
                      (T1['mR1'] * (T1['log_effective_time'] - T1['XL1']))) / (T1['XR1'] - T1['XL1'])

        # Calculate the slope line for reference (slope = 1)
        b1 = 1.0
        # Use index 8 as in the notebook, but with safeguards
        if len(T1) > 8:
            a1 = (T1['delta_p_psi'].iloc[8]) / (T1['delta_t_hrs'].iloc[8]**b1)
        else:
            # Fallback if there are fewer points
            min_delta_t = min(T1['delta_t_hrs'])
            min_delta_p = min(T1['delta_p_psi'])
            a1 = min_delta_p / min_delta_t
            
        T1['p_line_fall_off'] = a1 * (T1['delta_t_hrs']**b1)
        
        # Filter out any NaN or infinite values that would break the log plot
        T1 = T1.replace([np.inf, -np.inf], np.nan)
        
        # Create clean data for the API
        # Make sure all data is strictly positive for log plot (required for log-log plot)
        delta_t_hrs_clean = T1['delta_t_hrs'].tolist()
        delta_p_psi_clean = [max(0.0001, val) for val in T1['delta_p_psi'].tolist()]
        m_graph1_clean = [max(0.0001, val) if not np.isnan(val) else None for val in T1['m_graph1'].tolist()]
        ppd1_clean = [max(0.0001, val) if not np.isnan(val) else None for val in T1['PPD1'].tolist()]
        m_graph_effective_time_clean = [max(0.0001, val) if not np.isnan(val) else None for val in T1['m_graph_effective_time'].tolist()]
        p_line_fall_off_clean = [max(0.0001, val) for val in T1['p_line_fall_off'].tolist()]
        
        # Prepare the response data with all needed columns from the notebook
        diagnostic_data = {
            'delta_t_hrs': delta_t_hrs_clean,
            'delta_p_psi': delta_p_psi_clean,
            'm_graph1': m_graph1_clean,
            'PPD1': ppd1_clean,
            'm_graph_effective_time': m_graph_effective_time_clean,
            'p_line_fall_off': p_line_fall_off_clean,
            'a1': float(a1),  # Include a1 coefficient for reference line
            'b1': float(b1)   # Include b1 exponent for reference line
        }
        
        return diagnostic_data
        
    except Exception as e:
        error_response(e)
        raise
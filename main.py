# Pressure Falloff Test Analysis
# Script converted from Jupyter notebook

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.interpolate import interp1d

# Import data
well_test_data = pd.read_csv("./EDB_02_Raw_Data_Injection_Gauge.csv",  header=None)
reservoir_properties = pd.read_excel("./Reservoir_Information.xlsx", sheet_name="Information")
rate_history = pd.read_excel("./Reservoir_Information.xlsx", sheet_name="Rate_Schedule")
injection_history = pd.read_excel("./Reservoir_Information.xlsx", sheet_name="Injection_Schedule")

# Display rate history data
# print(rate_history)
# print(injection_history.head())
# print(well_test_data)
# print(well_test_data.iloc[:, 1])

# Extract relevant data from the well test data
date = well_test_data.iloc[:, 1]
time_hrs = well_test_data.iloc[:, 2].to_numpy()
pwf_hrs = well_test_data.iloc[:, 3].to_numpy()

# Create well test table
well_test_table = [time_hrs, pwf_hrs]

# Plot pressure vs time
fig1 = plt.figure()
curve1 = plt.plot(time_hrs, pwf_hrs, linewidth=2)
plt.xlabel('Time (hrs)', fontsize=12)
plt.ylabel('P_w_f / P_w_s (psi)', fontsize=12)
plt.grid(True)
plt.show()

# Define time periods for analysis
injection_start_time = 16.3322
injection_end_time = 25.2925
falloff_end_time = 145.164
injection_period = injection_end_time - injection_start_time

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
extracted_data1 = well_test_table1[(well_test_table1.iloc[:, 2]>0)]
fall_off_time = extracted_data1['fall_off_time'].to_numpy()
fall_off_pressure = extracted_data1['fall_off_pressure'].to_numpy()
delta_t_hrs = fall_off_time - fall_off_time[0]

# Plot shut-in pressure vs delta time
fig2 = plt.figure()
curve2 = plt.plot(delta_t_hrs, fall_off_pressure, linewidth=2)
plt.xlabel(r'$\Delta t$ - hrs', fontsize=12)
plt.ylabel('Shut-in Pressure (P_w_s) - psi', fontsize=12)
plt.grid(True)
plt.show()

# Calculate parameters for analysis
h_1 = len(rate_history)
q_last = rate_history['FlowRate'].iloc[-1]

effective_time = injection_period * delta_t_hrs / (injection_period + delta_t_hrs)
delta_p_psi = fall_off_pressure[0] - fall_off_pressure
dPdt = np.diff(delta_p_psi) / np.diff(effective_time)
h = len(delta_t_hrs)
smoothing_parameter = 0.03

# Calculate pressure derivative and create dataframe
pressure_derivative = np.concatenate(([np.nan], effective_time[:-1] * dPdt))
build_up_time = (injection_period+delta_t_hrs)/(delta_t_hrs)
log_effective_time = np.log(effective_time)

# Create main analysis dataframe
T1 = pd.DataFrame({
    'delta_t_hrs': delta_t_hrs, 
    'effective_time': effective_time, 
    'fall_off_pressure': fall_off_pressure, 
    'delta_p_psi': delta_p_psi, 
    'log_effective_time': log_effective_time
})

# Filter out zero effective time entries
T1 = T1[(T1['effective_time']!=0)]
T1 = pd.DataFrame(T1)
T1.index = range(len(T1))

# Calculate superposition time
h1 = len(T1)
summation_ = [0]*h1
superposition_time = [0]*h1

for i in range(h1):
    sum = 0
    for k in range(1, h_1):
        x1 = rate_history.loc[k-1, 'FlowRate'] - rate_history.loc[k, 'FlowRate']
        a1 = rate_history.loc[h_1-1, 'End_Time'] + T1.loc[i, 'delta_t_hrs'] - rate_history.loc[k-1,'End_Time']
        b1 = rate_history.loc[h_1-1, 'End_Time'] - rate_history.loc[k-1, 'End_Time']
        y1 = np.log10(a1/b1)
        z1 = (x1*y1)/q_last
        sum = sum + z1
        
    summation_[i] = sum + np.log10(T1.delta_t_hrs[i])
    superposition_time[i] = 10**(summation_[i])
    
T1['summation_'] = np.transpose(summation_)
T1['superposition_time'] = np.transpose(superposition_time)
T1['log_superposition_time'] = np.log10(T1['superposition_time'])

# Calculate offset parameters for analysis
offset_log_superposition_time = [0]*(h1)
offset_delta_pressure = [0]*(h1)

for i in range(h1):
    offset_log_superposition_time[i] = T1.loc[h1-i-1, 'log_superposition_time']
    offset_delta_pressure[i] = T1.loc[h1-i-1, 'delta_p_psi']
    
T1['offset_log_superposition_time'] = -1*np.transpose(offset_log_superposition_time)
T1['offset_delta_pressure'] = np.transpose(offset_delta_pressure)

# Create interpolation functions for smoothing
int_xl = interp1d(T1['log_superposition_time'], T1['log_superposition_time'], fill_value="extrapolate")
int_pl = interp1d(T1['log_superposition_time'], T1['delta_p_psi'], fill_value="extrapolate")
int_xr = interp1d(T1['offset_log_superposition_time'], -T1['offset_log_superposition_time'], fill_value="extrapolate")
int_pr = interp1d(T1['offset_log_superposition_time'], T1['offset_delta_pressure'], fill_value="extrapolate")

# Calculate smoothed values
T1['XL'] = int_xl(T1['log_superposition_time'] - smoothing_parameter)
T1['PL'] = int_pl(T1['log_superposition_time'] - smoothing_parameter)
T1['XR'] = -1 * int_xr((-1 * T1['log_superposition_time']) - smoothing_parameter)
T1['PR'] = int_pr((-1 * T1['log_superposition_time']) - smoothing_parameter)

# Calculate pressure derivative
T1['derivative'] = (T1['PR'] - T1['PL']) / (T1['XR'] - T1['XL'])
T1['t_derivative'] = T1['derivative'] * T1['superposition_time'] * np.log(10)

# Calculate the slope line for reference (slope = 1)
min_delta_t = min(T1['delta_t_hrs'])
max_delta_t = max(T1['delta_t_hrs'])
min_delta_p = min(T1['delta_p_psi'])
T1['p_line_fall_off'] = T1['delta_t_hrs'] * (min_delta_p / min_delta_t)

# Create additional columns for the derivatives to plot
T1['m_graph1'] = T1['t_derivative']  # Superposition Time derivative

# Fix array length mismatch issue for effective time derivatives
m_graph_effective_time = np.zeros_like(delta_t_hrs)
m_graph_effective_time[1:] = effective_time[:-1] * dPdt  # Pad with zero at first position
T1['m_graph_effective_time'] = m_graph_effective_time

# Plot log-log diagnostic plot of pressure and pressure derivative
fig3, ax = plt.subplots(figsize=(10, 8))

plot1, = ax.loglog(T1['delta_t_hrs'], T1['delta_p_psi'], 'b+', markersize=2, label=r'$\Delta P$')
plot2, = ax.loglog(T1['delta_t_hrs'], T1['m_graph1'], 'r.', linewidth=2, label=r'$Superposition\ Time\ Derivs$')
plot3, = ax.loglog(T1['delta_t_hrs'], T1['m_graph_effective_time'], 'g.', linewidth=2, label=r'$Effective\ Time\ derivs$')
plot4, = ax.loglog(T1['delta_t_hrs'], T1['p_line_fall_off'], 'k--', label=r'$Slope = 1$')

xlabel = r'$\Delta t$ - hrs'
ylabel = r'$\Delta P \ and\ \  \frac{d\Delta P}{d(\ln t)}\ \mathrm{-}\ \mathrm{psi}$'
ax.set_xlabel(xlabel, fontsize=15)
ax.set_ylabel(ylabel, fontsize=15, fontweight='bold')
ax.legend(fontsize=15, loc='lower left')
ax.grid(True, which="both", ls="-")
plt.title('Log-Log Diagnostic Plot', fontsize=18)
plt.tight_layout()
plt.show()

# Save data to CSV for the API
# Filter out any NaN or infinite values that would break the log plot
T1 = T1.replace([np.inf, -np.inf], np.nan)

# Make sure all data is strictly positive for log plot
diagnostic_data = pd.DataFrame({
    'delta_t_hrs': T1['delta_t_hrs'].tolist(),
    'delta_p_psi': [max(0.0001, val) for val in T1['delta_p_psi'].tolist()],
    'm_graph1': [max(0.0001, val) if not np.isnan(val) else None for val in T1['m_graph1'].tolist()],
    'm_graph_effective_time': [max(0.0001, val) if not np.isnan(val) else None for val in T1['m_graph_effective_time'].tolist()],
    'p_line_fall_off': [max(0.0001, val) for val in T1['p_line_fall_off'].tolist()]
})
diagnostic_data.to_csv('./diagnostic_plot_data.csv', index=False)


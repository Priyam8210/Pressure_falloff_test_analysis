/**
 * API service for fetching data and making requests to the backend
 */

const API_BASE_URL = "http://localhost:5000/api";

/**
 * Fetch pressure data for pressure vs time charts
 */
export const fetchPressureData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/data`);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (err) {
    console.error("Error fetching pressure data:", err);
    throw err;
  }
};

/**
 * Fetch diagnostic data for log-log plot
 */
export const fetchDiagnosticData = async () => {
  try {
    console.log("Fetching diagnostic data...");
    const response = await fetch(`${API_BASE_URL}/diagnostic-test`);

    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    console.log("Received diagnostic data:", data);
    return data;
  } catch (err) {
    console.error("Error fetching diagnostic data:", err);
    throw err;
  }
};

/**
 * Calculate reservoir parameters from selected points
 */
export const calculateParameters = async (pointInputs) => {
  try {
    const response = await fetch(`${API_BASE_URL}/calculate-parameters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pointInputs),
    });

    if (!response.ok) throw new Error("Failed to calculate parameters");
    return await response.json();
  } catch (err) {
    console.error("Error calculating parameters:", err);
    throw err;
  }
};

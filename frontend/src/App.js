// frontend/app.js

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Line, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ZoomPlugin,
  LogarithmicScale,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "./App.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LogarithmicScale,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

// Constants for performance
const DOWNSAMPLE_FACTOR = 50;

// DiagnosticPlot component for the log-log diagnostic plot
const DiagnosticPlot = () => {
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [pointInputs, setPointInputs] = useState({
    x2_1: "",
    y2_1: "", // First point of stabilization line
    x2_2: "",
    y2_2: "", // Second point of stabilization line
    x3: "",
    y3: "", // Point for skin calculation
    x4: "",
    y4: "", // Point for wellbore storage calculation
  });
  const [calculatedParams, setCalculatedParams] = useState(null);
  const [selectionMode, setSelectionMode] = useState("stabilizationLine"); // 'stabilizationLine', 'skinPoint', 'storagePoint'
  const [debugInfo, setDebugInfo] = useState(null); // Add debug state

  // Fetch diagnostic data
  useEffect(() => {
    const fetchDiagnosticData = async () => {
      try {
        setLoading(true);
        console.log("Fetching diagnostic data...");
        
        // Use the test endpoint with simpler data to check if rendering works
        const response = await fetch("http://localhost:5000/api/diagnostic-test");
        
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        console.log("Received diagnostic data:", data);
        
        // Debug information
        const debugObj = {
          hasData: !!data,
          keysInData: data ? Object.keys(data) : [],
          dataLength: data && data.delta_t_hrs ? data.delta_t_hrs.length : 0,
          samplePoints: data && data.delta_t_hrs ? {
            delta_t_hrs: data.delta_t_hrs.slice(0, 5),
            delta_p_psi: data.delta_p_psi.slice(0, 5),
            m_graph1: data.m_graph1.slice(0, 5),
            PPD1: data.PPD1?.slice(0, 5) || [],
            m_graph_effective_time: data.m_graph_effective_time.slice(0, 5),
            p_line_fall_off: data.p_line_fall_off.slice(0, 5)
          } : {}
        };
        setDebugInfo(debugObj);
        console.log("Debug info:", debugObj);
        
        setDiagnosticData(data);
      } catch (err) {
        console.error("Error fetching diagnostic data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDiagnosticData();
  }, []);

  // Function to handle point selection on chart
  const handlePointSelection = (event, elements) => {
    if (!elements || elements.length === 0) return;

    const chart = chartInstance;
    const element = elements[0];
    const datasetIndex = element.datasetIndex;
    const index = element.index;

    // Get the clicked point's coordinates
    const x = chart.data.datasets[datasetIndex].data[index].x;
    const y = chart.data.datasets[datasetIndex].data[index].y;

    // Handle point selection based on current mode
    if (selectionMode === "stabilizationLine") {
      // For stabilization line, we need two points
      if (selectedPoints.length === 0) {
        // First point
        setSelectedPoints([{ x, y }]);
        setPointInputs((prev) => ({
          ...prev,
          x2_1: x.toFixed(6),
          y2_1: y.toFixed(6),
        }));
        setSelectionMode("stabilizationLine"); // Stay in this mode for second point
      } else {
        // Second point
        setSelectedPoints([...selectedPoints, { x, y }]);
        setPointInputs((prev) => ({
          ...prev,
          x2_2: x.toFixed(6),
          y2_2: y.toFixed(6),
        }));
        setSelectionMode("skinPoint"); // Move to next mode
      }
    } else if (selectionMode === "skinPoint") {
      // For skin point, we need one point
      setPointInputs((prev) => ({
        ...prev,
        x3: x.toFixed(6),
        y3: y.toFixed(6),
      }));
      setSelectionMode("storagePoint"); // Move to next mode
    } else if (selectionMode === "storagePoint") {
      // For wellbore storage point, we need one point
      setPointInputs((prev) => ({
        ...prev,
        x4: x.toFixed(6),
        y4: y.toFixed(6),
      }));
      setSelectionMode("complete"); // All points selected
    }

    // Update the chart to show selected points
    updateChartAnnotations(chart);
  };

  // Function to update chart annotations (selected points and lines)
  const updateChartAnnotations = (chart) => {
    if (!chart) return;

    // Clear existing user annotations (datasets beyond the original 4)
    while (chart.data.datasets.length > 4) {
      chart.data.datasets.pop();
    }

    // Add stabilization line if both points are selected
    if (
      pointInputs.x2_1 &&
      pointInputs.y2_1 &&
      pointInputs.x2_2 &&
      pointInputs.y2_2
    ) {
      chart.data.datasets.push({
        label: "Stabilization Line",
        data: [
          { x: parseFloat(pointInputs.x2_1), y: parseFloat(pointInputs.y2_1) },
          { x: parseFloat(pointInputs.x2_2), y: parseFloat(pointInputs.y2_2) },
        ],
        borderColor: "red",
        backgroundColor: "rgba(255, 0, 0, 0.5)",
        showLine: true,
        pointRadius: 5,
        pointStyle: "triangle",
      });
    }

    // Add skin point if selected
    if (pointInputs.x3 && pointInputs.y3) {
      chart.data.datasets.push({
        label: "Skin Factor Point",
        data: [
          { x: parseFloat(pointInputs.x3), y: parseFloat(pointInputs.y3) },
        ],
        borderColor: "purple",
        backgroundColor: "rgba(128, 0, 128, 0.5)",
        showLine: false,
        pointStyle: "circle",
        pointRadius: 7,
      });
    }

    // Add wellbore storage point if selected
    if (pointInputs.x4 && pointInputs.y4) {
      chart.data.datasets.push({
        label: "Wellbore Storage Point",
        data: [
          { x: parseFloat(pointInputs.x4), y: parseFloat(pointInputs.y4) },
        ],
        borderColor: "orange",
        backgroundColor: "rgba(255, 165, 0, 0.5)",
        showLine: false,
        pointStyle: "star",
        pointRadius: 7,
      });
    }

    chart.update();
  };

  // Handle manual input of point coordinates
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPointInputs((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Update chart if we have an instance
    if (chartInstance) {
      updateChartAnnotations(chartInstance);
    }
  };

  // Calculate reservoir parameters using the selected points
  const calculateParameters = async () => {
    try {
      if (
        !pointInputs.x2_1 ||
        !pointInputs.y2_1 ||
        !pointInputs.x2_2 ||
        !pointInputs.y2_2 ||
        !pointInputs.x3 ||
        !pointInputs.y3 ||
        !pointInputs.x4 ||
        !pointInputs.y4
      ) {
        alert("Please select all required points first");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/calculate-parameters",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pointInputs),
        }
      );

      if (!response.ok) throw new Error("Failed to calculate parameters");
      const data = await response.json();
      setCalculatedParams(data);
    } catch (err) {
      console.error("Error calculating parameters:", err);
      alert(`Error calculating parameters: ${err.message}`);
    }
  };

  // Reset point selection
  const resetSelection = () => {
    setSelectedPoints([]);
    setPointInputs({
      x2_1: "",
      y2_1: "",
      x2_2: "",
      y2_2: "",
      x3: "",
      y3: "",
      x4: "",
      y4: "",
    });
    setSelectionMode("stabilizationLine");
    setCalculatedParams(null);

    if (chartInstance) {
      while (chartInstance.data.datasets.length > 4) {
        chartInstance.data.datasets.pop();
      }
      chartInstance.update();
    }
  };

  // Chart.js configuration for diagnostic plot
  const chartData = useMemo(() => {
    if (!diagnosticData) return null;

    console.log("Creating chart data from:", diagnosticData);

    // Check for valid data for plotting
    const isValidData =
      diagnosticData.delta_t_hrs &&
      diagnosticData.delta_p_psi &&
      diagnosticData.m_graph1 &&
      diagnosticData.m_graph_effective_time &&
      diagnosticData.p_line_fall_off;

    if (!isValidData) {
      console.error("Missing required fields in diagnostic data");
      return null;
    }

    // Create filtered arrays that remove null or undefined values which break log scale
    const createValidDataPoints = (xArray, yArray) => {
      if (!xArray || !yArray) return [];

      return xArray
        .map((x, i) => {
          const y = yArray[i];
          // Only include points where both x and y are valid numbers and positive
          if (x > 0 && y !== null && y !== undefined && y > 0) {
            return { x, y };
          }
          return null;
        })
        .filter((point) => point !== null);
    };

    // Check how many valid points we have for each dataset
    const deltaPoints = createValidDataPoints(
      diagnosticData.delta_t_hrs,
      diagnosticData.delta_p_psi
    );
    const m_graph1Points = createValidDataPoints(
      diagnosticData.delta_t_hrs,
      diagnosticData.m_graph1
    );
    const effectiveTimePoints = createValidDataPoints(
      diagnosticData.delta_t_hrs,
      diagnosticData.m_graph_effective_time
    );
    const slopePoints = createValidDataPoints(
      diagnosticData.delta_t_hrs,
      diagnosticData.p_line_fall_off
    );

    console.log(
      `Valid data points: Delta P: ${deltaPoints.length}, m_graph1: ${m_graph1Points.length}, effective time: ${effectiveTimePoints.length}, slope line: ${slopePoints.length}`
    );

    const datasets = [
      {
        label: "ΔP",
        data: deltaPoints,
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 255, 0.5)",
        showLine: false,
        pointStyle: "cross",
        pointRadius: 3,
      },
    ];

    // Only add datasets if they have valid points
    if (m_graph1Points.length > 0) {
      datasets.push({
        label: "Superposition Time Derivatives",
        data: m_graph1Points,
        borderColor: "red",
        backgroundColor: "rgba(255, 0, 0, 0.5)",
        showLine: false,
        pointStyle: "circle",
        pointRadius: 3,
      });
    }

    // Use PPD1 if available, otherwise use m_graph_effective_time
    if (diagnosticData.PPD1 && diagnosticData.PPD1.length > 0) {
      const ppd1Points = createValidDataPoints(
        diagnosticData.delta_t_hrs,
        diagnosticData.PPD1
      );
      if (ppd1Points.length > 0) {
        datasets.push({
          label: "Pressure-Pressure Derivative",
          data: ppd1Points,
          borderColor: "green",
          backgroundColor: "rgba(0, 255, 0, 0.5)",
          showLine: false,
          pointStyle: "circle",
          pointRadius: 3,
        });
      }
    } else if (effectiveTimePoints.length > 0) {
      datasets.push({
        label: "Effective Time Derivatives",
        data: effectiveTimePoints,
        borderColor: "green",
        backgroundColor: "rgba(0, 255, 0, 0.5)",
        showLine: false,
        pointStyle: "circle",
        pointRadius: 3,
      });
    }

    if (slopePoints.length > 0) {
      datasets.push({
        label: "Slope = 1",
        data: slopePoints,
        borderColor: "black",
        borderDash: [5, 5],
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        showLine: true,
        pointRadius: 0,
      });
    }

    return { datasets };
  }, [diagnosticData]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0,
      },
      onClick: handlePointSelection,
      scales: {
        x: {
          type: "logarithmic",
          position: "bottom",
          title: {
            display: true,
            text: "Δt (hrs)",
            font: { size: 14 },
          },
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "ΔP and Pressure Derivative (psi)",
            font: { size: 14 },
          },
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              const xValue = context.parsed.x;
              const datasetLabel = context.dataset.label;
              return [
                `${datasetLabel}`,
                `x: ${xValue.toFixed(6)}`,
                `y: ${value.toFixed(6)}`,
              ];
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "xy",
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "xy",
          },
        },
        legend: {
          position: "top",
        },
      },
    }),
    [handlePointSelection]
  );

  // Save chart reference when it's created
  const onChartInit = (chart) => {
    setChartInstance(chart);
  };

  // Get current selection mode text
  const getSelectionModeText = () => {
    switch (selectionMode) {
      case "stabilizationLine":
        return selectedPoints.length === 0
          ? "Select first point for stabilization line"
          : "Select second point for stabilization line";
      case "skinPoint":
        return "Select point for skin factor calculation";
      case "storagePoint":
        return "Select point for wellbore storage calculation";
      case "complete":
        return "All points selected. Click Calculate Parameters or edit points manually.";
      default:
        return "";
    }
  };

  if (loading) return <div className="loading">Loading diagnostic data...</div>;
  if (error)
    return <div className="error">Error loading diagnostic plot: {error}</div>;
  if (!diagnosticData)
    return <div className="error">No diagnostic data available</div>;

  return (
    <div className="diagnostic-plot">
      <h2>Log-Log Diagnostic Plot</h2>

      <div className="selection-mode">
        <p>
          <strong>Current Action:</strong> {getSelectionModeText()}
        </p>
      </div>

      <div className="point-selection-controls">
        <div className="point-inputs-container">
          <div className="point-input-group">
            <h3>Stabilization Line Points</h3>
            <div className="point-inputs">
              <div className="point-input">
                <label>Point 1:</label>
                <div className="coord-inputs">
                  <input
                    type="number"
                    name="x2_1"
                    value={pointInputs.x2_1}
                    onChange={handleInputChange}
                    placeholder="x2_1"
                    step="any"
                  />
                  <input
                    type="number"
                    name="y2_1"
                    value={pointInputs.y2_1}
                    onChange={handleInputChange}
                    placeholder="y2_1"
                    step="any"
                  />
                </div>
              </div>
              <div className="point-input">
                <label>Point 2:</label>
                <div className="coord-inputs">
                  <input
                    type="number"
                    name="x2_2"
                    value={pointInputs.x2_2}
                    onChange={handleInputChange}
                    placeholder="x2_2"
                    step="any"
                  />
                  <input
                    type="number"
                    name="y2_2"
                    value={pointInputs.y2_2}
                    onChange={handleInputChange}
                    placeholder="y2_2"
                    step="any"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="point-input-group">
            <h3>Skin Factor Point</h3>
            <div className="point-inputs">
              <div className="point-input">
                <label>Point:</label>
                <div className="coord-inputs">
                  <input
                    type="number"
                    name="x3"
                    value={pointInputs.x3}
                    onChange={handleInputChange}
                    placeholder="x3"
                    step="any"
                  />
                  <input
                    type="number"
                    name="y3"
                    value={pointInputs.y3}
                    onChange={handleInputChange}
                    placeholder="y3"
                    step="any"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="point-input-group">
            <h3>Wellbore Storage Point</h3>
            <div className="point-inputs">
              <div className="point-input">
                <label>Point:</label>
                <div className="coord-inputs">
                  <input
                    type="number"
                    name="x4"
                    value={pointInputs.x4}
                    onChange={handleInputChange}
                    placeholder="x4"
                    step="any"
                  />
                  <input
                    type="number"
                    name="y4"
                    value={pointInputs.y4}
                    onChange={handleInputChange}
                    placeholder="y4"
                    step="any"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button
            onClick={calculateParameters}
            disabled={selectionMode !== "complete"}
          >
            Calculate Parameters
          </button>
          <button onClick={resetSelection}>Reset Selection</button>
        </div>
      </div>

      {calculatedParams && (
        <div className="results-panel">
          <h3>Calculated Reservoir Parameters</h3>
          <div className="results-grid">
            <div className="result-item">
              <span className="result-label">Stabilization:</span>
              <span className="result-value">
                {calculatedParams.stabilization.toFixed(2)} psi
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">Permeability:</span>
              <span className="result-value">
                {calculatedParams.permeability.toFixed(2)} mD
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">Skin Factor:</span>
              <span className="result-value">
                {calculatedParams.skin.toFixed(2)}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">Wellbore Storage:</span>
              <span className="result-value">
                {calculatedParams.wellbore_storage.toFixed(4)} bbl/psi
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        className="chart-container"
        style={{ height: "500px", width: "100%" }}
      >
        <Scatter
          id="diagnostic-chart"
          data={chartData}
          options={chartOptions}
          plugins={[
            {
              id: "chartInit",
              afterInit: (chart) => onChartInit(chart),
            },
          ]}
        />
      </div>
    </div>
  );
};

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [slope, setSlope] = useState(null);
  const [activeTab, setActiveTab] = useState("pressureChart"); // Added for tab switching

  // Fetch data with loading state
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/api/data");
        if (!response.ok) throw new Error("Network response was not ok");
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Memoized data processing
  const processedData = useMemo(() => {
    if (!data) return null;

    const timeData = data.time_hrs;
    const pwfData = data.pwf_hrs;
    const pwsData = data.pws_hrs;

    if (!timeData || !pwfData || !pwsData) return null;

    // Downsample data for better performance
    const downsampledTime = [];
    const downsampledPwf = [];
    const downsampledPws = [];

    for (let i = 0; i < timeData.length; i += DOWNSAMPLE_FACTOR) {
      downsampledTime.push(timeData[i]);
      downsampledPwf.push(pwfData[i]);
      downsampledPws.push(pwsData[i]);
    }

    return {
      time: downsampledTime,
      pwf: downsampledPwf,
      pws: downsampledPws,
    };
  }, [data]);

  // Chart.js configuration
  const chartData = useMemo(
    () => ({
      labels: processedData?.time || [],
      datasets: [
        {
          label: "Pwf (psi)",
          data: processedData?.pwf || [],
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          tension: 0.1,
          pointRadius: (context) => {
            const index = context.dataIndex;
            return selectedPoints.includes(index) ? 6 : 3;
          },
          pointBackgroundColor: (context) => {
            const index = context.dataIndex;
            return selectedPoints.includes(index) ? "red" : "rgb(75, 192, 192)";
          },
          pointHoverRadius: 8,
          pointHoverBackgroundColor: "rgb(75, 192, 192)",
          pointHoverBorderColor: "white",
          pointHoverBorderWidth: 2,
          showLine: true,
          spanGaps: true,
          borderWidth: 1,
        },
        {
          label: "Pws (psi)",
          data: processedData?.pws || [],
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          tension: 0.1,
          pointRadius: (context) => {
            const index = context.dataIndex;
            return selectedPoints.includes(index) ? 6 : 3;
          },
          pointBackgroundColor: (context) => {
            const index = context.dataIndex;
            return selectedPoints.includes(index) ? "red" : "rgb(255, 99, 132)";
          },
          pointHoverRadius: 8,
          pointHoverBackgroundColor: "rgb(255, 99, 132)",
          pointHoverBorderColor: "white",
          pointHoverBorderWidth: 2,
          showLine: true,
          spanGaps: true,
          borderWidth: 1,
        },
      ],
    }),
    [processedData, selectedPoints]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0,
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Time (hrs)",
            font: { size: 14 },
          },
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
          },
        },
        y: {
          title: {
            display: true,
            text: "Pwf / Pws (psi)",
            font: { size: 14 },
          },
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              const datasetLabel = context.dataset.label;
              return `${datasetLabel}: ${value.toFixed(2)} psi`;
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "xy",
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "xy",
          },
        },
      },
      elements: {
        point: {
          radius: 0,
          hitRadius: 5,
          hoverRadius: 5,
        },
        line: {
          borderWidth: 1,
        },
      },
    }),
    []
  );

  // Click handler for Chart.js
  const handleChartClick = useCallback(
    (event, elements) => {
      if (elements && elements.length > 0) {
        const pointIndex = elements[0].index;
        const newSelectedPoints = [...selectedPoints, pointIndex];

        if (newSelectedPoints.length === 2) {
          const [start, end] = newSelectedPoints;
          const timeDiff = processedData.time[end] - processedData.time[start];
          const pressureDiff =
            processedData.pwf[end] - processedData.pwf[start];
          const calculatedSlope = pressureDiff / timeDiff;
          setSlope(calculatedSlope);
          setSelectedPoints([]);
        } else {
          setSelectedPoints(newSelectedPoints);
        }
      }
    },
    [processedData, selectedPoints]
  );

  return (
    <div className="App">
      <header>
        <h1>Pressure Falloff Test Analysis</h1>
        <div className="tabs">
          <button
            className={activeTab === "pressureChart" ? "active" : ""}
            onClick={() => setActiveTab("pressureChart")}
          >
            Pressure vs Time
          </button>
          <button
            className={activeTab === "diagnosticPlot" ? "active" : ""}
            onClick={() => setActiveTab("diagnosticPlot")}
          >
            Log-Log Diagnostic Plot
          </button>
        </div>
        <div className="controls">
          {activeTab === "pressureChart" && (
            <div className="chart-controls">
              <button
                onClick={() => {
                  const chart = ChartJS.getChart("pressure-chart");
                  if (chart) {
                    chart.resetZoom();
                  }
                }}
              >
                Reset Zoom
              </button>
              <div className="instructions">
                <p>Zoom: Mouse wheel or pinch</p>
                <p>Pan: Hold Shift + Drag</p>
                <p>Click two points to calculate slope</p>
              </div>
            </div>
          )}
          {activeTab === "diagnosticPlot" && (
            <div className="chart-controls">
              <button
                onClick={() => {
                  const chart = ChartJS.getChart("diagnostic-chart");
                  if (chart) {
                    chart.resetZoom();
                  }
                }}
              >
                Reset Zoom
              </button>
              <div className="instructions">
                <p>Zoom: Mouse wheel or pinch</p>
                <p>Pan: Hold Shift + Drag</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main>
        {activeTab === "pressureChart" &&
          (loading ? (
            <div className="loading">Loading data...</div>
          ) : error ? (
            <div className="error">Error: {error}</div>
          ) : !processedData ? (
            <div className="error">No data available</div>
          ) : (
            <div
              className="chart-container"
              style={{ height: "500px", width: "100%" }}
            >
              <Line
                id="pressure-chart"
                data={chartData}
                options={chartOptions}
                onClick={handleChartClick}
              />
              {slope && (
                <div className="slope-info">
                  <h3>Slope Analysis</h3>
                  <p>Slope: {slope.toFixed(4)} psi/hr</p>
                </div>
              )}
            </div>
          ))}

        {activeTab === "diagnosticPlot" && <DiagnosticPlot />}
      </main>
    </div>
  );
}

export default App;

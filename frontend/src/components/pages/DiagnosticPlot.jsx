import React, { useState, useEffect, useMemo } from "react";
import DiagnosticScatterPlot from "../charts/DiagnosticScatterPlot";
import { fetchDiagnosticData, calculateParameters } from "../../services/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LogarithmicScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

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
    const loadDiagnosticData = async () => {
      try {
        setLoading(true);
        const data = await fetchDiagnosticData();
        setDiagnosticData(data);

        // Debug information
        const debugObj = {
          hasData: !!data,
          keysInData: data ? Object.keys(data) : [],
          dataLength: data && data.delta_t_hrs ? data.delta_t_hrs.length : 0,
          samplePoints:
            data && data.delta_t_hrs
              ? {
                  delta_t_hrs: data.delta_t_hrs.slice(0, 5),
                  delta_p_psi: data.delta_p_psi.slice(0, 5),
                  m_graph1: data.m_graph1.slice(0, 5),
                  PPD1: data.PPD1?.slice(0, 5) || [],
                  m_graph_effective_time: data.m_graph_effective_time.slice(
                    0,
                    5
                  ),
                  p_line_fall_off: data.p_line_fall_off.slice(0, 5),
                }
              : {},
        };
        setDebugInfo(debugObj);
      } catch (err) {
        console.error("Error fetching diagnostic data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDiagnosticData();
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
  const handleCalculateParameters = async () => {
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

      const data = await calculateParameters(pointInputs);
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
            onClick={handleCalculateParameters}
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

      <DiagnosticScatterPlot
        chartData={chartData}
        chartOptions={chartOptions}
        onChartInit={onChartInit}
      />
    </div>
  );
};

export default DiagnosticPlot;

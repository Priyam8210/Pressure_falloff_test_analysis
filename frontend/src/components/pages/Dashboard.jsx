import React, { useState, useEffect, useMemo, useCallback } from "react";
import PressureChart from "../charts/PressureChart";
import { fetchPressureData } from "../../services/api";
import { Chart as ChartJS } from "chart.js";

// Constants for performance
const DOWNSAMPLE_FACTOR = 50;

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [slope, setSlope] = useState(null);

  // Add state for slope lines
  const [slopeLines, setSlopeLines] = useState([]);
  const [activeLineId, setActiveLineId] = useState(null);

  // Fetch data with loading state
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const responseData = await fetchPressureData();
        setData(responseData);
      } catch (err) {
        console.error("Error fetching pressure data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

          // Optionally create a slope line from the selected points
          addSlopeLine({
            label: `Calculated Slope ${calculatedSlope.toFixed(2)}`,
            startPoint: {
              x: processedData.time[start],
              y: processedData.pwf[start],
            },
            endPoint: {
              x: processedData.time[end],
              y: processedData.pwf[end],
            },
            color: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(
              Math.random() * 255
            )}, ${Math.floor(Math.random() * 255)})`,
          });
        } else {
          setSelectedPoints(newSelectedPoints);
        }
      }
    },
    [processedData, selectedPoints]
  );

  // Add slope line function
  const addSlopeLine = useCallback(
    (slopeLineProps = {}) => {
      const newLine = {
        id: Date.now().toString(),
        startPoint: slopeLineProps.startPoint || {
          x:
            processedData?.time?.[
              Math.floor(processedData?.time?.length / 3)
            ] || 0,
          y:
            processedData?.pwf?.[Math.floor(processedData?.pwf?.length / 3)] ||
            0,
        },
        endPoint: slopeLineProps.endPoint || {
          x:
            processedData?.time?.[
              Math.floor((processedData?.time?.length * 2) / 3)
            ] || 0,
          y:
            processedData?.pwf?.[
              Math.floor((processedData?.pwf?.length * 2) / 3)
            ] || 0,
        },
        color:
          slopeLineProps.color ||
          `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(
            Math.random() * 255
          )}, ${Math.floor(Math.random() * 255)})`,
        label: slopeLineProps.label || `Slope Line ${slopeLines.length + 1}`,
      };

      // Calculate the slope
      const calculatedSlope =
        (newLine.endPoint.y - newLine.startPoint.y) /
        (newLine.endPoint.x - newLine.startPoint.x);
      newLine.originalSlope = calculatedSlope;

      setSlopeLines((prev) => [...prev, newLine]);
      setActiveLineId(newLine.id);
    },
    [processedData, slopeLines]
  );

  // Update a slope line
  const updateSlopeLine = useCallback((id, updates) => {
    setSlopeLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...updates } : line))
    );
  }, []);

  // Remove a slope line
  const removeSlopeLine = useCallback(
    (id) => {
      setSlopeLines((prev) => prev.filter((line) => line.id !== id));
      if (activeLineId === id) {
        setActiveLineId(null);
      }
    },
    [activeLineId]
  );

  // Reset zoom handler
  const handleResetZoom = () => {
    const chart = ChartJS.getChart("pressure-chart");
    if (chart) {
      chart.resetZoom();
    }
  };

  if (loading) return <div className="loading">Loading data...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!processedData) return <div className="error">No data available</div>;

  return (
    <div className="dashboard">
      <h2>Pressure vs Time Chart</h2>

      <div className="chart-controls">
        <button onClick={handleResetZoom}>Reset Zoom</button>
        <button onClick={() => addSlopeLine()}>Add Slope Line</button>
        <div className="instructions">
          <p>Zoom: Mouse wheel or pinch</p>
          <p>Pan: Hold Shift + Drag</p>
          <p>Click two points to calculate slope</p>
        </div>
      </div>

      <PressureChart
        processedData={processedData}
        selectedPoints={selectedPoints}
        handleChartClick={handleChartClick}
        slope={slope}
        slopeLines={slopeLines}
        activeLineId={activeLineId}
        setActiveLineId={setActiveLineId}
        addSlopeLine={addSlopeLine}
        removeSlopeLine={removeSlopeLine}
        updateSlopeLine={updateSlopeLine}
      />
    </div>
  );
};

export default Dashboard;

import React, { useMemo, useCallback, useRef, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import SlopeLines from "./SlopeLines";

// Try to import the annotation plugin, but make it optional
let annotationPlugin = null;
try {
  annotationPlugin = require("chartjs-plugin-annotation").default;
  if (annotationPlugin) {
    ChartJS.register(annotationPlugin);
  }
} catch (error) {
  console.warn(
    "chartjs-plugin-annotation not available. Some features might be limited."
  );
}

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

// Constants for performance
const DOWNSAMPLE_FACTOR = 50;

const PressureChart = ({
  processedData,
  selectedPoints,
  handleChartClick,
  slope,
  // Slope line props
  slopeLines = [],
  activeLineId,
  setActiveLineId,
  addSlopeLine,
  removeSlopeLine,
  updateSlopeLine,
}) => {
  const chartRef = useRef(null);
  const [dragging, setDragging] = React.useState(null); // 'start', 'end', or null

  // Calculate the slope of a line
  const calculateSlope = useCallback((startPoint, endPoint) => {
    if (endPoint.x === startPoint.x) return 0; // Avoid division by zero
    return (endPoint.y - startPoint.y) / (endPoint.x - startPoint.x);
  }, []);

  // Handle point drag start
  const handleDragStart = useCallback(
    (e, lineId, pointType) => {
      e.stopPropagation();
      setActiveLineId(lineId);
      setDragging(pointType);
    },
    [setActiveLineId]
  );

  // Handle point drag end
  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging || !activeLineId || !chartRef.current) return;

      const chart = chartRef.current;
      const canvas = chart.canvas;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert pixel coordinates to chart data values
      const xValue = chart.scales.x.getValueForPixel(x);
      const yValue = chart.scales.y.getValueForPixel(y);

      const activeLine = slopeLines.find((line) => line.id === activeLineId);
      if (!activeLine) return;

      if (dragging === "start") {
        updateSlopeLine(activeLineId, {
          startPoint: { x: xValue, y: yValue },
        });
      } else if (dragging === "end") {
        updateSlopeLine(activeLineId, {
          endPoint: { x: xValue, y: yValue },
        });
      }
    },
    [dragging, activeLineId, slopeLines, updateSlopeLine]
  );

  // Setup event listeners for dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleDragEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [dragging, handleMouseMove, handleDragEnd]);

  // Create data points for drag handles
  const handlePointsData = useMemo(() => {
    if (!activeLineId) return [];

    const activeLine = slopeLines.find((line) => line.id === activeLineId);
    if (!activeLine) return [];

    return [
      {
        label: "Start Point",
        data: [{ x: activeLine.startPoint.x, y: activeLine.startPoint.y }],
        backgroundColor: activeLine.color,
        borderColor: "white",
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 10,
        showLine: false,
      },
      {
        label: "End Point",
        data: [{ x: activeLine.endPoint.x, y: activeLine.endPoint.y }],
        backgroundColor: activeLine.color,
        borderColor: "white",
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 10,
        showLine: false,
      },
    ];
  }, [activeLineId, slopeLines]);

  // Chart.js configuration
  const chartData = useMemo(
    () => ({
      labels: processedData?.time || [],
      datasets: [
        {
          label: "Pwf (psi)",
          data:
            processedData?.time?.map((t, i) => ({
              x: t,
              y: processedData?.pwf?.[i],
            })) || [],
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          tension: 0.1,
          pointRadius: (context) => {
            const index = context.dataIndex;
            return selectedPoints.includes(index) ? 6 : 0;
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
          data:
            processedData?.time?.map((t, i) => ({
              x: t,
              y: processedData?.pws?.[i],
            })) || [],
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          tension: 0.1,
          pointRadius: (context) => {
            const index = context.dataIndex;
            return selectedPoints.includes(index) ? 6 : 0;
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
        // Add dynamically generated slope lines
        ...slopeLines.map((line) => {
          // Generate data points for the slope line
          return {
            label: line.label || `Slope Line ${slopeLines.indexOf(line) + 1}`,
            data: [
              { x: line.startPoint.x, y: line.startPoint.y },
              { x: line.endPoint.x, y: line.endPoint.y },
            ],
            borderColor: line.color,
            backgroundColor: "transparent",
            borderWidth: activeLineId === line.id ? 3 : 2,
            pointRadius: 0,
            tension: 0,
            showLine: true,
          };
        }),
        // Add drag handle points for active line
        ...handlePointsData,
      ],
    }),
    [processedData, selectedPoints, slopeLines, activeLineId, handlePointsData]
  );

  // Custom plugin for drag handles
  const dragHandlesPlugin = useMemo(
    () => ({
      id: "dragHandles",
      afterDraw: (chart) => {
        if (!activeLineId || !chartRef.current) return;

        const activeLine = slopeLines.find((line) => line.id === activeLineId);
        if (!activeLine) return;

        const ctx = chart.ctx;
        const startX = chart.scales.x.getPixelForValue(activeLine.startPoint.x);
        const startY = chart.scales.y.getPixelForValue(activeLine.startPoint.y);
        const endX = chart.scales.x.getPixelForValue(activeLine.endPoint.x);
        const endY = chart.scales.y.getPixelForValue(activeLine.endPoint.y);

        // Draw slope value in the middle of the line
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const slope = calculateSlope(
          activeLine.startPoint,
          activeLine.endPoint
        );

        ctx.save();
        ctx.fillStyle = activeLine.color;
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`Slope: ${slope.toFixed(2)} psi/hr`, midX, midY - 15);
        ctx.restore();
      },
    }),
    [activeLineId, slopeLines, calculateSlope]
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
        dragHandlesPlugin,
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              const datasetLabel = context.dataset.label;
              if (datasetLabel.includes("Slope Line")) {
                return `${datasetLabel}: ${value.toFixed(2)} psi`;
              }
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
      onClick: (e) => {
        // Prevent handling clicks when we're in drag mode
        if (dragging) return;

        const canvasPosition = {
          x: e.native.offsetX,
          y: e.native.offsetY,
        };

        // Check if we clicked on any points
        const points = chartRef.current.getElementsAtEventForMode(
          e.native,
          "nearest",
          { intersect: true },
          true
        );

        // If clicking on a point from a slope line, set it as active
        if (points.length > 0) {
          const datasetIndex = points[0].datasetIndex;
          if (datasetIndex >= 2 && datasetIndex < 2 + slopeLines.length) {
            const slopeLineIndex = datasetIndex - 2;
            const slopeLine = slopeLines[slopeLineIndex];
            setActiveLineId(slopeLine.id);
            return;
          }
        }

        // Otherwise, handle the normal chart click
        if (handleChartClick) {
          handleChartClick(e);
        }
      },
    }),
    [dragHandlesPlugin, dragging, handleChartClick, slopeLines, setActiveLineId]
  );

  // Handle click on point
  const handlePointClick = useCallback(
    (e, pointType) => {
      if (!activeLineId) return;

      e.stopPropagation();
      setDragging(pointType);
    },
    [activeLineId]
  );

  return (
    <div className="pressure-analysis-container">
      <div
        className="chart-container"
        style={{ height: "500px", width: "100%", position: "relative" }}
      >
        <Line
          ref={chartRef}
          id="pressure-chart"
          data={chartData}
          options={chartOptions}
          plugins={[dragHandlesPlugin]}
        />

        {/* Overlay for drag points */}
        {activeLineId &&
          slopeLines.find((line) => line.id === activeLineId) && (
            <>
              {/* Start point handle */}
              <div
                className="drag-point start-point"
                style={{
                  position: "absolute",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  backgroundColor: slopeLines.find(
                    (line) => line.id === activeLineId
                  ).color,
                  border: "2px solid white",
                  transform: "translate(-50%, -50%)",
                  cursor: "move",
                  zIndex: 10,
                  left: chartRef.current
                    ? chartRef.current.scales.x.getPixelForValue(
                        slopeLines.find((line) => line.id === activeLineId)
                          .startPoint.x
                      )
                    : 0,
                  top: chartRef.current
                    ? chartRef.current.scales.y.getPixelForValue(
                        slopeLines.find((line) => line.id === activeLineId)
                          .startPoint.y
                      )
                    : 0,
                  boxShadow: "0 0 5px rgba(0,0,0,0.3)",
                }}
                onMouseDown={(e) => handlePointClick(e, "start")}
              />

              {/* End point handle */}
              <div
                className="drag-point end-point"
                style={{
                  position: "absolute",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  backgroundColor: slopeLines.find(
                    (line) => line.id === activeLineId
                  ).color,
                  border: "2px solid white",
                  transform: "translate(-50%, -50%)",
                  cursor: "move",
                  zIndex: 10,
                  left: chartRef.current
                    ? chartRef.current.scales.x.getPixelForValue(
                        slopeLines.find((line) => line.id === activeLineId)
                          .endPoint.x
                      )
                    : 0,
                  top: chartRef.current
                    ? chartRef.current.scales.y.getPixelForValue(
                        slopeLines.find((line) => line.id === activeLineId)
                          .endPoint.y
                      )
                    : 0,
                  boxShadow: "0 0 5px rgba(0,0,0,0.3)",
                }}
                onMouseDown={(e) => handlePointClick(e, "end")}
              />
            </>
          )}
      </div>

      {/* Show the SlopeLines component for managing slope lines */}
      <SlopeLines
        slopeLines={slopeLines}
        activeLineId={activeLineId}
        setActiveLineId={setActiveLineId}
        addSlopeLine={addSlopeLine}
        removeSlopeLine={removeSlopeLine}
        updateSlopeLine={updateSlopeLine}
      />

      {/* Show the overall slope from the backend if available */}
      {slope && (
        <div className="slope-info">
          <h3>Slope Analysis from Backend</h3>
          <p>Slope: {slope.toFixed(4)} psi/hr</p>
        </div>
      )}
    </div>
  );
};

export default PressureChart;

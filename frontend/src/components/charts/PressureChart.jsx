import React, { useMemo, useCallback } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
} from "chart.js";

// Constants for performance
const DOWNSAMPLE_FACTOR = 50;

const PressureChart = ({
  processedData,
  selectedPoints,
  handleChartClick,
  slope,
}) => {
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

  return (
    <div className="chart-container" style={{ height: "500px", width: "100%" }}>
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
  );
};

export default PressureChart;
import React from "react";
import { Scatter } from "react-chartjs-2";

const DiagnosticScatterPlot = ({ chartData, chartOptions, onChartInit }) => {
  return (
    <div className="chart-container" style={{ height: "500px", width: "100%" }}>
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
  );
};

export default DiagnosticScatterPlot;

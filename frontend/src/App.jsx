// frontend/app.js

import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LogarithmicScale,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "./App.css";

// Import components
import Layout from "./components/layout/Layout";
import Dashboard from "./components/pages/Dashboard";
import DiagnosticPlot from "./components/pages/DiagnosticPlot";

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

function App() {
  const [activeTab, setActiveTab] = useState("pressureChart");

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "pressureChart" && <Dashboard />}
      {activeTab === "diagnosticPlot" && <DiagnosticPlot />}
    </Layout>
  );
}

export default App;

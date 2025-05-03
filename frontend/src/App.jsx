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
// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// function App() {
//   return (
//     <BrowserRouter>
//       <Layout>
//         <Routes>
//           <Route path="/" element={<Navigate to="/dashboard" />} />
//           <Route path="/dashboard" element={<Dashboard />} />
//           <Route path="/diagnostic-plot" element={<DiagnosticPlot />} />
//         </Routes>
//       </Layout>
//     </BrowserRouter>
//   );
// }

export default App;

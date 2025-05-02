import React from "react";

const Header = ({ activeTab, setActiveTab }) => {
  return (
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
    </header>
  );
};

export default Header;

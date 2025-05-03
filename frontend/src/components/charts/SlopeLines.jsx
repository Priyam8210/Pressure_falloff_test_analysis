import React, { useState, useCallback } from "react";
import "./SlopeLines.css";

const SlopeLines = ({
  slopeLines = [],
  activeLineId,
  setActiveLineId,
  addSlopeLine,
  removeSlopeLine,
  updateSlopeLine,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLineData, setNewLineData] = useState({
    label: "",
    slope: 1,
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
  });

  // Calculate the slope of a line
  const calculateSlope = useCallback((startPoint, endPoint) => {
    if (endPoint.x === startPoint.x) return 0; // Avoid division by zero
    return (endPoint.y - startPoint.y) / (endPoint.x - startPoint.x);
  }, []);

  // Handle creation of a new slope line with predefined parameters
  const handleAddLine = useCallback(() => {
    if (!newLineData.label) {
      alert("Please provide a label for the slope line");
      return;
    }

    // Create a line with the specified slope
    addSlopeLine({
      label: newLineData.label,
      color: newLineData.color,
      slope: parseFloat(newLineData.slope),
    });

    // Reset form
    setNewLineData({
      label: "",
      slope: 1,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    });
    setShowAddForm(false);
  }, [addSlopeLine, newLineData]);

  // Extend a slope line
  const extendSlopeLine = useCallback(
    (id, factor) => {
      const line = slopeLines.find((l) => l.id === id);
      if (!line) return;

      // Calculate the direction vector
      const dx = line.endPoint.x - line.startPoint.x;
      const dy = line.endPoint.y - line.startPoint.y;

      // Apply the extension factor
      updateSlopeLine(id, {
        endPoint: {
          x: line.startPoint.x + dx * factor,
          y: line.startPoint.y + dy * factor,
        },
      });
    },
    [slopeLines, updateSlopeLine]
  );

  // Reset a slope line to maintain its original slope
  const resetSlopeLine = useCallback(
    (id) => {
      const line = slopeLines.find((l) => l.id === id);
      if (!line) return;

      const currentSlope = calculateSlope(line.startPoint, line.endPoint);
      const targetSlope = line.originalSlope || 1.0;

      // Keep the start point fixed, adjust the end point
      const dx = 1.0; // Use 1 log cycle as the default x distance
      const dy = dx * targetSlope;

      updateSlopeLine(id, {
        endPoint: {
          x: line.startPoint.x + dx,
          y: line.startPoint.y + dy,
        },
        originalSlope: targetSlope,
      });
    },
    [slopeLines, calculateSlope, updateSlopeLine]
  );

  return (
    <div className="slope-lines-panel">
      <div className="slope-lines-toolbar">
        <div className="toolbar-title">Slope Lines Analysis</div>
        <div className="toolbar-buttons">
          <button
            className="toolbar-button"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "Add New Slope Line"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="custom-line-form">
          <div className="form-group">
            <label>Label</label>
            <input
              type="text"
              value={newLineData.label}
              onChange={(e) =>
                setNewLineData({ ...newLineData, label: e.target.value })
              }
              placeholder="e.g., Wellbore Storage, Linear Flow, etc."
            />
          </div>
          <div className="form-group">
            <label>Slope Value</label>
            <input
              type="number"
              value={newLineData.slope}
              onChange={(e) =>
                setNewLineData({ ...newLineData, slope: e.target.value })
              }
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label>Color</label>
            <input
              type="color"
              value={newLineData.color}
              onChange={(e) =>
                setNewLineData({ ...newLineData, color: e.target.value })
              }
            />
          </div>
          <div className="form-actions">
            <button onClick={handleAddLine}>Add Line</button>
            <button onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="reference-lines">
        {slopeLines.map((line) => {
          const currentSlope = calculateSlope(line.startPoint, line.endPoint);
          return (
            <div
              key={line.id}
              className="reference-line-item"
              style={{
                borderLeft:
                  activeLineId === line.id
                    ? `4px solid ${line.color}`
                    : "1px solid #ddd",
              }}
              onClick={() =>
                setActiveLineId(line.id === activeLineId ? null : line.id)
              }
            >
              <div>
                <span
                  className="color-swatch"
                  style={{ backgroundColor: line.color }}
                ></span>
                {line.label || `Slope Line ${slopeLines.indexOf(line) + 1}`}
                <div>Slope: {currentSlope.toFixed(4)} psi/hr</div>
              </div>
              <div className="line-actions">
                <button
                  className="toolbar-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetSlopeLine(line.id);
                  }}
                >
                  Reset
                </button>
                <button
                  className="toolbar-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    extendSlopeLine(line.id, 1.5);
                  }}
                >
                  Extend
                </button>
                <button
                  className="toolbar-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    extendSlopeLine(line.id, 0.67);
                  }}
                >
                  Shorten
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSlopeLine(line.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {slopeLines.length === 0 && (
        <div className="line-instructions">
          No slope lines added yet. Click "Add New Slope Line" to create one, or
          click and drag on the chart to create points.
        </div>
      )}
    </div>
  );
};

export default SlopeLines;

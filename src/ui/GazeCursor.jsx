/**
 * Gaze Cursor Component
 * Visual indicator showing predicted gaze position
 */

import React from 'react';
import './GazeCursor.css';

function GazeCursor({ position, isDwelling, dwellProgress, visible = true }) {
  if (!visible || !position) {
    return null;
  }

  return (
    <div
      className="gaze-cursor"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {/* Main cursor dot */}
      <div className="cursor-dot"></div>
      
      {/* Dwell progress ring */}
      {isDwelling && (
        <svg className="dwell-ring" viewBox="0 0 100 100">
          <circle
            className="dwell-ring-bg"
            cx="50"
            cy="50"
            r="45"
          />
          <circle
            className="dwell-ring-progress"
            cx="50"
            cy="50"
            r="45"
            style={{
              strokeDashoffset: `${283 * (1 - dwellProgress)}`
            }}
          />
        </svg>
      )}
    </div>
  );
}

export default GazeCursor;

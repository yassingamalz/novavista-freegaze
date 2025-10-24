/**
 * Calibration Component for NovaVista FreeGaze
 * 9-point calibration system for gaze prediction
 */

import React, { useState, useEffect } from 'react';
import './Calibration.css';

function Calibration({ onCalibrationComplete, onCancel, eyeFeatures, calibrationManager }) {
  const [currentPoint, setCurrentPoint] = useState(0);
  const [isCollecting, setIsCollecting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [calibrationData, setCalibrationData] = useState([]);

  // 9-point grid (percentage positions)
  const calibrationPoints = [
    { x: 10, y: 10, id: 1 },   // Top-left
    { x: 50, y: 10, id: 2 },   // Top-center
    { x: 90, y: 10, id: 3 },   // Top-right
    { x: 10, y: 50, id: 4 },   // Middle-left
    { x: 50, y: 50, id: 5 },   // Center
    { x: 90, y: 50, id: 6 },   // Middle-right
    { x: 10, y: 90, id: 7 },   // Bottom-left
    { x: 50, y: 90, id: 8 },   // Bottom-center
    { x: 90, y: 90, id: 9 }    // Bottom-right
  ];

  const totalPoints = calibrationPoints.length;
  const progress = ((currentPoint) / totalPoints) * 100;

  // Start collection countdown
  useEffect(() => {
    if (isCollecting && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isCollecting && countdown === 0) {
      // Start collecting data
      collectDataForPoint();
    }
  }, [isCollecting, countdown]);

  function collectDataForPoint() {
    // Collect 60 samples (2 seconds at 30 FPS)
    const point = calibrationPoints[currentPoint];
    const screenX = (point.x / 100) * window.innerWidth;
    const screenY = (point.y / 100) * window.innerHeight;
    
    let sampleCount = 0;
    const maxSamples = 60;
    
    const collectInterval = setInterval(() => {
      if (eyeFeatures) {
        calibrationManager.addSample(eyeFeatures, screenX, screenY);
        sampleCount++;
      }
      
      if (sampleCount >= maxSamples) {
        clearInterval(collectInterval);
        
        // Complete this point
        const success = calibrationManager.completeCurrentPoint();
        
        if (success) {
          // Move to next point
          if (currentPoint < totalPoints - 1) {
            setCurrentPoint(currentPoint + 1);
            setIsCollecting(false);
            setCountdown(3);
            setTimeout(() => setIsCollecting(true), 500);
          } else {
            // Calibration complete
            const data = calibrationManager.finishCalibration();
            onCalibrationComplete(data);
          }
        } else {
          // Failed to collect, retry
          setIsCollecting(false);
          setCountdown(3);
          setTimeout(() => setIsCollecting(true), 500);
        }
      }
    }, 33); // ~30 Hz
  }

  function startCalibration() {
    setCurrentPoint(0);
    setIsCollecting(true);
    setCountdown(3);
    setCalibrationData([]);
  }

  const point = calibrationPoints[currentPoint];

  return (
    <div className="calibration-overlay">
      <div className="calibration-header">
        <h2>Calibration</h2>
        <p>Look at each point and keep your gaze steady</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="progress-text">
          Point {currentPoint + 1} of {totalPoints}
        </p>
      </div>

      {!isCollecting && currentPoint === 0 && (
        <div className="calibration-start">
          <button className="start-button" onClick={startCalibration}>
            Start Calibration
          </button>
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}

      {isCollecting && (
        <>
          <div
            className="calibration-point"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`
            }}
          >
            <div className="point-outer"></div>
            <div className="point-inner"></div>
            {countdown > 0 && (
              <div className="point-countdown">{countdown}</div>
            )}
          </div>

          <div className="calibration-instructions">
            {countdown > 0 ? (
              <p>Get ready... {countdown}</p>
            ) : (
              <p>Keep looking at the point...</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Calibration;

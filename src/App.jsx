/**
 * NovaVista FreeGaze - Main Application Component
 * Full Integration: Detection + Calibration + Prediction + Tracking
 * v1.1 - With Performance Optimizations and Debug Mode
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initCamera, stopCamera } from './core/camera';
import { initFaceMesh, drawFaceLandmarks } from './core/faceDetection';
import { extractEyeFeatures, areEyeFeaturesValid } from './core/featureExtraction';
import { calibrationManager } from './core/calibration';
import { gazePredictionModel } from './core/prediction';
import { gazeSmoother } from './utils/smoothing';
import { dwellDetector } from './utils/dwellTimer';
import Calibration from './ui/Calibration';
import GazeCursor from './ui/GazeCursor';
import './App.css';

function App() {
  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  const modeRef = useRef('detection');
  const modelTrainedRef = useRef(false);
  const debugModeRef = useRef(false);
  
  // Core state
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [fps, setFps] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  
  // Mode state
  const [mode, setMode] = useState('detection'); // 'detection', 'calibrating', 'tracking'
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  // Tracking state
  const [eyeFeatures, setEyeFeatures] = useState(null);
  const [gazePosition, setGazePosition] = useState(null);
  const [isDwelling, setIsDwelling] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [modelTrained, setModelTrained] = useState(false);
  
  // Keep refs in sync
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  
  useEffect(() => {
    modelTrainedRef.current = modelTrained;
  }, [modelTrained]);
  
  useEffect(() => {
    debugModeRef.current = debugMode;
  }, [debugMode]);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;
    
    async function setup() {
      try {
        console.log('🚀 Initializing NovaVista FreeGaze v1.1...');
        
        const stream = await initCamera(videoRef.current);
        streamRef.current = stream;
        
        if (!mounted) {
          stopCamera(stream);
          return;
        }
        
        await initFaceMesh(videoRef.current, onFaceDetected);
        
        if (!mounted) return;
        
        // Try to load saved model
        const loaded = await gazePredictionModel.loadModel();
        if (loaded) {
          setModelTrained(true);
          setMode('tracking');
          console.log('✅ Model loaded from storage');
        }
        
        setIsInitialized(true);
        console.log('✅ Setup complete!');
        
      } catch (err) {
        console.error('❌ Setup failed:', err);
        setError(err.message || 'Failed to initialize');
      }
    }
    
    setup();
    
    return () => {
      mounted = false;
      if (streamRef.current) {
        stopCamera(streamRef.current);
      }
    };
  }, []);

  // FPS calculation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastFrameTimeRef.current) / 1000;
      const currentFps = Math.round(frameCountRef.current / elapsed);
      
      setFps(currentFps);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Setup dwell detector callbacks (use useCallback to avoid recreating)
  useEffect(() => {
    dwellDetector.onProgress((progress) => {
      setDwellProgress(progress);
    });

    dwellDetector.onClick((event) => {
      console.log('👆 Click at:', event.position);
      // Trigger actual click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: event.position.x,
        clientY: event.position.y
      });
      document.elementFromPoint(event.position.x, event.position.y)?.dispatchEvent(clickEvent);
    });
  }, []);

  /**
   * Face detection callback (optimized with useCallback)
   */
  const onFaceDetected = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const videoElement = videoRef.current;
    
    if (canvas.width !== videoElement.videoWidth) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
      const landmarks = results.multiFaceLandmarks[0];
      
      setFaceDetected(true);
      frameCountRef.current++;
      
      // Draw landmarks (only in detection/calibration mode, or if debug mode is on)
      if (modeRef.current !== 'tracking' || debugModeRef.current) {
        drawFaceLandmarks(ctx, landmarks, canvas.width, canvas.height);
      }
      
      // Extract features
      const features = extractEyeFeatures(landmarks);
      
      if (features && areEyeFeaturesValid(features)) {
        setEyeFeatures(features);
        
        // Handle different modes (use refs for current values)
        const currentMode = modeRef.current;
        const isModelTrained = modelTrainedRef.current;
        
        if (currentMode === 'calibrating' && isCalibrating) {
          // Collect calibration data (handled by Calibration component)
        } else if (currentMode === 'tracking' && isModelTrained) {
          // Predict gaze
          const prediction = gazePredictionModel.predict(features.vector);
          if (prediction) {
            // Mirror X coordinate (because video is flipped horizontally)
            const mirroredPrediction = {
              x: 100 - prediction.x, // Flip horizontally
              y: prediction.y
            };
            
            // Smooth coordinates (still in percentage)
            const smoothed = gazeSmoother.smooth(mirroredPrediction.x, mirroredPrediction.y);
            
            // Convert percentage to pixels
            const pixelPosition = {
              x: (smoothed.x / 100) * window.innerWidth,
              y: (smoothed.y / 100) * window.innerHeight
            };
            
            setGazePosition(pixelPosition);
            
            // Update dwell detector (use pixel position)
            const dwellEvent = dwellDetector.update(pixelPosition);
            if (dwellEvent && dwellEvent.type === 'click') {
              console.log('👁️ Click event:', dwellEvent);
            }
            setIsDwelling(dwellEvent && (dwellEvent.type === 'dwell_progress' || dwellEvent.type === 'dwell_start'));
          }
        }
      }
      
    } else {
      setFaceDetected(false);
      setEyeFeatures(null);
    }
  }, [isCalibrating]);

  /**
   * Start calibration
   */
  function startCalibration() {
    setMode('calibrating');
    setIsCalibrating(true);
    calibrationManager.startCalibration();
  }

  /**
   * Handle calibration complete
   */
  async function handleCalibrationComplete(calibrationData) {
    setIsCalibrating(false);
    
    try {
      console.log('🎓 Training model...');
      const data = calibrationManager.getCalibrationData();
      
      // Validate calibration data
      if (!data || data.length < 9) {
        throw new Error(`Not enough calibration points. Got ${data?.length || 0}, need 9.`);
      }
      
      // Train model
      await gazePredictionModel.train(data, {
        epochs: 100,
        batchSize: 8,
        verbose: 0
      });
      
      // Save model
      await gazePredictionModel.saveModel();
      calibrationManager.saveToStorage();
      
      setModelTrained(true);
      setMode('tracking');
      
      // Enable dwell detector
      dwellDetector.setEnabled(true);
      
      console.log('✅ Calibration complete! Starting tracking...');
      
    } catch (error) {
      console.error('❌ Calibration failed:', error);
      setError(`Calibration failed: ${error.message}\n\nPlease ensure:\n  • Good lighting (face the window, not backlit)\n  • Face clearly visible in camera\n  • Look directly at each calibration point\n  • Hold your head still during calibration\n\nClick 'Reload Page' to try again.`);
      setMode('detection');
    }
  }

  /**
   * Cancel calibration
   */
  function handleCalibrationCancel() {
    setIsCalibrating(false);
    setMode('detection');
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>NovaVista FreeGaze 👁️</h1>
        <p className="tagline">Open-Source Eye Tracking for Accessibility</p>
      </header>

      <main className="App-main">
        {/* Error Display */}
        {error && (
          <div className="error-message">
            <h2>❌ Error</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
            <button onClick={() => window.location.reload()}>Reload Page</button>
          </div>
        )}

        {/* Video Container */}
        {!error && (
          <div className="video-container">
            <video ref={videoRef} style={{ display: 'none' }} playsInline />
            <canvas ref={canvasRef} className="face-canvas" />
            
            {!isInitialized && (
              <div className="video-overlay">
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Initializing...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Panel */}
        {isInitialized && (
          <div className="status-panel">
            <div className={`status-item ${faceDetected ? 'success' : 'warning'}`}>
              <span className="status-label">Face:</span>
              <span className="status-value">{faceDetected ? '✅ Detected' : '❌ Not Found'}</span>
            </div>
            <div className={`status-item ${fps >= 20 ? 'success' : fps >= 15 ? 'warning' : ''}`}>
              <span className="status-label">FPS:</span>
              <span className="status-value">{fps}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Mode:</span>
              <span className="status-value">{mode}</span>
            </div>
            <div className={`status-item ${modelTrained ? 'success' : ''}`}>
              <span className="status-label">Model:</span>
              <span className="status-value">{modelTrained ? '✅ Trained' : '⏳ Not Trained'}</span>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        {isInitialized && !isCalibrating && faceDetected && (
          <div className="control-buttons">
            {!modelTrained && (
              <button className="calibrate-button" onClick={startCalibration}>
                🎯 Start Calibration
              </button>
            )}
            {modelTrained && mode === 'tracking' && (
              <>
                <button className="recalibrate-button" onClick={startCalibration}>
                  🔄 Re-Calibrate
                </button>
                <button 
                  className="toggle-cursor-button" 
                  onClick={() => setDebugMode(!debugMode)}
                >
                  {debugMode ? '👁️ Hide Debug' : '🔍 Show Debug'}
                </button>
              </>
            )}
            {mode === 'detection' && modelTrained && (
              <button className="tracking-button" onClick={() => setMode('tracking')}>
                🎯 Start Tracking
              </button>
            )}
          </div>
        )}

        {/* Instructions */}
        {isInitialized && !faceDetected && !isCalibrating && (
          <div className="instructions">
            <h3>👋 Position your face in front of the camera</h3>
            <ul>
              <li>Good lighting required</li>
              <li>Face the camera directly</li>
              <li>Stay within ~60cm</li>
            </ul>
          </div>
        )}

        {faceDetected && !modelTrained && !isCalibrating && (
          <div className="instructions success-box">
            <h3>✅ Ready for Calibration!</h3>
            <p>Click "Start Calibration" to begin the 9-point calibration process.</p>
            <p>This will take about 30 seconds.</p>
          </div>
        )}

        {mode === 'tracking' && modelTrained && (
          <div className="instructions success-box">
            <h3>🎉 Eye Tracking Active!</h3>
            <p>Look at any point and hold for 0.6 seconds to click.</p>
            <p>Green cursor shows your gaze position.</p>
            <p className="phase-info">🪞 Video is mirrored like looking in a mirror for natural interaction</p>
            
            {/* Debug Mode Feature Display */}
            {debugMode && eyeFeatures && (
              <div className="feature-display">
                <h4>🔍 Debug Info - Eye Features</h4>
                <div className="feature-grid">
                  <div className="feature-item">
                    <span className="feature-label">Left Iris X</span>
                    <span className="feature-value">{eyeFeatures.normalized.leftIrisX.toFixed(2)}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">Left Iris Y</span>
                    <span className="feature-value">{eyeFeatures.normalized.leftIrisY.toFixed(2)}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">Right Iris X</span>
                    <span className="feature-value">{eyeFeatures.normalized.rightIrisX.toFixed(2)}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">Right Iris Y</span>
                    <span className="feature-value">{eyeFeatures.normalized.rightIrisY.toFixed(2)}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">Left Aperture</span>
                    <span className="feature-value">{eyeFeatures.normalized.leftAperture.toFixed(2)}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">Right Aperture</span>
                    <span className="feature-value">{eyeFeatures.normalized.rightAperture.toFixed(2)}</span>
                  </div>
                </div>
                <div className="feature-tip">
                  💡 Move your eyes around - these values should change smoothly!
                  <br />
                  If values are stuck, try re-calibrating in better lighting.
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Calibration Overlay */}
      {isCalibrating && (
        <Calibration
          onCalibrationComplete={handleCalibrationComplete}
          onCancel={handleCalibrationCancel}
          eyeFeatures={eyeFeatures}
          calibrationManager={calibrationManager}
        />
      )}

      {/* Gaze Cursor */}
      {mode === 'tracking' && (
        <GazeCursor
          position={gazePosition}
          isDwelling={isDwelling}
          dwellProgress={dwellProgress}
          visible={gazePosition !== null}
        />
      )}

      <footer className="App-footer">
        <p>Built with ❤️ by NovaVista | v1.1 Alpha - Optimized</p>
      </footer>
    </div>
  );
}

export default App;

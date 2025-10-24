/**
 * NovaVista FreeGaze - Main Application Component
 * Phase 1: Core Detection - Camera & Face Tracking
 */

import React, { useEffect, useRef, useState } from 'react';
import { initCamera, stopCamera } from './core/camera';
import { initFaceMesh, drawFaceLandmarks, extractEyeLandmarks } from './core/faceDetection';
import { extractEyeFeatures, areEyeFeaturesValid, formatFeatures } from './core/featureExtraction';
import './App.css';

function App() {
  // References to video and canvas elements
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [eyeFeatures, setEyeFeatures] = useState(null);
  const [featuresValid, setFeaturesValid] = useState(false);
  
  // Store camera stream for cleanup
  const streamRef = useRef(null);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);

  // Initialize camera and face detection on mount
  useEffect(() => {
    let mounted = true;
    
    async function setup() {
      try {
        console.log('🚀 Initializing NovaVista FreeGaze...');
        
        // Step 1: Initialize camera
        const stream = await initCamera(videoRef.current);
        streamRef.current = stream;
        
        if (!mounted) {
          stopCamera(stream);
          return;
        }
        
        // Step 2: Initialize MediaPipe FaceMesh
        await initFaceMesh(videoRef.current, onFaceDetected);
        
        if (!mounted) return;
        
        setIsInitialized(true);
        console.log('✅ Setup complete! Looking for your face...');
        
      } catch (err) {
        console.error('❌ Setup failed:', err);
        setError(err.message || 'Failed to initialize. Please check camera permissions.');
      }
    }
    
    setup();
    
    // Cleanup on unmount
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

  /**
   * Callback for MediaPipe face detection results
   * @param {Object} results - Detection results from MediaPipe
   */
  function onFaceDetected(results) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const videoElement = videoRef.current;
    
    // Update canvas size to match video
    if (canvas.width !== videoElement.videoWidth) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Check if face is detected
    if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Update state
      setFaceDetected(true);
      setLandmarkCount(landmarks.length);
      frameCountRef.current++;
      
      // Draw landmarks
      drawFaceLandmarks(ctx, landmarks, canvas.width, canvas.height);
      
      // Extract and log eye landmarks (for debugging)
      const eyeLandmarks = extractEyeLandmarks(landmarks);
      if (eyeLandmarks) {
        // Draw eye tracking info
        drawEyeInfo(ctx, eyeLandmarks, canvas.width, canvas.height);
      }
      
      // Extract eye features for gaze prediction (Phase 1 Week 2)
      const features = extractEyeFeatures(landmarks);
      if (features) {
        setEyeFeatures(features);
        setFeaturesValid(areEyeFeaturesValid(features));
        
        // Log features occasionally (every 30 frames to avoid spam)
        if (frameCountRef.current % 30 === 0) {
          console.log('👁️ Eye Features:', formatFeatures(features));
        }
      }
      
    } else {
      setFaceDetected(false);
      setLandmarkCount(0);
    }
  }

  /**
   * Draw eye tracking information on canvas
   */
  function drawEyeInfo(ctx, eyeLandmarks, width, height) {
    const { leftEye, rightEye } = eyeLandmarks;
    
    // Draw eye centers
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    
    // Left eye box
    ctx.beginPath();
    ctx.moveTo(leftEye.inner.x * width, leftEye.inner.y * height);
    ctx.lineTo(leftEye.outer.x * width, leftEye.outer.y * height);
    ctx.stroke();
    
    // Right eye box
    ctx.beginPath();
    ctx.moveTo(rightEye.inner.x * width, rightEye.inner.y * height);
    ctx.lineTo(rightEye.outer.x * width, rightEye.outer.y * height);
    ctx.stroke();
    
    // Draw iris centers (larger circles)
    ctx.fillStyle = 'lime';
    ctx.beginPath();
    ctx.arc(
      leftEye.iris.center.x * width,
      leftEye.iris.center.y * height,
      6,
      0,
      2 * Math.PI
    );
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(
      rightEye.iris.center.x * width,
      rightEye.iris.center.y * height,
      6,
      0,
      2 * Math.PI
    );
    ctx.fill();
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
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        )}

        {/* Video Container */}
        {!error && (
          <div className="video-container">
            <video 
              ref={videoRef} 
              style={{ display: 'none' }}
              playsInline
            />
            <canvas ref={canvasRef} className="face-canvas" />
            
            {/* Overlay Info */}
            <div className="video-overlay">
              {!isInitialized && (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Initializing camera and face detection...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Panel */}
        {isInitialized && (
          <div className="status-panel">
            <div className={`status-item ${isInitialized ? 'success' : ''}`}>
              <span className="status-label">System:</span>
              <span className="status-value">
                {isInitialized ? '✅ Ready' : '⏳ Initializing...'}
              </span>
            </div>
            
            <div className={`status-item ${faceDetected ? 'success' : 'warning'}`}>
              <span className="status-label">Face Detection:</span>
              <span className="status-value">
                {faceDetected ? '✅ Face Detected' : '❌ No Face'}
              </span>
            </div>
            
            <div className="status-item">
              <span className="status-label">Landmarks:</span>
              <span className="status-value">{landmarkCount} points</span>
            </div>
            
            <div className="status-item">
              <span className="status-label">FPS:</span>
              <span className="status-value">{fps}</span>
            </div>
            
            <div className="status-item">
              <span className="status-label">Phase:</span>
              <span className="status-value">1: Core Detection</span>
            </div>
            
            <div className={`status-item ${featuresValid ? 'success' : 'warning'}`}>
              <span className="status-label">Features:</span>
              <span className="status-value">
                {eyeFeatures ? (featuresValid ? '✅ Valid' : '⚠️ Invalid') : '❌ No Data'}
              </span>
            </div>
          </div>
        )}

        {/* Instructions */}
        {isInitialized && !faceDetected && (
          <div className="instructions">
            <h3>👋 Position your face in front of the camera</h3>
            <ul>
              <li>Make sure you have good lighting</li>
              <li>Face the camera directly</li>
              <li>Stay within ~60cm of the camera</li>
            </ul>
          </div>
        )}

        {faceDetected && eyeFeatures && (
          <div className="instructions success-box">
            <h3>🎉 Eye tracking active!</h3>
            <p>You should see cyan dots marking your face landmarks.</p>
            <p><strong>Red/lime dots</strong> show your iris positions (critical for eye tracking).</p>
            
            {/* Feature Display */}
            <div className="feature-display">
              <h4>📊 Extracted Features:</h4>
              <div className="feature-grid">
                <div className="feature-item">
                  <span className="feature-label">Left Iris X:</span>
                  <span className="feature-value">{eyeFeatures.normalized.leftIrisX.toFixed(2)}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-label">Left Iris Y:</span>
                  <span className="feature-value">{eyeFeatures.normalized.leftIrisY.toFixed(2)}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-label">Left Aperture:</span>
                  <span className="feature-value">{eyeFeatures.normalized.leftAperture.toFixed(2)}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-label">Right Iris X:</span>
                  <span className="feature-value">{eyeFeatures.normalized.rightIrisX.toFixed(2)}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-label">Right Iris Y:</span>
                  <span className="feature-value">{eyeFeatures.normalized.rightIrisY.toFixed(2)}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-label">Right Aperture:</span>
                  <span className="feature-value">{eyeFeatures.normalized.rightAperture.toFixed(2)}</span>
                </div>
              </div>
              <p className="feature-tip">
                <strong>💡 Try this:</strong> Move your eyes left/right/up/down and watch the values change!
              </p>
            </div>
            
            <p className="phase-info">
              ✅ <strong>Phase 1, Week 2 Complete!</strong><br/>
              Features extracted successfully. Ready for calibration!
            </p>
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Built with ❤️ by NovaVista | Free & Open Source | Phase 1: Core Detection</p>
        <p className="tech-stack">
          React • MediaPipe FaceMesh • TensorFlow.js
        </p>
      </footer>
    </div>
  );
}

export default App;

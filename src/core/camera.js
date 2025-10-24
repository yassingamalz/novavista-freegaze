/**
 * Camera Access Module for NovaVista FreeGaze
 * Handles webcam initialization and stream management
 */

/**
 * Initialize camera and setup video stream
 * @param {HTMLVideoElement} videoElement - The video element to stream to
 * @returns {Promise<MediaStream>} The camera stream
 */
export async function initCamera(videoElement) {
  try {
    // Request camera access with optimal settings for face detection
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user" // Front-facing camera
      }
    });
    
    // Attach stream to video element
    videoElement.srcObject = stream;
    
    // Wait for video metadata to load and start playback
    return new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play()
          .then(() => {
            console.log('✅ Camera initialized successfully');
            resolve(stream);
          })
          .catch(reject);
      };
      
      videoElement.onerror = () => {
        reject(new Error('Failed to load video'));
      };
    });
  } catch (error) {
    console.error("❌ Camera access denied or failed:", error);
    
    // Provide helpful error messages
    if (error.name === 'NotAllowedError') {
      throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No camera found. Please connect a webcam.');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Camera is already in use by another application.');
    }
    
    throw error;
  }
}

/**
 * Stop camera stream and release resources
 * @param {MediaStream} stream - The stream to stop
 */
export function stopCamera(stream) {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('🛑 Camera stream stopped');
    });
  }
}

/**
 * Check if camera is available
 * @returns {Promise<boolean>} True if camera is available
 */
export async function isCameraAvailable() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Failed to enumerate devices:', error);
    return false;
  }
}

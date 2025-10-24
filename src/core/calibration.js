/**
 * Calibration Module for NovaVista FreeGaze
 * Handles calibration data collection and storage
 */

import { averageFeatures } from './featureExtraction';

/**
 * Calibration data structure
 */
class CalibrationManager {
  constructor() {
    this.points = [];
    this.isCalibrating = false;
    this.currentPointIndex = 0;
    this.currentSamples = [];
  }

  /**
   * Start calibration process
   */
  startCalibration() {
    this.points = [];
    this.isCalibrating = true;
    this.currentPointIndex = 0;
    this.currentSamples = [];
    console.log('🎯 Calibration started');
  }

  /**
   * Add a feature sample for current calibration point
   * @param {Object} features - Eye features from extractEyeFeatures
   * @param {number} targetX - Target X position (screen coordinates)
   * @param {number} targetY - Target Y position (screen coordinates)
   */
  addSample(features, targetX, targetY) {
    if (!this.isCalibrating) return;

    this.currentSamples.push({
      features: features.vector,
      targetX,
      targetY,
      timestamp: Date.now()
    });
  }

  /**
   * Complete current calibration point
   * @returns {boolean} True if point was saved successfully
   */
  completeCurrentPoint() {
    if (this.currentSamples.length === 0) {
      console.warn('⚠️ No samples collected for this point');
      return false;
    }

    // Get the target position from first sample
    const { targetX, targetY } = this.currentSamples[0];

    // Extract just the features
    const featureSamples = this.currentSamples.map(s => ({
      vector: s.features,
      normalized: {} // We'll use vector directly
    }));

    // Average the features
    const avgFeatures = averageFeatures(featureSamples);

    if (!avgFeatures) {
      console.warn('⚠️ Failed to average features');
      return false;
    }

    // Store calibration point data
    this.points.push({
      targetX,
      targetY,
      features: avgFeatures.vector,
      sampleCount: avgFeatures.sampleCount
    });

    console.log(`✅ Point ${this.currentPointIndex + 1} complete: ${avgFeatures.sampleCount} samples`);

    // Reset for next point
    this.currentSamples = [];
    this.currentPointIndex++;

    return true;
  }

  /**
   * Finish calibration
   * @returns {Array} Calibration data points
   */
  finishCalibration() {
    this.isCalibrating = false;
    console.log(`🎉 Calibration complete! ${this.points.length} points collected`);
    return this.points;
  }

  /**
   * Get calibration data
   * @returns {Array} Calibration points
   */
  getCalibrationData() {
    return this.points;
  }

  /**
   * Save calibration to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        points: this.points,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem('novavista_freegaze_calibration', JSON.stringify(data));
      console.log('💾 Calibration saved to localStorage');
      return true;
    } catch (error) {
      console.error('❌ Failed to save calibration:', error);
      return false;
    }
  }

  /**
   * Load calibration from localStorage
   * @returns {boolean} True if loaded successfully
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('novavista_freegaze_calibration');
      if (!stored) {
        console.log('ℹ️ No saved calibration found');
        return false;
      }

      const data = JSON.parse(stored);
      this.points = data.points;
      console.log(`✅ Calibration loaded: ${this.points.length} points`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load calibration:', error);
      return false;
    }
  }

  /**
   * Clear calibration data
   */
  clear() {
    this.points = [];
    this.currentSamples = [];
    this.currentPointIndex = 0;
    localStorage.removeItem('novavista_freegaze_calibration');
    console.log('🗑️ Calibration cleared');
  }
}

// Export singleton instance
export const calibrationManager = new CalibrationManager();

export default CalibrationManager;

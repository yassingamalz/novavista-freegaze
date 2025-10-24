/**
 * Gaze Prediction Module for NovaVista FreeGaze
 * TensorFlow.js neural network for gaze coordinate prediction
 */

import * as tf from '@tensorflow/tfjs';

/**
 * GazePredictionModel class
 * Handles model creation, training, and prediction
 */
class GazePredictionModel {
  constructor() {
    this.model = null;
    this.isTrained = false;
    this.trainingHistory = null;
  }

  /**
   * Create neural network model
   * Architecture: 8 inputs -> 64 -> 32 -> 2 outputs (X, Y)
   */
  createModel() {
    const model = tf.sequential({
      layers: [
        // Input layer: 8 features (iris X/Y, aperture for both eyes, symmetry)
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: [8],
          kernelInitializer: 'heNormal'
        }),
        
        // Dropout for regularization
        tf.layers.dropout({ rate: 0.2 }),
        
        // Hidden layer
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        
        // Dropout
        tf.layers.dropout({ rate: 0.1 }),
        
        // Output layer: X and Y coordinates
        tf.layers.dense({
          units: 2,
          activation: 'linear'  // Linear for regression
        })
      ]
    });

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']  // Mean Absolute Error
    });

    this.model = model;
    console.log('🧠 Model created');
    model.summary();
    
    return model;
  }

  /**
   * Train model on calibration data
   * @param {Array} calibrationData - Array of {features, targetX, targetY}
   * @param {Object} options - Training options
   * @returns {Promise<Object>} Training history
   */
  async train(calibrationData, options = {}) {
    if (!this.model) {
      this.createModel();
    }

    if (calibrationData.length < 9) {
      throw new Error('Need at least 9 calibration points');
    }

    console.log(`📚 Training with ${calibrationData.length} data points...`);

    // Prepare training data
    const features = calibrationData.map(d => d.features);
    const targetsX = calibrationData.map(d => d.targetX);
    const targetsY = calibrationData.map(d => d.targetY);

    // Convert to tensors
    const xTensor = tf.tensor2d(features);
    const yTensor = tf.tensor2d(
      calibrationData.map(d => [d.targetX, d.targetY])
    );

    // Training options
    const {
      epochs = 100,
      batchSize = 16,
      validationSplit = 0.2,
      verbose = 1
    } = options;

    try {
      // Train the model
      const history = await this.model.fit(xTensor, yTensor, {
        epochs,
        batchSize,
        validationSplit,
        verbose,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(
                `Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, ` +
                `val_loss = ${logs.val_loss.toFixed(4)}`
              );
            }
          }
        }
      });

      this.isTrained = true;
      this.trainingHistory = history;
      
      console.log('✅ Model trained successfully!');
      console.log(`Final loss: ${history.history.loss[history.history.loss.length - 1].toFixed(4)}`);

      // Cleanup tensors
      xTensor.dispose();
      yTensor.dispose();

      return history;

    } catch (error) {
      console.error('❌ Training failed:', error);
      throw error;
    }
  }

  /**
   * Predict gaze coordinates from eye features
   * @param {Array} featureVector - 8-element feature array
   * @returns {Object} {x, y} screen coordinates
   */
  predict(featureVector) {
    if (!this.model || !this.isTrained) {
      console.warn('⚠️ Model not trained yet');
      return null;
    }

    try {
      // Convert to tensor
      const inputTensor = tf.tensor2d([featureVector]);
      
      // Predict
      const prediction = this.model.predict(inputTensor);
      
      // Get values
      const result = prediction.dataSync();
      
      // Cleanup
      inputTensor.dispose();
      prediction.dispose();

      return {
        x: result[0],
        y: result[1]
      };

    } catch (error) {
      console.error('❌ Prediction failed:', error);
      return null;
    }
  }

  /**
   * Save model to localStorage
   * @returns {Promise<boolean>} Success status
   */
  async saveModel() {
    if (!this.model) {
      console.warn('⚠️ No model to save');
      return false;
    }

    try {
      await this.model.save('localstorage://novavista-freegaze-model');
      console.log('💾 Model saved to localStorage');
      return true;
    } catch (error) {
      console.error('❌ Failed to save model:', error);
      return false;
    }
  }

  /**
   * Load model from localStorage
   * @returns {Promise<boolean>} Success status
   */
  async loadModel() {
    try {
      this.model = await tf.loadLayersModel('localstorage://novavista-freegaze-model');
      this.isTrained = true;
      console.log('✅ Model loaded from localStorage');
      return true;
    } catch (error) {
      console.warn('ℹ️ No saved model found');
      return false;
    }
  }

  /**
   * Check if model is ready for prediction
   * @returns {boolean} True if model is trained
   */
  isReady() {
    return this.model !== null && this.isTrained;
  }

  /**
   * Dispose model and free memory
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isTrained = false;
      console.log('🗑️ Model disposed');
    }
  }

  /**
   * Get model summary
   * @returns {Object} Model information
   */
  getInfo() {
    return {
      created: this.model !== null,
      trained: this.isTrained,
      trainingLoss: this.trainingHistory
        ? this.trainingHistory.history.loss[this.trainingHistory.history.loss.length - 1]
        : null
    };
  }
}

// Export singleton instance
export const gazePredictionModel = new GazePredictionModel();

export default GazePredictionModel;

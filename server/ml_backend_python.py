#!/usr/bin/env python3
"""
Real-time Heart Condition ML Prediction Service
Uses trained Random Forest model for actual heart condition predictions
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import websocket
import threading
import time
from datetime import datetime
import logging
from websocket_server import WebsocketServer
import glob
import random
import csv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MLResultsLogger:
    """Logs ML prediction results to CSV file for doctor access"""
    
    def __init__(self, log_dir="ml_results"):
        self.log_dir = log_dir
        self.log_file = None
        self.setup_logging()
    
    def setup_logging(self):
        """Setup the ML results logging directory and file"""
        try:
            # Create logs directory if it doesn't exist
            if not os.path.exists(self.log_dir):
                os.makedirs(self.log_dir)
            
            # Create log file with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.log_file = os.path.join(self.log_dir, f"ml_results_{timestamp}.csv")
            
            # Create CSV with headers
            with open(self.log_file, 'w', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                writer.writerow([
                    'timestamp', 'patient_id', 'heart_rate', 'prediction_class', 
                    'condition', 'confidence', 'is_abnormal', 'alert_type',
                    'source_file', 'data_source'
                ])
            
            logger.info(f"[OK] ML results logging initialized: {self.log_file}")
            
        except Exception as e:
            logger.error(f"[ERROR] Error setting up ML results logging: {e}")
            self.log_file = None
    
    def log_prediction(self, timestamp, patient_id, heart_rate, prediction, 
                      condition, confidence, is_abnormal, alert_type, 
                      source_file=None, data_source='real_time'):
        """Log a ML prediction result"""
        if not self.log_file:
            return
        
        try:
            with open(self.log_file, 'a', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                writer.writerow([
                    timestamp, patient_id, heart_rate, prediction,
                    condition, confidence, is_abnormal, alert_type,
                    source_file or 'N/A', data_source
                ])
        except Exception as e:
            logger.error(f"[ERROR] Error logging ML result: {e}")

class CSVDataStreamer:
    """Streams heart rate data from CSV files"""
    
    def __init__(self, data_dir="heart_rate_data"):
        self.data_dir = data_dir
        self.current_file = None
        self.current_data = None
        self.current_index = 0
        self.csv_files = []
        self.load_csv_files()
    
    def load_csv_files(self):
        """Load all available CSV files"""
        csv_pattern = os.path.join(self.data_dir, "*.csv")
        self.csv_files = glob.glob(csv_pattern)
        logger.info(f"Found {len(self.csv_files)} CSV files: {[os.path.basename(f) for f in self.csv_files]}")
        
        if self.csv_files:
            self.select_random_file()
    
    def select_random_file(self):
        """Select a random CSV file to stream from"""
        if self.csv_files:
            self.current_file = random.choice(self.csv_files)
            logger.info(f"Selected CSV file: {os.path.basename(self.current_file)}")
            self.load_current_file()
    
    def load_current_file(self):
        """Load the current CSV file"""
        try:
            self.current_data = pd.read_csv(self.current_file)
            self.current_index = 0
            logger.info(f"Loaded {len(self.current_data)} rows from {os.path.basename(self.current_file)}")
        except Exception as e:
            logger.error(f"Error loading CSV file {self.current_file}: {e}")
            self.current_data = None
    
    def get_next_row(self):
        """Get the next row from the current CSV file"""
        if self.current_data is None or len(self.current_data) == 0:
            return None
        
        if self.current_index >= len(self.current_data):
            # Reached end of file, select a new random file
            logger.info(f"Reached end of {os.path.basename(self.current_file)}, selecting new file...")
            self.select_random_file()
            return self.get_next_row()
        
        row = self.current_data.iloc[self.current_index]
        self.current_index += 1
        
        return {
            'timestamp': row.get('timestamp', datetime.now().isoformat()),
            'heart_rate': float(row.get('heart_rate', 75)),
            'patient_id': row.get('patient_id', 'P001')
        }

class HeartConditionPredictor:
    """ML Model predictor for heart condition analysis"""
    
    def __init__(self, model_dir=None):
        """Initialize the predictor with trained model files"""
        # Determine model directory relative to this script
        if model_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_dir = os.path.join(base_dir, "../Capstone")
            
        self.model_dir = model_dir
        self.model = None
        self.scaler = None
        self.feature_columns = None
        self.is_loaded = False
        
        logger.info(f"Initializing HeartConditionPredictor with model_dir: {os.path.abspath(model_dir)}")
        self.load_model()
    
    def load_model(self):
        """Load the trained model, scaler, and feature columns"""
        try:
            # Load the trained Random Forest model
            model_path = os.path.join(self.model_dir, 'heart_condition_model.pkl')
            self.model = joblib.load(model_path)
            logger.info("[OK] Model loaded successfully")
            
            # Load the scaler
            scaler_path = os.path.join(self.model_dir, 'scaler.pkl')
            self.scaler = joblib.load(scaler_path)
            logger.info("[OK] Scaler loaded successfully")
            
            # Load feature columns
            features_path = os.path.join(self.model_dir, 'feature_columns.pkl')
            self.feature_columns = joblib.load(features_path)
            logger.info("[OK] Feature columns loaded successfully")
            logger.info(f"Feature columns: {self.feature_columns}")
            
            self.is_loaded = True
            logger.info("[READY] Heart Condition ML Model Ready!")
            
        except Exception as e:
            logger.error(f"[ERROR] Error loading model: {e}")
            self.is_loaded = False
            # Don't raise here to allow server to start even if model fails
            # raise 
    
    def predict_from_heart_rate(self, heart_rate, age=45, gender=1):
        """
        Make prediction from heart rate and basic patient info
        
        Args:
            heart_rate (float): Current heart rate
            age (int): Patient age (default 45)
            gender (int): Patient gender (1 for male, 0 for female, default 1)
        
        Returns:
            tuple: (prediction, confidence, condition_name)
        """
        if not self.is_loaded:
            return 0, 0.0, "Model Not Loaded"
        
        try:
            # Create feature vector based on the expected features
            # We'll use heart rate and create reasonable defaults for other features
            features = {
                'Age': age,
                'Gender': gender,
                'Heart_Rate': heart_rate,
                'Systolic_BP': 120,  # Default normal systolic BP
                'Diastolic_BP': 80,  # Default normal diastolic BP
                'Blood_Sugar': 100,  # Default normal blood sugar
                'CK_MB': 2.0,        # Default normal CK-MB level
                'Troponin': 0.01     # Default normal troponin level
            }
            
            # Convert to DataFrame to match training data format
            feature_df = pd.DataFrame([features])
            
            # Ensure we have all required features (add missing ones with defaults)
            for col in self.feature_columns:
                if col not in feature_df.columns:
                    if 'BP' in col or 'Blood' in col:
                        feature_df[col] = 100  # Default for blood-related features
                    elif 'CK' in col or 'Troponin' in col:
                        feature_df[col] = 1.0  # Default for cardiac markers
                    else:
                        feature_df[col] = 0  # Default for other features
            
            # Reorder columns to match training data
            feature_df = feature_df[self.feature_columns]
            
            # Scale the features
            features_scaled = self.scaler.transform(feature_df)
            
            # Make prediction
            prediction = self.model.predict(features_scaled)[0]
            prediction_proba = self.model.predict_proba(features_scaled)[0]
            
            # Get confidence (max probability)
            confidence = float(np.max(prediction_proba))
            
            # Map prediction to condition name
            condition_names = {
                0: "Normal",
                1: "Abnormal - Arrhythmia", 
                2: "Abnormal - Tachycardia",
                3: "Abnormal - Bradycardia",
                4: "Critical - Heart Attack Risk"
            }
            
            condition_name = condition_names.get(prediction, "Unknown")
            
            return prediction, confidence, condition_name
        except Exception as e:
            logger.error(f"[ERROR] Prediction error: {e}")
            return 0, 0.5, "Error"

class MLWebSocketServer:
    """WebSocket server for real-time ML predictions"""
    
    def __init__(self, port=9001):
        self.port = port
        self.predictor = HeartConditionPredictor()
        self.csv_streamer = CSVDataStreamer()
        self.results_logger = MLResultsLogger()
        self.server = None
        self.clients = []
        self.streaming_active = False
        self.streaming_thread = None
        
    def start_csv_streaming(self):
        """Start streaming data from CSV files every 5 seconds"""
        if self.streaming_active or not self.csv_streamer.csv_files:
            return
        
        self.streaming_active = True
        logger.info("[STREAM] Starting CSV data streaming (5-second intervals)")
        
        def stream_worker():
            while self.streaming_active:
                try:
                    # Get next row from CSV
                    csv_row = self.csv_streamer.get_next_row()
                    if csv_row:
                        heart_rate = csv_row['heart_rate']
                        patient_id = csv_row['patient_id']
                        
                        # Make ML prediction
                        prediction, confidence, condition_name = self.predictor.predict_from_heart_rate(
                            heart_rate, age=45, gender=1
                        )
                        
                        # Determine if heart rate is abnormal
                        is_abnormal = heart_rate < 60 or heart_rate > 100
                        alert_type = None
                        
                        if heart_rate < 60:
                            alert_type = 'bradycardia'
                        elif heart_rate > 100:
                            alert_type = 'tachycardia'
                        
                        response = {
                            "type": "prediction",
                            "patient_id": patient_id,
                            "heart_rate": heart_rate,
                            "prediction": prediction,
                            "confidence": confidence,
                            "condition": condition_name,
                            "is_abnormal": is_abnormal,
                            "alert_type": alert_type,
                            "timestamp": csv_row['timestamp'],
                            "data_source": "csv_file",
                            "current_file": os.path.basename(self.csv_streamer.current_file) if self.csv_streamer.current_file else "unknown"
                        }
                        
                        # Log ML prediction result to CSV
                        self.results_logger.log_prediction(
                            timestamp=csv_row['timestamp'],
                            patient_id=patient_id,
                            heart_rate=heart_rate,
                            prediction=prediction,
                            condition=condition_name,
                            confidence=confidence,
                            is_abnormal=is_abnormal,
                            alert_type=alert_type,
                            source_file=response["current_file"],
                            data_source="csv_file"
                        )
                        
                        # Send to all connected clients
                        for client in self.clients:
                            try:
                                self.server.send_message(client, json.dumps(response))
                            except Exception as e:
                                logger.error(f"Error sending message to client: {e}")
                        
                        logger.info(f"[DATA] CSV Data: {patient_id} HR {heart_rate} -> {condition_name} ({confidence:.1%})")
                        if is_abnormal:
                            logger.info(f"[ALERT] Alert: {alert_type.upper()} - {heart_rate} bpm")
                    
                    # Wait 5 seconds before next row
                    time.sleep(5)
                    
                except Exception as e:
                    logger.error(f"Error in CSV streaming: {e}")
                    time.sleep(5)  # Wait before retrying
        
        self.streaming_thread = threading.Thread(target=stream_worker, daemon=True)
        self.streaming_thread.start()
    
    def stop_csv_streaming(self):
        """Stop CSV data streaming"""
        self.streaming_active = False
        logger.info("[STOP] Stopped CSV data streaming")

    def new_client(self, client, server):
        """Handle new client connection"""
        logger.info(f"New client connected: {client['id']}")
        self.clients.append(client)
        
        # Send model status to new client
        status_msg = {
            "type": "model_status",
            "model_loaded": self.predictor.is_loaded,
            "csv_files_available": len(self.csv_streamer.csv_files),
            "streaming_active": self.streaming_active,
            "timestamp": datetime.now().isoformat()
        }
        server.send_message(client, json.dumps(status_msg))
        
        # Auto-start CSV streaming when first client connects
        if len(self.clients) == 1 and not self.streaming_active:
            self.start_csv_streaming()
    
    def client_left(self, client, server):
        """Handle client disconnection"""
        logger.info(f"Client disconnected: {client['id']}")
        if client in self.clients:
            self.clients.remove(client)
    
    def message_received(self, client, server, message):
        """Handle incoming messages from clients"""
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            
            if msg_type == 'heart_rate_data':
                # Process heart rate data and make prediction
                heart_rate = data.get('heart_rate')
                patient_id = data.get('patient_id', 'unknown')
                age = data.get('age', 45)
                gender = data.get('gender', 1)
                
                if heart_rate is not None:
                    try:
                        prediction, confidence, condition_name = self.predictor.predict_from_heart_rate(
                            heart_rate, age, gender
                        )
                        
                        # Determine if heart rate is abnormal
                        is_abnormal = heart_rate < 60 or heart_rate > 100
                        alert_type = None
                        
                        if heart_rate < 60:
                            alert_type = 'bradycardia'
                        elif heart_rate > 100:
                            alert_type = 'tachycardia'
                        
                        response = {
                            "type": "prediction",
                            "patient_id": patient_id,
                            "heart_rate": heart_rate,
                            "prediction": prediction,
                            "confidence": confidence,
                            "condition": condition_name,
                            "is_abnormal": is_abnormal,
                            "alert_type": alert_type,
                            "timestamp": datetime.now().isoformat()
                        }
                        
                        # Log ML prediction result to CSV
                        self.results_logger.log_prediction(
                            timestamp=response["timestamp"],
                            patient_id=patient_id,
                            heart_rate=heart_rate,
                            prediction=prediction,
                            condition=condition_name,
                            confidence=confidence,
                            is_abnormal=is_abnormal,
                            alert_type=alert_type,
                            source_file=None,
                            data_source="real_time"
                        )
                        
                        # Send response back to all clients
                        for client_conn in self.clients:
                            server.send_message(client_conn, json.dumps(response))
                            
                    except Exception as e:
                        error_response = {
                            "type": "error",
                            "message": f"Prediction failed: {str(e)}",
                            "timestamp": datetime.now().isoformat()
                        }
                        server.send_message(client, json.dumps(error_response))
            
            elif msg_type == 'start_csv_streaming':
                # Start CSV data streaming
                self.start_csv_streaming()
                response = {
                    "type": "csv_streaming_started",
                    "message": "CSV data streaming started",
                    "timestamp": datetime.now().isoformat()
                }
                server.send_message(client, json.dumps(response))
            
            elif msg_type == 'stop_csv_streaming':
                # Stop CSV data streaming
                self.stop_csv_streaming()
                response = {
                    "type": "csv_streaming_stopped",
                    "message": "CSV data streaming stopped",
                    "timestamp": datetime.now().isoformat()
                }
                server.send_message(client, json.dumps(response))
            
            elif msg_type == 'ping':
                # Health check
                pong_response = {
                    "type": "pong",
                    "timestamp": datetime.now().isoformat(),
                    "model_loaded": self.predictor.is_loaded
                }
                server.send_message(client, json.dumps(pong_response))
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            error_response = {
                "type": "error",
                "message": f"Message processing failed: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            server.send_message(client, json.dumps(error_response))
    
    def start(self):
        """Start the WebSocket server"""
        logger.info(f"[SERVER] Starting ML WebSocket Server on port {self.port}")
        logger.info(f"Model status: {'[OK] Loaded' if self.predictor.is_loaded else '[ERROR] Not loaded'}")
        
        self.server = WebsocketServer(host='127.0.0.1', port=self.port)
        self.server.set_fn_new_client(self.new_client)
        self.server.set_fn_client_left(self.client_left)
        self.server.set_fn_message_received(self.message_received)
        
        try:
            self.server.run_forever()
        except KeyboardInterrupt:
            logger.info("Server shutting down...")
        except Exception as e:
            logger.error(f"Server error: {e}")

if __name__ == "__main__":
    try:
        print("[HEART] Starting Heart Condition ML Backend...")
        print("=" * 50)
        
        # Create and start the ML WebSocket server
        ml_server = MLWebSocketServer(port=9001)
        print(f"[OK] ML server created successfully")
        print(f"[START] Starting WebSocket server on port 9001...")
        
        ml_server.start()
        
    except KeyboardInterrupt:
        print("\n[STOP] Server stopped by user")
    except Exception as e:
        print(f"[ERROR] Critical error: {e}")
        import traceback
        traceback.print_exc()
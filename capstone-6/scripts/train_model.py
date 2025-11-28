# scripts/train_model.py
# Fixed version: balanced but not over-sensitive

import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

# === Paths ===
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "threat_training_data.csv"
MODEL_PATH = BASE_DIR / "models" / "random_forest_model.pkl"
THRESHOLD_PATH = BASE_DIR / "models" / "thresholds.json"
os.makedirs(BASE_DIR / "models", exist_ok=True)

# === Load dataset ===
df = pd.read_csv(DATA_PATH)

FEATURE_COLUMNS = [
    "network_packet_rate",
    "sampling_latency",
    "packet_loss_rate",
    "smart_contract_violation"
]

X = df[FEATURE_COLUMNS]
y = df["threat_label"]

# === Split dataset ===
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# === Manual class weights (less aggressive) ===
cw_dict = {0: 1, 1: 20}
print(f"⚖️ Using manual class weights: {cw_dict}")

# === Train Random Forest ===
rf = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    class_weight=cw_dict,
    max_depth=10,
    min_samples_split=10,
)
rf.fit(X_train, y_train)

# === Evaluate ===
y_prob = rf.predict_proba(X_test)[:, 1]
y_pred = (y_prob > 0.95).astype(int)  # 95% confidence threshold

print("\n📊 Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("\n📋 Classification Report:\n", classification_report(y_test, y_pred, digits=4))

# === Save model ===
joblib.dump(rf, MODEL_PATH)
print(f"✅ Model saved → {MODEL_PATH}")

# === Compute and save adaptive thresholds ===
thresholds = {}
for col in FEATURE_COLUMNS:
    thresholds[col] = {
        "mean": float(df[col].mean()),
        "std": float(df[col].std()),
        "p05": float(df[col].quantile(0.05)),
        "p95": float(df[col].quantile(0.95)),
    }

with open(THRESHOLD_PATH, "w") as f:
    json.dump(thresholds, f, indent=2)
print(f"✅ Feature thresholds saved → {THRESHOLD_PATH}")

# === Show threat distribution ===
print("\n📈 Threat distribution in dataset:")
print(df["threat_label"].value_counts(normalize=True) * 100)

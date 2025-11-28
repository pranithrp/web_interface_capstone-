# realtime_threat_detection.py
# Real-time threat detector (network + blockchain integration)

import os, time, json, threading, random
from pathlib import Path
import pandas as pd
import joblib
from web3 import Web3
from rich.console import Console
from rich.table import Table

# Optional HTTP client for sending alerts to the web server
try:
    import requests
except Exception:
    requests = None

# === Paths ===
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "random_forest_model.pkl"
THRESHOLD_PATH = BASE_DIR / "models" / "thresholds.json"
LOG_FILE = BASE_DIR / "logs" / "realtime_threat_log.csv"
os.makedirs(BASE_DIR / "logs", exist_ok=True)

console = Console()

# === Load Model + Thresholds ===
rf_model = joblib.load(MODEL_PATH)
with open(THRESHOLD_PATH) as f:
    thresholds = json.load(f)

FEATURE_COLUMNS = [
    "network_packet_rate",
    "sampling_latency",
    "packet_loss_rate",
    "smart_contract_violation"
]

# === Blockchain Listener ===
smart_contract_flag = {"violation": 0}

def listen_for_events():
    config_path = BASE_DIR / "scripts" / "config.json"
    if not config_path.exists():
        console.print("[yellow]⚠️ config.json not found — blockchain listener disabled[/yellow]")
        return

    config = json.loads(config_path.read_text())
    w3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
    if not w3.is_connected():
        console.print("[yellow]⚠️ Blockchain not connected[/yellow]")
        return

    contract = w3.eth.contract(
        address=Web3.to_checksum_address(config["contract_address"]),
        abi=config["abi"]
    )

    filters = {
        "DataTampered": contract.events.DataTampered.create_filter(fromBlock="latest"),
        "UnauthorizedAccess": contract.events.UnauthorizedAccess.create_filter(fromBlock="latest")
    }

    console.print("✅ Blockchain connected — listening for security events...")

    while True:
        for name, flt in filters.items():
            for e in flt.get_new_entries():
                console.print(f"[yellow]⚡ {name} detected: {e['args']}[/yellow]")
                smart_contract_flag["violation"] = 1
        time.sleep(1)

# === Adaptive threshold check ===
def check_threshold(feature, value):
    upper = thresholds[feature]["p95"]
    lower = thresholds[feature]["p05"]
    if feature == "packet_loss_rate" and value > upper:
        return True
    if feature == "sampling_latency" and value > upper:
        return True
    if feature == "network_packet_rate" and (value < lower or value > upper):
        return True
    return False

# === Generate or Fetch Sample (Simulated for now) ===
def generate_sample():
    return {
        "network_packet_rate": round(random.uniform(50, 800), 2),
        "sampling_latency": round(random.uniform(0, 400), 2),
        "packet_loss_rate": round(random.uniform(0, 0.25), 3),
        "smart_contract_violation": smart_contract_flag["violation"]
    }

# === Real-time Loop ===
def run_detection(iterations=100, delay=1.0):
    history = []
    threading.Thread(target=listen_for_events, daemon=True).start()

    for i in range(iterations):
        # Generate sample and check thresholds
        sample = generate_sample()
        triggered = [f for f in FEATURE_COLUMNS if check_threshold(f, sample[f])]
        
        # Create prediction DataFrame with just the features used in training
        pred_features = {k: sample[k] for k in FEATURE_COLUMNS}
        pred_df = pd.DataFrame([pred_features])
        
        # Make prediction
        proba = rf_model.predict_proba(pred_df)[0][1]
        pred = int(proba > 0.90)
        
        # Add trigger count for display/logging
        sample["rule_trigger_count"] = len(triggered)

        # Log to file
        log_row = {
            "timestamp": pd.Timestamp.now(),
            **sample,
            "prediction": pred,
            "trigger_reason": ", ".join(triggered)
        }
        pd.DataFrame([log_row]).to_csv(LOG_FILE, mode="a", header=not LOG_FILE.exists(), index=False)

        # Display table
        history.append([i + 1, pred, ", ".join(triggered)] + [sample[f] for f in FEATURE_COLUMNS])
        if len(history) > 10:
            history.pop(0)

        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("No.", width=4)
        table.add_column("Prediction", width=10)
        table.add_column("Triggers", width=25)
        for col in FEATURE_COLUMNS:
            table.add_column(col, justify="right", width=16)

        for row in history:
            style = "red" if row[1] == 1 else "green"
            table.add_row(str(row[0]), f"[{style}]{'Threat' if row[1]==1 else 'Safe'}[/{style}]",
                         row[2], *[str(x) for x in row[3:]])

        console.clear()
        console.print(f"🔍 Real-Time Threat Detection (Iteration {i+1}/{iterations})")
        console.print(table)

        # If prediction is a threat (1) -> send notification to web server so browser clients receive it
        if pred == 1:
            # Build payload expected by server /api/threats route
            payload = {
                "type": "threat",
                "prediction": int(pred),
                "sample": sample,
                "reason": ", ".join(triggered),
                "timestamp": pd.Timestamp.now().isoformat(),
                "severity": "high"
            }

            # endpoint can be overridden by environment variable ALERT_ENDPOINT
            ALERT_ENDPOINT = os.environ.get("ALERT_ENDPOINT", "http://localhost:5000/api/threats")

            if requests:
                try:
                    resp = requests.post(ALERT_ENDPOINT, json=payload, timeout=3)
                    if resp.status_code == 200:
                        console.print(f"[blue]📣 Sent threat notification to server ({ALERT_ENDPOINT})[/blue]")
                    else:
                        console.print(f"[yellow]⚠️ Server responded {resp.status_code} when sending threat notification[/yellow]")
                except Exception as e:
                    console.print(f"[red]❌ Failed to send threat notification: {e}[/red]")
            else:
                # fallback: use urllib if requests not available
                try:
                    from urllib import request as _request, parse as _parse
                    data = json.dumps(payload).encode('utf-8')
                    req = _request.Request(ALERT_ENDPOINT, data=data, headers={"Content-Type": "application/json"})
                    with _request.urlopen(req, timeout=3) as r:
                        if r.status == 200:
                            console.print(f"[blue]📣 Sent threat notification to server ({ALERT_ENDPOINT})[/blue]")
                        else:
                            console.print(f"[yellow]⚠️ Server responded {r.status} when sending threat notification[/yellow]")
                except Exception as e:
                    console.print(f"[red]❌ Failed to send threat notification (urllib fallback): {e}[/red]")

        # reset violation flag
        smart_contract_flag["violation"] = 0
        time.sleep(delay)

if __name__ == "__main__":
    console.print("[green]🚀 Starting Real-Time Threat Detection[/green]")
    run_detection(iterations=500, delay=1.0)
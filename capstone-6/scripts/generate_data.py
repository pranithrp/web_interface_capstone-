# scripts/generate_data.py
# Synthetic dataset generator for blockchain + network-level threat detection (IoT medical scenario)
# Produces 99% Safe, 1% Threat samples

import os, random, pandas as pd
from pathlib import Path

# === Paths ===
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_PATH = DATA_DIR / "threat_training_data.csv"
os.makedirs(DATA_DIR, exist_ok=True)

# === Feature columns ===
FEATURE_COLUMNS = [
    "network_packet_rate",
    "sampling_latency",
    "packet_loss_rate",
    "smart_contract_violation"
]

# === Parameter ranges (realistic for RPM sensors) ===
PARAMS = {
    "network_packet_rate_normal": (150, 350),   # packets/sec
    "network_packet_rate_threat": (400, 800),   # DDoS / flooding

    "sampling_latency_normal": (20, 120),       # ms
    "sampling_latency_threat": (200, 450),      # network congestion

    "packet_loss_normal": (0.0, 0.02),
    "packet_loss_threat": (0.05, 0.25),

    "smart_contract_violation_normal": [0],
    "smart_contract_violation_threat": [1],
}


def generate_sample(is_threat=False):
    """Generate one Safe or Threat sample."""
    if is_threat:
        # pick random type of attack (not always all features abnormal)
        feature_choice = random.choice([
            "all", "ddos", "latency_attack", "loss_attack", "blockchain_attack"
        ])

        pkt = round(random.uniform(*PARAMS["network_packet_rate_threat"]), 2) if feature_choice in ["all", "ddos"] else round(random.uniform(*PARAMS["network_packet_rate_normal"]), 2)
        lat = round(random.uniform(*PARAMS["sampling_latency_threat"]), 2) if feature_choice in ["all", "latency_attack"] else round(random.uniform(*PARAMS["sampling_latency_normal"]), 2)
        loss = round(random.uniform(*PARAMS["packet_loss_threat"]), 3) if feature_choice in ["all", "loss_attack"] else round(random.uniform(*PARAMS["packet_loss_normal"]), 3)
        sc = 1 if feature_choice in ["all", "blockchain_attack"] else 0

        return {
            "network_packet_rate": pkt,
            "sampling_latency": lat,
            "packet_loss_rate": loss,
            "smart_contract_violation": sc,
            "threat_label": 1
        }

    else:
        return {
            "network_packet_rate": round(random.uniform(*PARAMS["network_packet_rate_normal"]), 2),
            "sampling_latency": round(random.uniform(*PARAMS["sampling_latency_normal"]), 2),
            "packet_loss_rate": round(random.uniform(*PARAMS["packet_loss_normal"]), 3),
            "smart_contract_violation": 0,
            "threat_label": 0
        }


def generate_training_data(num_samples=10000, threat_ratio=0.01):
    """
    Generate dataset with specified size and threat ratio (default 1% threats).
    """
    n_threat = max(1, int(num_samples * threat_ratio))
    n_safe = num_samples - n_threat

    records = [generate_sample(True) for _ in range(n_threat)] + \
               [generate_sample(False) for _ in range(n_safe)]
    random.shuffle(records)

    df = pd.DataFrame(records)
    df.to_csv(DATA_PATH, index=False)

    print(f"✅ Synthetic dataset saved at {DATA_PATH}")
    print(df['threat_label'].value_counts(normalize=True).map(lambda x: f'{x*100:.2f}%'))
    return df


if __name__ == "__main__":
    # Example: 10 000 samples, only 1 % threats
    generate_training_data(num_samples=10000, threat_ratio=0.01)

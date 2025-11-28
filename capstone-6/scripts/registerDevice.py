import json
from web3 import Web3

# === Load config.json ===
with open("scripts/config.json") as f:
    config = json.load(f)

GANACHE_URL = config["rpc_url"]
CONTRACT_ADDRESS = Web3.to_checksum_address(config["contract_address"])
ABI = config["abi"]

# === Web3 Setup ===
w3 = Web3(Web3.HTTPProvider(GANACHE_URL))
assert w3.is_connected(), "❌ Could not connect to Ganache"

# Use the first account (owner) to register devices
account = w3.eth.accounts[0]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)

# === Register test devices ===
def register_device(device_addr, device_id):
    tx_hash = contract.functions.registerDevice(device_addr, device_id).transact(
        {"from": account}
    )
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"✅ Registered device {device_id} at {device_addr}")
    return receipt

if __name__ == "__main__":
    # Example: register 2 devices
    register_device(w3.eth.accounts[1], "Device-001")
    register_device(w3.eth.accounts[2], "Device-002")
    print("🎉 Devices registered successfully")

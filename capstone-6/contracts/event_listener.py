import json
from web3 import Web3

# Load config
with open("scripts/config.json") as f:
    config = json.load(f)

# Connect to Ganache
w3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
assert w3.is_connected(), f"❌ Could not connect to Ganache at {config['rpc_url']}"

# Load contract
contract_address = Web3.to_checksum_address(config["contract_address"])
abi = config["contract_abi"]
contract = w3.eth.contract(address=contract_address, abi=abi)

print("✅ Listening to events from:", contract_address)

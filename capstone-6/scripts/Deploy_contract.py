import json
import os
from web3 import Web3
from solcx import compile_source, install_solc

# ✅ Install and set Solidity version
install_solc("0.8.20")

# ✅ Paths
CONTRACT_PATH = "contracts/DeviceAuth.sol"   # keep your file name
CONFIG_PATH = "scripts/config.json"

# ✅ Connect to Ganache
GANACHE_URL = "http://127.0.0.1:7545"
w3 = Web3(Web3.HTTPProvider(GANACHE_URL))
print("Connected:", w3.is_connected())
assert w3.is_connected(), "❌ Could not connect to Ganache"

# ✅ Compile Solidity
with open(CONTRACT_PATH, "r") as f:
    source_code = f.read()

compiled_sol = compile_source(
    source_code,
    output_values=["abi", "bin"],
    solc_version="0.8.20",
)
contract_id, contract_interface = compiled_sol.popitem()
abi = contract_interface["abi"]
bytecode = contract_interface["bin"]

# ✅ Deploy contract
account = w3.eth.accounts[0]
w3.eth.default_account = account
DeviceAuth = w3.eth.contract(abi=abi, bytecode=bytecode)

tx_hash = DeviceAuth.constructor().transact()
tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

print("Contract deployed at address:", tx_receipt.contractAddress)

# ✅ Save ABI + address into config.json
config = {
    "address": tx_receipt.contractAddress,
    "abi": abi
}

with open(CONFIG_PATH, "w") as f:
    json.dump(config, f, indent=4)

print(f"✅ Contract details saved to {CONFIG_PATH}")

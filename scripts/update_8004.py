import os
import json
import urllib.request
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

w3 = Web3(Web3.HTTPProvider('https://mainnet.base.org'))
pk = os.getenv("PRIVATE_KEY")
if not pk:
    print("No Private Key found.")
    exit(1)

account = w3.eth.account.from_key(pk)
print(f"Loaded Wallet: {account.address}")

req = urllib.request.urlopen("https://api.basescan.org/api?module=contract&action=getabi&address=0x8004a169fb4a3325136eb29fa0ceb6d2e539a432")
data = json.loads(req.read())
if data.get('status') == '1':
    abi = json.loads(data['result'])
    # Find setMetadata or similar methods
    methods = [m for m in abi if m.get('type') == 'function' and 'set' in m.get('name', '').lower()]
    print("Found SET methods:")
    for m in methods:
        print(f" - {m['name']}({', '.join([i['type'] + ' ' + i['name'] for i in m['inputs']])})")
else:
    print("Failed to fetch ABI:", data)

import os
import sys
import json
import logging
import requests  # type: ignore[import-untyped]
from dotenv import load_dotenv  # type: ignore[import-untyped]

# Optional: Add Web3 for actual signing when the user provides the Private Key
try:
    from web3 import Web3  # type: ignore[import-untyped]
except ImportError:
    Web3 = None

# Configure logging to write to a specific file or stderr so stdout is strictly JSON
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s', stream=sys.stderr)

load_dotenv()

LIFI_API_KEY = os.getenv("LIFI_API_KEY")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

def parse_int(val, default=0):
    if val is None or val == "": return default
    if isinstance(val, int): return val
    if isinstance(val, str):
        if val.startswith("0x"): return int(val, 16)
        try: return int(val)
        except ValueError: return default
    return default

# Derive wallet address from private key automatically
WALLET_ADDRESS = None
if PRIVATE_KEY and Web3:
    try:
        _w3 = Web3()
        WALLET_ADDRESS = _w3.eth.account.from_key(PRIVATE_KEY).address
        logging.info(f"Derived wallet address: {WALLET_ADDRESS}")
    except Exception as e:
        logging.warning(f"Could not derive wallet address from private key: {e}")

def main():
    if len(sys.argv) < 6:
        print(json.dumps({"error": "Missing required arguments: fromToken, toToken, amount, fromChain, toChain"}))
        sys.exit(1)

    from_token = sys.argv[1]
    to_token = sys.argv[2]
    amount_str = sys.argv[3]
    from_chain = sys.argv[4]
    to_chain = sys.argv[5]

    if not LIFI_API_KEY:
        print(json.dumps({"error": "LIFI_API_KEY not found in environment."}))
        sys.exit(1)

    # Determine token decimals
    # Native ETH/BNB/MATIC (zero address or symbol 'ETH') = 18 decimals
    # USDC/USDT = 6 decimals, WETH = 18 decimals
    _token_lower = from_token.lower()
    if _token_lower in ("eth", "bnb", "matic", "avax", "sol", "0x0000000000000000000000000000000000000000"):
        _decimals = 18
    elif _token_lower in ("usdc", "usdt", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                          "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
                          "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                          "0xdac17f958d2ee523a2206206994597c13d831ec7",
                          "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"):
        _decimals = 6
    else:
        _decimals = 18  # default to 18 for WETH and unknown tokens

    url = "https://li.quest/v1/quote"
    params = {
        "fromChain": from_chain,
        "toChain": to_chain,
        "fromToken": from_token,
        "toToken": to_token,
        "fromAmount": str(int(float(amount_str) * (10 ** _decimals))),
        "fromAddress": WALLET_ADDRESS or "0x0000000000000000000000000000000000000000"
    }

    headers = {
        "accept": "application/json",
        "x-lifi-api-key": LIFI_API_KEY
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            print(json.dumps({"error": f"LI.FI API failed: {response.text}"}))
            sys.exit(1)

        data = response.json()
        quote = data.get("estimate", {})
        tx_data = data.get("transactionRequest", {})

        output_amount_base = parse_int(quote.get("toAmountMin", 0))
        output_display = quote.get("toAmountMin", "0") # You would divide this by the target token's decimals

        # DRY RUN - we are not executing on chain yet
        if not Web3 or not PRIVATE_KEY:
            # Simulated Success Response
            result = {
                "txHash": "0xSIMULATED_TXH_DRY_RUN",
                "outputAmountBase": output_amount_base,
                "outputAmountDisplay": f"~{output_amount_base}",
                "simulated": True,
                "note": "Private Key or Web3 not found. This was a dry run simulation."
            }
            print(json.dumps(result))
            sys.exit(0)

        # Actual Execution Logic
        rpc_url = os.getenv("RPC_URL", "https://mainnet.base.org") # Default to Base network RPC
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            print(json.dumps({"error": "Failed to connect to RPC node."}))
            sys.exit(1)

        account = w3.eth.account.from_key(PRIVATE_KEY)
        
        # Prepare transaction
        transaction = {
            'to': w3.to_checksum_address(tx_data.get('to')),
            'data': tx_data.get('data'),
            'value': parse_int(tx_data.get('value', 0)),
            'gas': parse_int(tx_data.get('gasLimit', 500000)),
            'gasPrice': parse_int(tx_data.get('gasPrice', w3.eth.gas_price)),
            'nonce': w3.eth.get_transaction_count(account.address),
            'chainId': parse_int(tx_data.get('chainId', 8453)) # Default Base
        }

        # Sign and send transaction
        signed_txn = account.sign_transaction(transaction)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        hex_hash = Web3.to_hex(tx_hash)

        result = {
            "txHash": hex_hash,
            "outputAmountBase": output_amount_base,
            "outputAmountDisplay": f"~{output_amount_base}",
            "simulated": False,
            "note": "Transaction executed successfully."
        }
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()

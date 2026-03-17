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
WALLET_ADDRESS = os.getenv("AGENT_WALLET_ADDRESS")

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

    # Simplified format converting for Base tokens (LI.FI expects integers like wei)
    # Since we don't know the exact decimals without a token info call, 
    # we will assume 18 decimals for this prototype. (USDC is usually 6, so we'll query token first if needed).
    # For a robust implementation, you should query LI.FI /v1/token to get exact decimals.
    
    # Let's hit the quote endpoint directly. Li.Fi handles routing well.
    url = "https://li.quest/v1/quote"
    params = {
        "fromChain": from_chain,
        "toChain": to_chain,
        "fromToken": from_token,
        "toToken": to_token,
        "fromAmount": str(int(float(amount_str) * (10**6))), # assuming USDC (6 decimals)
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

        output_amount_base = int(quote.get("toAmountMin", 0))
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
            'value': int(tx_data.get('value', 0)),
            'gas': int(tx_data.get('gasLimit', 500000)),
            'gasPrice': int(tx_data.get('gasPrice', w3.eth.gas_price)),
            'nonce': w3.eth.get_transaction_count(account.address),
            'chainId': tx_data.get('chainId', 8453) # Default Base
        }

        # Sign and send transaction
        signed_txn = account.sign_transaction(transaction)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
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

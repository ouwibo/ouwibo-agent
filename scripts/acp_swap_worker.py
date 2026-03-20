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

def get_chain_id(name: str) -> str:
    mapping = {
        "eth": "1",
        "ethereum": "1",
        "base": "8453",
        "arb": "42161",
        "arbitrum": "42161",
        "op": "10",
        "optimism": "10",
        "bsc": "56",
        "binance": "56",
        "polygon": "137",
        "avax": "43114",
        "avalanche": "43114",
        "gnosis": "100",
        "sol": "115111108"
    }
    return mapping.get(name.lower(), name)

def main():
    use_routes = "--routes" in sys.argv
    
    # Clean up sys.argv for positionals
    clean_args = [a for a in sys.argv if not a.startswith("--")]
    if len(clean_args) < 6:
        print(json.dumps({"error": "Missing required arguments: fromToken, toToken, amount, fromChain, toChain"}))
        sys.exit(1)

    from_token = clean_args[1]
    to_token = clean_args[2]
    amount_str = clean_args[3]
    from_chain = get_chain_id(clean_args[4])
    to_chain = get_chain_id(clean_args[5])

    # Try loading from backend/.env if root .env doesn't exist or doesn't have LIFI_API_KEY
    if not os.getenv("LIFI_API_KEY"):
        load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", ".env"))
    
    _lifi_key = os.getenv("LIFI_API_KEY")
    _wallet = os.getenv("WALLET_ADDRESS") or WALLET_ADDRESS

    if not _lifi_key:
        print(json.dumps({"error": "LIFI_API_KEY not found in environment."}))
        sys.exit(1)

    # Determine token decimals
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
        _decimals = 18

    headers = {
        "accept": "application/json",
        "x-lifi-api-key": _lifi_key
    }
    
    amount_base = str(int(float(amount_str) * (10 ** _decimals)))
    from_address = _wallet or "0xf55Cee7BB7bd8712197679d48a618A54840B2335"

    if use_routes:
        url = "https://li.quest/v1/advanced/routes"
        payload = {
            "fromChainId": int(from_chain),
            "toChainId": int(to_chain),
            "fromTokenAddress": from_token,
            "toTokenAddress": to_token,
            "fromAmount": amount_base,
            "fromAddress": from_address,
            "options": {"slippage": 0.005}
        }
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code != 200:
                print(json.dumps({"error": f"LI.FI Routes API failed: {response.text}"}))
                sys.exit(1)
            
            data = response.json()
            routes = data.get("routes", [])
            formatted_routes = []
            for r in routes[:5]:
                formatted_routes.append({
                    "id": r.get("id"),
                    "tool": r.get("steps", [{}])[0].get("tool"),
                    "toAmount": r.get("toAmount"),
                    "gasCostUSD": r.get("gasCostUSD"),
                    "steps": len(r.get("steps", []))
                })
            print(json.dumps({
                "routes": formatted_routes,
                "note": "Aggregator mode: multiple routes found."
            }))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Routes fetch error: {str(e)}"}))
            sys.exit(1)

    # DEFAULT: Quote mode
    url = "https://li.quest/v1/quote"
    params = {
        "fromChain": from_chain,
        "toChain": to_chain,
        "fromToken": from_token,
        "toToken": to_token,
        "fromAmount": amount_base,
        "fromAddress": from_address
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code != 200:
            print(json.dumps({"error": f"LI.FI API failed: {response.text}"}))
            sys.exit(1)

        data = response.json()
        quote = data.get("estimate", {})
        tx_data = data.get("transactionRequest", {})

        result = {
            "txHash": None,
            "outputAmount": quote.get("toAmountMin", "0"),
            "transactionRequest": tx_data,
            "simulated": True if not (Web3 and PRIVATE_KEY) else False,
            "note": "Transaction prepared successfully. [ACTION: CONNECT_WALLET] to sign."
        }
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()

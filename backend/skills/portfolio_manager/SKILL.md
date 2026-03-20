# ---
# name: Portfolio
# description: Multi-wallet portfolio tracking, P&L analysis, and asset allocation recommendations.
# category: trading
# icon: portfolio
# priority: 80
# tools: [wallet, crypto, search]
# ---

# Portfolio Manager

Multi-wallet cryptocurrency portfolio tracking and analysis.

## Core Capabilities

### 1. Balance Tracking
- Query multiple wallet addresses
- Aggregate holdings across chains
- Real-time USD valuation
- Historical balance tracking (manual)

### 2. P&L Analysis
- Calculate profit/loss per asset
- Track cost basis (manual entry)
- Realized vs unrealized gains
- Performance metrics

### 3. Asset Allocation
- Portfolio diversification metrics
- Chain distribution (ETH, Base, Arbitrum, etc.)
- Category breakdown (DeFi, NFT, Stablecoin)
- Rebalancing recommendations

## Supported Chains

| Chain | RPC | Explorer |
|-------|-----|----------|
| Ethereum | eth-mainnet | etherscan.io |
| Base | base | basescan.org |
| Arbitrum | arbitrum-one | arbiscan.io |
| Optimism | optimism | optimistic.etherscan.io |
| Polygon | polygon | polygonscan.com |
| BSC | bsc | bscscan.com |
| Avalanche | avalanche | snowtrace.io |

## Usage

### Check Balance
```
wallet[balance 0x... eth]
wallet[balance 0x... base]
```

### Portfolio Commands

| Command | Description |
|---------|-------------|
| `wallet[balance <address> <chain>]` | Single wallet balance |
| `crypto[portfolio]` | Aggregate view |

## Portfolio Metrics

### Performance Indicators

| Metric | Description |
|--------|-------------|
| Total Value | Sum of all assets in USD |
| 24h Change | Percentage change |
| Best Performer | Highest gainer |
| Worst Performer | Biggest loser |

### Allocation View

```
Chain Distribution:
- Ethereum: 45%
- Base: 30%
- Arbitrum: 15%
- Other: 10%

Asset Type:
- Tokens: 70%
- NFTs: 20%
- Stablecoins: 10%
```

## Best Practices

1. **Never share private keys** — only public addresses
2. **Verify addresses** — always double-check before transactions
3. **Track cost basis** — for accurate P&L
4. **Diversify** — don't put all in one chain/asset
5. **Monitor gas** — factor into analysis

## Disclaimer

"Portfolio analysis is for informational purposes only. Not financial advice."

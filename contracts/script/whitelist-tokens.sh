#!/usr/bin/env bash
# Whitelist ERC-20 tokens on CknowRegistry (Celo Mainnet)
set -e

source "$(dirname "$0")/../.env"

REGISTRY="$CKNOW_REGISTRY_ADDRESS"
RPC="$CELO_RPC"
PK="$DEPLOYER_PRIVATE_KEY"
DEPLOYER="0x56A2950ddE6B1040d1DCC4b4C4Fc314Bd56eFB0E"

NONCE=$(cast nonce "$DEPLOYER" --rpc-url "$RPC")
echo "Starting nonce: $NONCE"

cast_whitelist() {
  local name="$1"
  local addr="$2"
  local min_stake="$3"
  echo "Whitelisting $name ($addr) — nonce $NONCE..."
  cast send "$REGISTRY" \
    "setAllowedToken(address,bool,uint256)" \
    "$addr" true "$min_stake" \
    --rpc-url "$RPC" \
    --private-key "$PK" \
    --nonce "$NONCE"
  echo "  Done: $name"
  NONCE=$((NONCE + 1))
}

# Mento stablecoins — 18 decimals, min 0.001 token = 1e15
cast_whitelist "KESm"  "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0" 1000000000000000
cast_whitelist "NGNm"  "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71" 1000000000000000
cast_whitelist "GHSm"  "0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313" 1000000000000000
cast_whitelist "BRLm"  "0xe8537a3d056da446677b9e9d6c5db704eaab4787" 1000000000000000

# Circle / Tether — 6 decimals, min 0.001 token = 1000
cast_whitelist "USDC"  "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" 1000
cast_whitelist "USDT"  "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e" 1000

echo ""
echo "All remaining tokens whitelisted on CknowRegistry."

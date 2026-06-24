# cknow — Decentralized Knowledge Protocol

> Submit verifiable knowledge on Celo. Earn iNFTs and royalties every time your data is queried.

**Live:** [cknow.vercel.app](https://cknow.vercel.app) · **Chain:** Celo Mainnet (42220) · **Built for:** Proof of Ship Hackathon

---

## What is cknow?

cknow is a decentralized knowledge protocol with **economic skin-in-the-game**. Anyone can contribute knowledge entries to a shared graph — but every submission requires a stake. High-quality entries earn royalties; low-quality ones can be challenged and slashed.

The result: a self-curating knowledge base where incentives align contributors toward truth.

### How it works

```
Contributor → Stake tokens → Submit knowledge → Receive iNFT
                                                      ↓
                              Querier pays royalty → Vault → Distributed to iNFT holders
                                                      ↑
                              Challenger stakes → Disputes bad entry → Slash or reward
```

1. **Submit** — Write a knowledge entry, choose a domain (Factual / Labeled / Observation), stake CELO or any Mento stablecoin.
2. **Get minted** — A successful submission mints an iNFT (intelligent NFT) representing your knowledge stake.
3. **Earn royalties** — Every semantic query that surfaces your entry pays a micro-royalty to the RoyaltyVault, distributed to iNFT holders.
4. **Trade** — List your iNFT on the built-in market. Other users can buy the income stream.
5. **Challenge** — Spot a bad entry? Stake to challenge it. A validator resolves the dispute; the winner takes the loser's stake.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (Next.js 16)               │
│  Reown AppKit · Wagmi · Press Start 2P pixel theme  │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                 Backend (Bun + Express)              │
│  @xenova/transformers embeddings · SQLite index      │
│  Pinata/IPFS storage · Celo chain reads via viem    │
└──────────────────────┬──────────────────────────────┘
                       │ on-chain
┌──────────────────────▼──────────────────────────────┐
│              Smart Contracts (Celo Mainnet)          │
│  CknowRegistry · CknowINFT · StakeVault              │
│  ChallengeManager · RoyaltyVault · CknowMarket       │
└─────────────────────────────────────────────────────┘
```

---

## Smart Contracts — Celo Mainnet (Chain 42220)

All contracts are upgradeable proxies deployed at these addresses:

| Contract | Proxy Address |
|---|---|
| `CknowRegistry` | [`0xd27A3431c6F9c78D46663296EEe40ed86b968f47`](https://celoscan.io/address/0xd27A3431c6F9c78D46663296EEe40ed86b968f47) |
| `CknowINFT` (ERC-721) | [`0xFDcb17837Ba045ae33Cf98A444118e70179fEDCe`](https://celoscan.io/address/0xFDcb17837Ba045ae33Cf98A444118e70179fEDCe) |
| `StakeVault` | [`0x76E4175F8195642E26bFEF937F32243dE86d7A56`](https://celoscan.io/address/0x76E4175F8195642E26bFEF937F32243dE86d7A56) |
| `ChallengeManager` | [`0x9D49Df28f821804018f43842e21d8Ce632679F5f`](https://celoscan.io/address/0x9D49Df28f821804018f43842e21d8Ce632679F5f) |
| `RoyaltyVault` | [`0x565D6B9d024ef1ea36B183f82C0Fdbcc0334974C`](https://celoscan.io/address/0x565D6B9d024ef1ea36B183f82C0Fdbcc0334974C) |
| `CknowMarket` | [`0x0111988b7c11500a17028C64dD795Aed0205d7dD`](https://celoscan.io/address/0x0111988b7c11500a17028C64dD795Aed0205d7dD) |
| `ValidatorRegistry` | [`0xb3Eb820B6a8fdb77260b78Cd403891D53C61f283`](https://celoscan.io/address/0xb3Eb820B6a8fdb77260b78Cd403891D53C61f283) |

### Whitelisted Stake Tokens (min 0.001 each)

| Symbol | Type | Address |
|---|---|---|
| CELO | Native | — (native) |
| USDm | Mento USD | `0x765DE816845861e75A25fCA122bb6898B8B1282a` |
| EURm | Mento EUR | `0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73` |
| KESm | Mento KES | `0x456a3D042C0DbD3db53D5489e98dFb038553B0d0` |
| NGNm | Mento NGN | `0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71` |
| GHSm | Mento GHS | `0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313` |
| BRLm | Mento BRL | `0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787` |
| USDC | Circle | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| USDT | Tether | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |

> Celo's [fee abstraction (CIP-64)](https://docs.celo.org/cel2/fee-abstraction) lets users pay gas in any of these tokens — no native CELO required.

---

## Tech Stack

### Frontend
- **Next.js 16** (Turbopack, App Router)
- **Reown AppKit** + **Wagmi** — wallet connection with MiniPay auto-detect
- **Viem** — on-chain reads and transaction encoding
- **Press Start 2P** pixel font — 8-bit aesthetic

### Backend
- **Bun** runtime + `bun:sqlite` — zero-dependency SQLite
- **@xenova/transformers** — local semantic embeddings (all-MiniLM-L6-v2)
- **Pinata** — IPFS storage for knowledge content
- **Express** — REST API layer

### Contracts
- **Solidity 0.8.x** + OpenZeppelin upgradeable
- **Foundry** — test suite and deploy scripts
- Deployed via `Deploy.s.sol` with UUPS proxy pattern

---

## Running Locally

### Prerequisites
- [Bun](https://bun.sh) ≥ 1.1
- Node.js ≥ 20
- A Pinata account ([app.pinata.cloud](https://app.pinata.cloud)) for IPFS

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in PINATA_JWT + OPERATOR_PRIVATE_KEY
bun install
bun run dev            # runs on http://localhost:3001
```

Key env vars:

```env
OPERATOR_PRIVATE_KEY=0x...         # deployer wallet private key
PINATA_JWT=eyJ...                  # Pinata JWT from app.pinata.cloud
CELO_RPC=https://forno.celo.org
PORT=3001
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm install
npm run dev                        # runs on http://localhost:3000
```

Key env vars:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## API Reference

Base URL: `https://cknow-production.up.railway.app`

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check + entry count |
| `POST` | `/store/prepare` | Upload content to IPFS, get storage refs |
| `POST` | `/store/confirm` | Index entry after on-chain tx confirms |
| `POST` | `/query` | Semantic search over knowledge graph |
| `GET` | `/content/:entryId` | Fetch full entry content |
| `GET` | `/entries` | List all entries |
| `GET` | `/market/listings` | Active iNFT market listings from chain |
| `GET` | `/discussions/:entryId` | Thread for an entry |
| `POST` | `/discussions/:entryId` | Post a comment |

---

## Submit Flow

```
1. User writes knowledge entry
2. Frontend calls POST /store/prepare
   → content uploaded to IPFS
   → embeddings computed off-chain
3. Frontend calls CknowRegistry.submit(storageRef, embeddingRef, tags, domain, token, stake)
   → payable with CELO native, or ERC-20 (approve StakeVault first)
   → contract mints iNFT to submitter
4. Frontend calls POST /store/confirm with txHash
   → backend indexes entry in SQLite for fast semantic search
```

---

## Celo Integration Notes

- **Chain ID**: 42220 (Mainnet)
- **RPC**: `https://forno.celo.org` (public, no rate limit for reads)
- **Block time**: ~1 second — receipt confirmation is fast
- **Gas cost**: ~$0.0005 per transaction
- **MiniPay**: auto-connect enabled in `WalletButton.tsx` — no connect button shown inside MiniPay
- **ERC-8004**: Self Agent ID integration in Profile for AI agent identity verification

---

## Deployment

| Layer | Platform | URL |
|---|---|---|
| Frontend | Vercel | [cknow.vercel.app](https://cknow.vercel.app) |
| Backend | Railway | [cknow-production.up.railway.app](https://cknow-production.up.railway.app) |
| Contracts | Celo Mainnet | see table above |

---

## License

MIT

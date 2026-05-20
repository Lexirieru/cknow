import type { Address } from "viem";

/** Celo Mainnet (chain 42220) — deployed via Deploy.s.sol @ nonce 1130 */
export const CONTRACTS = {
  STAKE_VAULT:        "0x76E4175F8195642E26bFEF937F32243dE86d7A56" as Address,
  VALIDATOR_REGISTRY: "0xb3Eb820B6a8fdb77260b78Cd403891D53C61f283" as Address,
  CKNOW_INFT:         "0xFDcb17837Ba045ae33Cf98A444118e70179fEDCe" as Address,
  CKNOW_REGISTRY:     "0xd27A3431c6F9c78D46663296EEe40ed86b968f47" as Address,
  CHALLENGE_MANAGER:  "0x9D49Df28f821804018f43842e21d8Ce632679F5f" as Address,
  ROYALTY_VAULT:      "0x565D6B9d024ef1ea36B183f82C0Fdbcc0334974C" as Address,
  CKNOW_MARKET:       "0x0111988b7c11500a17028C64dD795Aed0205d7dD" as Address,
} as const;

/** Implementation addresses (read-only reference) */
export const IMPLEMENTATIONS = {
  STAKE_VAULT:        "0x3548Ae3696C3924B94B71302290fe11dd795A995" as Address,
  VALIDATOR_REGISTRY: "0x66A1C8D0E1947a969C892CCCd3C8493c59f5B4d4" as Address,
  CKNOW_INFT:         "0x6d90E58D66A2e47E868A0298a526aF181339B8E5" as Address,
  CKNOW_REGISTRY:     "0xF3C34a8bE44dfF8EdB28Be9F7B66dcCa223FB7a5" as Address,
  CHALLENGE_MANAGER:  "0x386a35b4580D2313eCAF176B225495EdDc4246D5" as Address,
  ROYALTY_VAULT:      "0xef36381e062C72dC1B15C53217f9D02744064DF1" as Address,
  CKNOW_MARKET:       "0x99478Bf0c3f049E9255aAB9039a5C3D8CF5C8FA3" as Address,
} as const;

/** Celo Mainnet chain ID */
export const CELO_CHAIN_ID = 42220;

/** Public RPC for read-only calls */
export const CELO_RPC = "https://forno.celo.org";

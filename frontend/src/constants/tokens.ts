import type { Address } from "viem";

export type Token = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  /** Minimum stake amount in the token's native units */
  minStake: bigint;
  /** Flag to call setAllowedToken on CknowRegistry */
  whitelisted: boolean;
};

/** address(0) sentinel — represents native CELO */
export const NATIVE_CELO = "0x0000000000000000000000000000000000000000" as Address;

// ─── Mento Stablecoins (18 decimals) ─────────────────────────────────────────

export const USDM: Token = {
  address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  symbol: "USDm",
  name: "Mento Dollar",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,   // 0.001 USDm
  whitelisted: true,
};

export const EURM: Token = {
  address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
  symbol: "EURm",
  name: "Mento Euro",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: true,
};

export const GBPM: Token = {
  address: "0xCCF663b1fF11028f0b19058d0f7B674004a40746",
  symbol: "GBPm",
  name: "Mento British Pound",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: true,
};

export const BRLM: Token = {
  address: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
  symbol: "BRLm",
  name: "Mento Brazilian Real",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: true,
};

export const KESM: Token = {
  address: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
  symbol: "KESm",
  name: "Mento Kenyan Shilling",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: true,
};

export const NGNM: Token = {
  address: "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71",
  symbol: "NGNm",
  name: "Mento Nigerian Naira",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: true,
};

export const GHSM: Token = {
  address: "0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313",
  symbol: "GHSm",
  name: "Mento Ghanaian Cedi",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: true,
};

export const CADM: Token = {
  address: "0xff4Ab19391af240c311c54200a492233052B6325",
  symbol: "CADm",
  name: "Mento Canadian Dollar",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: false, // enable via admin panel if needed
};

export const AUDM: Token = {
  address: "0x7175504C455076F15c04A2F90a8e352281F492F9",
  symbol: "AUDm",
  name: "Mento Australian Dollar",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: false,
};

export const CHFM: Token = {
  address: "0xb55a79F398E759E43C95b979163f30eC87Ee131D",
  symbol: "CHFm",
  name: "Mento Swiss Franc",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: false,
};

export const COPM: Token = {
  address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
  symbol: "COPm",
  name: "Mento Colombian Peso",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: false,
};

export const JPYM: Token = {
  address: "0xc45eCF20f3CD864B32D9794d6f76814aE8892e20",
  symbol: "JPYm",
  name: "Mento Japanese Yen",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: false,
};

export const ZARM: Token = {
  address: "0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6",
  symbol: "ZARm",
  name: "Mento South African Rand",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: false,
};

export const XOFM: Token = {
  address: "0x73F93dcc49cB8A239e2032663e9475dd5ef29A08",
  symbol: "XOFm",
  name: "Mento West African CFA Franc",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,
  whitelisted: false,
};

// ─── Centralized Stablecoins (6 decimals) ────────────────────────────────────

export const USDC: Token = {
  address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  minStake: 1000n,  // 0.001 USDC
  whitelisted: true,
};

export const USDT: Token = {
  address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  symbol: "USDT",
  name: "Tether USD",
  decimals: 6,
  minStake: 1000n,  // 0.001 USDT
  whitelisted: true,
};

// ─── Native CELO ──────────────────────────────────────────────────────────────

export const CELO: Token = {
  address: NATIVE_CELO,
  symbol: "CELO",
  name: "Celo",
  decimals: 18,
  minStake: 1_000_000_000_000_000n,  // 0.001 CELO
  whitelisted: true,  // always whitelisted in CknowRegistry constructor
};

// ─── Grouped exports ──────────────────────────────────────────────────────────

/** All tokens that should be whitelisted on deploy */
export const WHITELISTED_TOKENS: Token[] = [
  CELO,
  USDM,
  EURM,
  GBPM,
  BRLM,
  KESM,
  NGNM,
  GHSM,
  USDC,
  USDT,
];

/** All available tokens (whitelisted and not) */
export const ALL_TOKENS: Token[] = [
  CELO,
  USDM, EURM, GBPM, BRLM, KESM, NGNM, GHSM,
  CADM, AUDM, CHFM, COPM, JPYM, ZARM, XOFM,
  USDC, USDT,
];

/** Quick lookup: address (lowercase) → Token */
export const TOKEN_BY_ADDRESS: Record<string, Token> = Object.fromEntries(
  ALL_TOKENS.map((t) => [t.address.toLowerCase(), t])
);

/** Returns display string for an amount given token decimals */
export function formatTokenAmount(amount: bigint, token: Token, fractionDigits = 4): string {
  const divisor = 10n ** BigInt(token.decimals);
  const whole   = amount / divisor;
  const frac    = amount % divisor;
  const fracStr = frac.toString().padStart(token.decimals, "0").slice(0, fractionDigits);
  return `${whole}.${fracStr} ${token.symbol}`;
}

/** Returns the Token for a given address, or undefined */
export function getToken(address: string): Token | undefined {
  return TOKEN_BY_ADDRESS[address.toLowerCase()];
}

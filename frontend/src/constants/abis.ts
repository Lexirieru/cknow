export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export const MARKET_ABI = [
  {
    name: 'buy',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

export const REGISTRY_ABI = [
  {
    name: 'submit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'storageRef', type: 'string' },
      { name: 'embeddingRef', type: 'string' },
      { name: 'tags', type: 'string[]' },
      { name: 'domain', type: 'uint8' },
      { name: 'paymentToken', type: 'address' },
      { name: 'stakeAmt', type: 'uint256' },
    ],
    outputs: [{ name: 'entryId', type: 'bytes32' }],
  },
] as const

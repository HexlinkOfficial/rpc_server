export interface Chain {
  name: string
  chainId?: string
  rpcUrls: string[]
  fullName: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorerUrls: string[]
  logoUrl: string
}

export interface User {
  idType: 'mailto' | 'tel'
  account: string
}

export interface Token {
  symbol: string
  logoURI: string
}

export class CustomError extends Error {
  public code: number

  constructor (code: number, m: string) {
    super(m)
    this.code = code
  }
}

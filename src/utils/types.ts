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

export interface Request {
  user: User
  version: number
}

/** config store rpc service types */

export interface GetConfigRequest extends Request {
  config: string
  key: string | null
}

export interface GetConfigResponse {
  data: any
}

export interface SetConfigRequest extends Request {
  config: string
  key: string | null
  value: any
  overwrite: boolean // default false
}

export interface SetConfigResponse {
  success: boolean
}

export interface DelConfigRequest extends Request {
  config: string
  key: string | null
}

export interface DelConfigResponse {
  success: boolean
}

/** otp auth rpc service types */

export interface SendOtpRequest extends Request { }

export interface SendOtpResponse {
  success: boolean
  sentAt: number
}

export interface ValidateOtpRequest extends Request {
  code: string
  message: string // extra message to sign
}

export interface ValidateOtpResponse {
  success: boolean
  signature: string
}

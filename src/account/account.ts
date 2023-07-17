import { ethers } from 'ethers'
import { Hexlink__factory } from '@hexlink/contracts'

import { type Chain, type User } from '../utils/types'
import { hash } from '../utils/utils'

export function getProvider (chain: Chain): ethers.Provider {
  if (chain.name === 'arbitrum_nova' || chain.name === 'OKT') {
    return new ethers.JsonRpcProvider(chain.rpcUrls[0])
  } else {
    return new ethers.InfuraProvider(
      Number(chain.chainId),
      process.env.VITE_INFURA_API_KEY
    )
  }
}

export async function isContract (chain: Chain, address: string): Promise<boolean> {
  try {
    const code = await getProvider(chain).getCode(address)
    if (code !== '0x') return true
  } catch (error) {}
  return false
}

export function getUserId (user: User): string {
  return `${user.idType}:id.${user.account}`
}

export async function getAccountAddress (user: User, chain: Chain): Promise<string> {
  if (process.env.VITE_ACCOUNT_FACTORY_V2 === undefined) {
    throw new Error('VITE_ACCOUNT_FACTORY_V2 is not set')
  }
  const hexlink = Hexlink__factory.connect(
    process.env.VITE_ACCOUNT_FACTORY_V2,
    getProvider(chain)
  )
  const nameType = hash(user.idType)
  const name = hash(user.account)
  return await hexlink.getOwnedAccount(nameType, name)
}

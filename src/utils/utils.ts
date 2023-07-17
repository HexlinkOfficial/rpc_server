import { ethers } from 'ethers'

export function hash (value: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(value))
}

export const now = (): number => {
  return Math.floor(new Date().getTime() / 1000)
}

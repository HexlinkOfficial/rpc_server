import { createJSONRPCErrorResponse } from 'json-rpc-2.0'
import { getUserId } from '../account/account'
import { now } from '../utils/utils'
import { incrCounter } from '../db/redis'
import { CustomError } from '../utils/types'

interface RateLimitThreshold {
  window: number // seconds
  numOfReqPerUser: number
  numOfReqPerIp: number
}

async function checkRateLimit (
  ip: string,
  userId: string,
  threshold: RateLimitThreshold
): Promise<void> {
  const bucket = Math.floor(now() / threshold.window).toString()
  const key = '#internal_ratelimit_' + bucket
  const countPerIp = await incrCounter(key, ip)
  if (countPerIp > threshold.numOfReqPerIp) {
    throw new CustomError(-32504, 'too many requests')
  }
  const countPerUser = await incrCounter(key, userId)
  if (countPerUser > threshold.numOfReqPerUser) {
    throw new CustomError(-32504, 'too many requests')
  }
}

export const rateLimitMiddleware = async (
  next: any,
  request: any,
  serverParams: any
): Promise<any> => {
  const ip = request.headers['x-forwarded-for'] ?? request.socket.remoteAddress
  const userId = getUserId(serverParams.user)
  try {
    if (request.method === 'auth_sendOtp') {
      await checkRateLimit(ip, userId, {
        window: 60,
        numOfReqPerIp: 10,
        numOfReqPerUser: 10
      })
    } else if (request.method === 'auth_validateOtp') {
      await checkRateLimit(ip, userId, {
        window: 60,
        numOfReqPerIp: 5,
        numOfReqPerUser: 5
      })
    } else if (request.method === 'config_get') {
      await checkRateLimit(ip, userId, {
        window: 60,
        numOfReqPerIp: 60,
        numOfReqPerUser: 60
      })
    } else if ((request.method as string).startsWith('config_')) {
      await checkRateLimit(ip, userId, {
        window: 60,
        numOfReqPerIp: 30,
        numOfReqPerUser: 30
      })
    }
  } catch (error: any) {
    return createJSONRPCErrorResponse(request.id, error.code, error.message)
  }
  await next(request, serverParams)
}

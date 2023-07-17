import { createJSONRPCErrorResponse } from 'json-rpc-2.0'
import { getUserId } from '../account/account'
import { CustomError } from '../utils/types'

interface RateLimitThreshold {
  window: number // seconds
  numOfReq: number // request
}

async function checkRateLimit (
  _ip: string,
  _userId: string,
  _threshold: RateLimitThreshold
): Promise<void> {
  throw new CustomError(-32603, 'not implemented')
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
      await checkRateLimit(ip, userId, { window: 60, numOfReq: 10 })
    } else if (request.method === 'auth_validateOtp') {
      await checkRateLimit(ip, userId, { window: 60, numOfReq: 5 })
    } else if (request.method === 'config_get') {
      await checkRateLimit(ip, userId, { window: 60, numOfReq: 600 })
    } else if ((request.method as string).startsWith('config_')) {
      await checkRateLimit(ip, userId, { window: 60, numOfReq: 300 })
    }
  } catch (error: any) {
    return createJSONRPCErrorResponse(request.id, error.code, error.message)
  }
  await next(request, serverParams)
}

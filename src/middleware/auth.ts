import { createJSONRPCErrorResponse } from 'json-rpc-2.0'
import { type User, CustomError } from '../utils/types'

async function authenticate (user: User): Promise<void> {
  throw new CustomError(-32603, 'Not Implemented')
}

export const authMiddleware = async (next: any, request: any, serverParams: any): Promise<any> => {
  if ((request.method as string).startsWith('auth_')) {
    await next(request, serverParams)
    return
  }

  try {
    const { user } = serverParams
    await authenticate(user)
  } catch (error: any) {
    return createJSONRPCErrorResponse(request.id, error.code, error.message)
  }
  await next(request, serverParams)
}

import {
  CustomError,
  type DelConfigRequest,
  type DelConfigResponse,
  type GetConfigRequest,
  type GetConfigResponse,
  type SetConfigRequest,
  type SetConfigResponse
} from '../utils/types'
import { get, set, del } from '../db/redis'

const SUPPORTED_CONFIGS = new Set<string>([])

function validateConfig (config: string): void {
  if (!SUPPORTED_CONFIGS.has(config)) {
    throw new CustomError(-32502, 'Unsupported config')
  }
}

export const getConfig = async (
  request: GetConfigRequest
): Promise<GetConfigResponse> => {
  validateConfig(request.config)
  const data = await get(request)
  return { data }
}

export const setConfig = async (
  request: SetConfigRequest
): Promise<SetConfigResponse> => {
  validateConfig(request.config)
  const success = await set(request)
  return { success }
}

export const deleteConfig = async (
  request: DelConfigRequest
): Promise<DelConfigResponse> => {
  validateConfig(request.config)
  const success = await del(request)
  return { success }
}

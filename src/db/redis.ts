import { createClient } from 'redis'
import { CustomError } from '../utils/types'
import type {
  GetConfigRequest,
  SetConfigRequest,
  DelConfigRequest
} from '../utils/types'

const client = createClient({ url: process.env.REDIS_URL })
client.connect()
  .then(() => { console.log('Connected to Redis') })
  .catch(err => { console.log('Redis Connection Error', err) })

export async function getCounter (
  key: string,
  field: string
): Promise<number> {
  const result = await client.hGet(key, field)
  return Number(result ?? 0)
}

export async function incrCounter (
  key: string,
  field: string
): Promise<number> {
  const result = await client.hIncrBy(key, field, 1)
  return Number(result ?? 0)
}

export async function get (req: GetConfigRequest): Promise<any> {
  if (await client.exists(req.config) === 0) {
    return null
  }
  if (req.key === null) {
    return await client.hGetAll(req.config)
  } else {
    return await client.hGet(req.config, req.key)
  }
}

export async function set (req: SetConfigRequest): Promise<boolean> {
  if (await client.exists(req.config) === 0) { // config not exists
    if (req.key === null) {
      await client.hSet(req.config, req.value)
    } else {
      await client.hSet(req.config, req.key, req.value)
    }
  } else if (req.key === null) { // update the whole config
    if (!req.overwrite) {
      throw new CustomError(-32503, 'config already exists')
    }
    await client.hSet(req.config, req.value)
  } else { // update one field of the config
    if (await client.hExists(req.config, req.key) && !req.overwrite) {
      throw new CustomError(-32503, 'config already exists')
    }
    await client.hSet(req.config, req.key, req.value)
  }
  return true
}

export async function del (req: DelConfigRequest): Promise<boolean> {
  if (req.key === null) {
    await client.del(req.config)
  } else {
    await client.hDel(req.config, req.key)
  }
  return true
}

import { FieldValue, Firestore } from '@google-cloud/firestore'
import { CustomError } from '../utils/types'
import type {
  GetConfigRequest,
  SetConfigRequest,
  DelConfigRequest
} from '../utils/types'
import { getUserId } from '../account/account'

const db = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: './service-account.json'
})

export async function get (req: GetConfigRequest): Promise<any> {
  const docRef = db.collection(req.config).doc(getUserId(req.user))
  const config = await docRef.get()
  if (!config.exists) {
    return null
  }
  if (req.key === null) {
    return config.data()
  }
  return config.get(req.key)
}

export async function set (req: SetConfigRequest): Promise<boolean> {
  const docRef = db.collection(req.config).doc(getUserId(req.user))
  const config = await docRef.get()
  if (!config.exists) { // config not exists
    await docRef.create(
      req.key === null ? req.value : { [req.key]: req.value }
    )
  } else if (req.key === null) { // update the whole config
    if (!req.overwrite) {
      throw new CustomError(-32503, 'config already exists')
    }
    await docRef.set(req.value)
  } else { // update one field of the config
    const existingValue = config.get(req.key)
    if (existingValue !== undefined && !req.overwrite) {
      throw new CustomError(-32503, 'config already exists')
    }
    await docRef.update({ [req.key]: req.value })
  }
  return true
}

export async function del (req: DelConfigRequest): Promise<boolean> {
  const docRef = db.collection(req.config).doc(getUserId(req.user))
  if (req.key === null) {
    await docRef.delete()
  } else {
    await docRef.update({ [req.key]: FieldValue.delete() })
  }
  return true
}

import Mailgun from 'mailgun.js'
import formData from 'form-data'
import { Twilio } from 'twilio'
import {
  CustomError,
  type User,
  type SendOtpRequest,
  type SendOtpResponse,
  type ValidateOtpRequest,
  type ValidateOtpResponse
} from '../utils/types'
import {
  decryptWithSymmKey,
  encryptWithSymmKey,
  defaultEncryptorConfig,
  signWithKmsKey,
  defaultSignerConfig
} from './kms'
import { getConfig, setConfig } from './config_store'
import { buildAuthenticationNotification } from './notification'
import { ethers } from 'ethers'

interface EmailData {
  [key: string]: string
  from: string
  to: string
  subject: string
  text: string
  html: string
}

interface OtpData {
  code: string
  sentAt: number
  verified: false
}

const CHARS = '0123456789'
const OTP_LEN = 6
const EXPIRE_AFTER = 900 // 10mins

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const randomCode = (length: number): string => {
  let code = ''
  const len = CHARS.length
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * len)]
  }
  return code
}

const now = (): number => {
  return Math.floor(new Date().getTime() / 1000)
}

export const sendEmail = async (data: EmailData): Promise<void> => {
  if (process.env.MAILGUN_API_KEY === undefined) {
    throw new Error('MAILGUN_API_KEY is not set')
  }
  const mailgun = new Mailgun(formData)
  const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY
  })
  await mg.messages.create('hexlink.io', data)
}

export const sendOtp = async (
  request: SendOtpRequest
): Promise<SendOtpResponse> => {
  if (request.user.idType === 'mailto') {
    const plainOTP = randomCode(OTP_LEN)
    await sendEmail(
      buildAuthenticationNotification(request.user.account, plainOTP)
    )
    const otpData: OtpData = {
      code: await encryptWithSymmKey(defaultEncryptorConfig(), plainOTP),
      sentAt: now(),
      verified: false
    }
    await setConfig({
      user: request.user,
      version: 0,
      config: '#internal_otp',
      key: null,
      value: otpData,
      overwrite: true
    })
  } else if (request.user.idType === 'tel') {
    if (process.env.TWILIO_VA_SERVICE_SID === undefined) {
      throw new CustomError(-32603, 'internal server error')
    }
    await twilioClient.verify.v2.services(
      process.env.TWILIO_VA_SERVICE_SID
    ).verifications.create({
      to: request.user.account,
      channel: 'sms'
    })
  } else {
    throw new CustomError(-32502, 'invalid id type')
  }
  return { success: true, sentAt: now() }
}

const checkSmsOtp = async (to: User, code: string): Promise<void> => {
  if (process.env.TWILIO_VA_SERVICE_SID === undefined) {
    throw new CustomError(-32603, 'internal server error')
  }
  const check = await twilioClient.verify.v2.services(
    process.env.TWILIO_VA_SERVICE_SID
  ).verificationChecks.create({ to: to.account, code })
  if (check.status !== 'approved') {
    throw new CustomError(-32503, 'invalid otp code')
  }
}

async function checkEmailOtp (to: User, code: string): Promise<void> {
  const { data }: { data: OtpData } = await getConfig({
    user: to,
    version: 0,
    config: '#internal_otp',
    key: 'null'
  })

  if (data.verified) {
    throw new CustomError(-32503, 'already verified')
  }

  const decrypted = await decryptWithSymmKey(
    defaultEncryptorConfig(),
    data.code
  )
  if (decrypted !== code) {
    throw new CustomError(-32503, 'invalid otp code')
  }

  if (data.sentAt < now() - EXPIRE_AFTER) {
    throw new CustomError(-32503, 'invalid otp code')
  }

  await setConfig({
    user: to,
    version: 0,
    config: '#internal_otp',
    key: 'verified',
    value: false,
    overwrite: true
  })
}

const toEthSignedMessageHash = (messageHex: string): string => {
  return ethers.keccak256(
    ethers.solidityPacked(['string', 'bytes32'],
      ['\x19Ethereum Signed Message:\n32', messageHex]))
}

const signMessage = async (user: User, message: string): Promise<string> => {
  const hash = (message: string): string => {
    return ethers.keccak256(ethers.toUtf8Bytes(message))
  }
  const toSign = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32', 'bytes32'],
      [hash(user.idType), hash(user.account), message]
    )
  )
  const signature = await signWithKmsKey(
    defaultSignerConfig(),
    toEthSignedMessageHash(toSign)
  ) as string
  return signature
}

export const validateOtp = async (
  request: ValidateOtpRequest
): Promise<ValidateOtpResponse> => {
  if (request.user.idType === 'mailto') {
    await checkEmailOtp(request.user, request.code)
  } else if (request.user.idType === 'tel') {
    await checkSmsOtp(request.user, request.code)
  } else {
    throw new CustomError(-32502, 'invalid id type')
  }
  const signature = await signMessage(request.user, request.message)
  return { success: true, signature }
}

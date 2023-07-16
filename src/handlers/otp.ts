import Mailgun from 'mailgun.js'
import formData from 'form-data'
import { Twilio } from 'twilio'
import { type User } from '../utils/types'

interface EmailData {
  [key: string]: string
  from: string
  to: string
  subject: string
  text: string
  html: string
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

export const sendSms = async (receiver: string, data: string): Promise<void> => {
  const twilioClient = new Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )
  await twilioClient.messages.create({
    messagingServiceSid: process.env.TWILIO_MG_SERVICE_SID,
    body: data,
    to: receiver
  })
}

export const genAndSendOtp = async (user: User): Promise<boolean> => {
  throw new Error('Not implemented')
}

export const validateOtpAndSign = async (
  user: User,
  otp: string
): Promise<{ signer: string, signature: string }> => {
  throw new Error('Not implemented')
}

import Mailgun from "mailgun.js";
import formData from "form-data";
import {Twilio} from "twilio";
import {parsePhoneNumber, isValidPhoneNumber} from "libphonenumber-js";

import {
    buildAuthenticationNotification,
    buildNewTransferNotification,
    buildNotifyTransferSmsMessage,
} from "./notification";
import { User } from "../utils/types";

interface EmailData {
    [key: string]: string;
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
}

const sendEmail = async (data: EmailData) => {
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
        username: "api",
        key: process.env.MAILGUN_API_KEY!,
    });
    await mg.messages.create("hexlink.io", data);
};

const sendSms = async (receiver: string, data: string) => {
    const twilioClient = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );
    await twilioClient.messages.create({
        messagingServiceSid: process.env.TWILIO_MG_SERVICE_SID,
        body: data,
        to: receiver,
    });
};

export const genAndSendOtp = async (user: User): Promise<boolean> => {
    throw new Error("Not implemented");
};

export const validateOtpAndSign = async (
    user: User,
    otp: string
): Promise<{signer: string, signature: string}> => {
    throw new Error("Not implemented");
};
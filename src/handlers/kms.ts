import * as kms from '@google-cloud/kms'
import * as asn1 from 'asn1.js'
import * as crypto from 'crypto'
import * as ethers from 'ethers'
import * as crc32c from 'fast-crc32c'
import BN from 'bn.js'
import { Signature } from 'ethers'
import { CustomError } from '../utils/types'

interface KMS_CONFIG {
  projectId: string
  locationId: string
  keyRingId: string
  keyId: string
}

interface SIGNER_CONFIG extends KMS_CONFIG {
  versionId: string
  publicAddress: string
}

export const defaultEncryptorConfig = (): KMS_CONFIG => {
  if (process.env.VITE_FIREBASE_PROJECT_ID === undefined ||
      process.env.GCP_KEY_LOCATION_GLOBAL === undefined) {
    throw new CustomError(-32603, 'kms setup error')
  }
  if (process.env.ENCRYPTOR_KEY_RING_ID === undefined ||
    process.env.ENCRYPTOR_KEY_ID === undefined) {
    throw new CustomError(-32603, 'encryption key error')
  }
  return {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    locationId: process.env.GCP_KEY_LOCATION_GLOBAL,
    keyRingId: process.env.ENCRYPTOR_KEY_RING_ID,
    keyId: process.env.ENCRYPTOR_KEY_ID
  }
}

export const defaultSignerConfig = (): SIGNER_CONFIG => {
  if (process.env.VITE_FIREBASE_PROJECT_ID === undefined ||
    process.env.GCP_KEY_LOCATION_GLOBAL === undefined) {
    throw new CustomError(-32603, 'kms setup error')
  }
  if (process.env.IDENTITY_VERIFIER_OPERATOR_KEY_RING_ID === undefined ||
    process.env.IDENTITY_VERIFIER_OPERATOR_KEY_ID === undefined ||
    process.env.IDENTITY_VERIFIER_OPERATOR_VERSION_ID === undefined ||
    process.env.IDENTITY_VERIFIER_OPERATOR_PUB_ADDR === undefined) {
    throw new CustomError(-32603, 'signing key error')
  }

  return {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    locationId: process.env.GCP_KEY_LOCATION_GLOBAL,
    keyRingId: process.env.IDENTITY_VERIFIER_OPERATOR_KEY_RING_ID,
    keyId: process.env.IDENTITY_VERIFIER_OPERATOR_KEY_ID,
    versionId: process.env.IDENTITY_VERIFIER_OPERATOR_VERSION_ID,
    publicAddress: process.env.IDENTITY_VERIFIER_OPERATOR_PUB_ADDR
  }
}

const MAX_RETRY = 3
const client = new kms.KeyManagementServiceClient()

const getPublicKey = async function (
  versionName: string
): Promise<kms.protos.google.cloud.kms.v1.IPublicKey> {
  const [publicKey] = await client.getPublicKey({
    name: versionName
  })

  if (publicKey.name !== versionName) {
    throw new CustomError(-32603, 'GetPublicKey: request corrupted in-transit')
  }

  if (publicKey.pemCrc32c !== null && publicKey.pemCrc32c !== undefined) {
    if (crc32c.calculate(publicKey.pem ?? '') !== Number(publicKey.pemCrc32c.value)) {
      throw new CustomError(-32603, 'GetPublicKey: response corrupted in-transit')
    }
  }
  return publicKey
}

export const getEthAddressFromPublicKey = async function (
  config: SIGNER_CONFIG
): Promise<string> {
  const versionName = client.cryptoKeyVersionPath(
    config.projectId,
    config.locationId,
    config.keyRingId,
    config.keyId,
    config.versionId
  )
  const publicKey = await getPublicKey(versionName)
  const publicKeyDer = crypto.createPublicKey(publicKey.pem ?? '')
    .export({ format: 'der', type: 'spki' })
  const rawXY = publicKeyDer.subarray(-64)
  const hashXY = ethers.keccak256(rawXY)
  const address = '0x' + hashXY.slice(-40)

  return address
}

function hex (sig: Signature): string {
  return '0x' + sig.r + sig.s + sig.v.toString(16)
}

/* eslint-disable */
const EcdsaSigAsnParse: {
    decode: (asnStringBuffer: Buffer, format: "der") => { r: BN; s: BN };
} = asn1.define("EcdsaSig", function (this: any) {
    this.seq().obj(this.key("r").int(), this.key("s").int());
});

export const signWithKmsKey = async function (
    signer: SIGNER_CONFIG,
    message: string,
    returnHex = true
): Promise<Signature | string> {
    const digestBuffer = Buffer.from(ethers.getBytes(message));
    const address = signer.publicAddress!;

    let signature = await getKmsSignature(signer, digestBuffer);
    let [r, s] = await calculateRS(signature as Buffer);

    let retry = 0;
    while (shouldRetrySigning(r, s, retry)) {
        signature = await getKmsSignature(signer, digestBuffer);
        [r, s] = await calculateRS(signature as Buffer);
        retry += 1;
    }
    const sig = Signature.from({
        r: r.toString("hex"),
        s: s.toString("hex"),
        v: calculateRecoveryParam(digestBuffer, r, s, address)
    })
    return returnHex ? hex(sig) : sig;
};

const shouldRetrySigning = function (r: BN, s: BN, retry: number) {
    return (
        r.toString("hex").length % 2 == 1
            || s.toString("hex").length % 2 == 1
    ) && (retry < MAX_RETRY);
}

const getKmsSignature = async function (signer: SIGNER_CONFIG, digestBuffer: Buffer) {
    const digestCrc32c = crc32c.calculate(digestBuffer);
    const versionName = client.cryptoKeyVersionPath(
        signer.projectId,
        signer.locationId,
        signer.keyRingId,
        signer.keyId,
        signer.versionId
      )

    const [signResponse] = await client.asymmetricSign({
        name: versionName,
        digest: {
            sha256: digestBuffer,
        },
        digestCrc32c: {
            value: digestCrc32c,
        },
    });

    if (signResponse.name !== versionName) {
        throw new Error("AsymmetricSign: request corrupted in-transit");
    }
    if (!signResponse.verifiedDigestCrc32c) {
        throw new Error("AsymmetricSign: request corrupted in-transit");
    }
    if (!signResponse.signature || !signResponse.signatureCrc32c ||
        crc32c.calculate(<string>signResponse.signature) !==
        Number(signResponse.signatureCrc32c.value)
    ) {
        throw new Error("AsymmetricSign: response corrupted in-transit");
    }

    return Buffer.from(signResponse.signature);
};

const calculateRS = async function (signature: Buffer) {
    const decoded = EcdsaSigAsnParse.decode(signature, "der");
    const { r, s } = decoded;

    const secp256k1N = new BN.BN(
        "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
        16
    );
    const secp256k1halfN = secp256k1N.div(new BN.BN(2));

    return [r, s.gt(secp256k1halfN) ? secp256k1N.sub(s) : s];
};

const calculateRecoveryParam = (
    msg: Buffer,
    r: BN,
    s: BN,
    address: string
): 27 | 28 => {
    let v: 0 | 1;
    for (v = 0; v <= 1; v++) {
        const recoveredEthAddr = ethers.recoverAddress(
            `0x${msg.toString("hex")}`,
            {
                r: `0x${r.toString("hex")}`,
                s: `0x${s.toString("hex")}`,
                v,
            }
        ).toLowerCase();

        if (recoveredEthAddr != address.toLowerCase()) {
            continue;
        }
        return v == 0 ? 27 : 28
    }

    throw new Error("Failed to calculate recovery param");
};


const getSymmKeyName = async function (encryptor: KMS_CONFIG) {
    return client.cryptoKeyPath(
        encryptor.projectId,
        encryptor.locationId,
        encryptor.keyRingId,
        encryptor.keyId
    );
};

export const encryptWithSymmKey = async function (
    encryptor: KMS_CONFIG,
    plaintext: string
) {
    const plaintextBuffer = Buffer.from(plaintext);
    const keyName = await getSymmKeyName(encryptor);
    const plaintextCrc32c = crc32c.calculate(plaintextBuffer);

    const [encryptResponse] = await client.encrypt({
        name: keyName,
        plaintext: plaintextBuffer,
        plaintextCrc32c: {
            value: plaintextCrc32c,
        },
    });

    const ciphertext = encryptResponse.ciphertext;
    if (!ciphertext || !encryptResponse.verifiedPlaintextCrc32c ||
        !encryptResponse.ciphertextCrc32c ||
        crc32c.calculate(Buffer.from(ciphertext)) !==
        Number(encryptResponse.ciphertextCrc32c!.value)) {
        throw new Error("Encrypt: request corrupted in-transit");
    }

    const encode = Buffer.from(ciphertext).toString("base64");
    return encode;
};

export const decryptWithSymmKey = async function (
    encryptor: KMS_CONFIG,
    text: string
) {
    const ciphertext = Buffer.from(text, "base64");
    const keyName = await getSymmKeyName(encryptor);
    const ciphertextCrc32c = crc32c.calculate(ciphertext);

    const [decryptResponse] = await client.decrypt({
        name: keyName,
        ciphertext: ciphertext,
        ciphertextCrc32c: {
            value: ciphertextCrc32c,
        },
    });
    const plaintextBuffer = Buffer.from(decryptResponse.plaintext!);

    if (crc32c.calculate(plaintextBuffer) !==
        Number(decryptResponse.plaintextCrc32c!.value)) {
        throw new Error("Decrypt: response corrupted in-transit");
    }

    return plaintextBuffer.toString("utf8");
};
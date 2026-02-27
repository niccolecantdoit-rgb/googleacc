import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENCRYPTION_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const keyRaw = process.env.ENCRYPTION_KEY?.trim();

  if (!keyRaw) {
    throw new Error("ENCRYPTION_KEY is required for sensitive field encryption.");
  }

  const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Pattern.test(keyRaw)) {
    throw new Error("ENCRYPTION_KEY must be a valid base64 string.");
  }

  const key = Buffer.from(keyRaw, "base64");

  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (base64).");
  }

  return key;
}

export function encryptString(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptString(encryptedPayload: string): string {
  const [version, ivRaw, authTagRaw, cipherRaw] = encryptedPayload.split(":");

  if (version !== ENCRYPTION_VERSION || !ivRaw || !authTagRaw || !cipherRaw) {
    throw new Error("Invalid encrypted payload format.");
  }

  try {
    const iv = Buffer.from(ivRaw, "base64url");
    const authTag = Buffer.from(authTagRaw, "base64url");
    const cipherText = Buffer.from(cipherRaw, "base64url");

    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    throw new Error("Failed to decrypt payload. The data or key may be invalid.");
  }
}

export function normalizeSearchEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeSearchPhone(phone: string): string {
  return phone.replace(/\D+/g, "");
}

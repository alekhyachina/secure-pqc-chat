import { MlKem512 } from 'crystals-kyber-js';

// --- HELPER FUNCTIONS ---
const fromHex = (hexString) => 
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const toHex = (bytes) => 
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

// --- 1. ENCRYPT (Sender) ---
export async function encryptMessage(recipientPubKeyHex, messageText) {
  try {
    const pubKeyBytes = fromHex(recipientPubKeyHex);

    // FIX: Use MlKem512 instance and 'encap' method
    const sender = new MlKem512();
    const [ciphertext, sharedSecret] = await sender.encap(pubKeyBytes);

    // AES Encryption (Standard)
    const aesKey = await window.crypto.subtle.importKey(
        "raw", sharedSecret, "AES-GCM", false, ["encrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMsg = new TextEncoder().encode(messageText);

    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv }, aesKey, encodedMsg
    );

    return {
        kemCiphertext: toHex(ciphertext),
        aesIv: toHex(iv),
        encryptedMessage: toHex(new Uint8Array(encryptedContent))
    };
  } catch (err) {
    console.error("Encryption Failed:", err);
    throw new Error("PQC Encryption failed. Check keys.");
  }
}

// --- 2. DECRYPT (Receiver) ---
export async function decryptMessage(payload, myPrivateKeyHex) {
  try {
    const { kemCiphertext, aesIv, encryptedMessage } = payload;
    const privKeyBytes = fromHex(myPrivateKeyHex);
    const ciphertextBytes = fromHex(kemCiphertext);

    // FIX: Use MlKem512 instance and 'decap' method
    const recipient = new MlKem512();
    const sharedSecret = await recipient.decap(ciphertextBytes, privKeyBytes);

    // AES Decryption (Standard)
    const aesKey = await window.crypto.subtle.importKey(
        "raw", sharedSecret, "AES-GCM", false, ["decrypt"]
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromHex(aesIv) },
        aesKey,
        fromHex(encryptedMessage)
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption Failed:", err);
    throw err;
  }
}
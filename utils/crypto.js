import { MlKem512 } from 'crystals-kyber-js';

// --- HELPER FUNCTIONS ---
const fromHex = (hexString) => {
  const hex = typeof hexString === 'string' ? hexString.replace(/\s/g, '') : '';
  if (!hex || hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
    throw new Error('Invalid hex string');
  }
  return new Uint8Array(hex.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
};

const toHex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

// --- 1. ENCRYPT (Sender) ---
// ML-KEM-512 encapsulation against the recipient's public key derives a
// shared secret, which is used as an AES-256-GCM key for the message body.
export async function encryptMessage(recipientPubKeyHex, messageText) {
  try {
    const pubKeyBytes = fromHex(recipientPubKeyHex);

    const sender = new MlKem512();
    const [ciphertext, sharedSecret] = await sender.encap(pubKeyBytes);

    const aesKey = await window.crypto.subtle.importKey(
      'raw', sharedSecret, 'AES-GCM', false, ['encrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMsg = new TextEncoder().encode(messageText);

    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, aesKey, encodedMsg
    );

    return {
      kemCiphertext: toHex(ciphertext),
      aesIv: toHex(iv),
      encryptedMessage: toHex(new Uint8Array(encryptedContent)),
    };
  } catch (err) {
    console.error('Encryption Failed:', err);
    throw new Error('PQC Encryption failed. Check keys.');
  }
}

// --- 2. DECRYPT (Receiver) ---
export async function decryptMessage(payload, myPrivateKeyHex) {
  const { kemCiphertext, aesIv, encryptedMessage } = payload ?? {};
  if (!kemCiphertext || !aesIv || !encryptedMessage) {
    throw new Error('Malformed message payload');
  }

  const privKeyBytes = fromHex(myPrivateKeyHex);
  const ciphertextBytes = fromHex(kemCiphertext);

  const recipient = new MlKem512();
  const sharedSecret = await recipient.decap(ciphertextBytes, privKeyBytes);

  const aesKey = await window.crypto.subtle.importKey(
    'raw', sharedSecret, 'AES-GCM', false, ['decrypt']
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromHex(aesIv) },
    aesKey,
    fromHex(encryptedMessage)
  );

  return new TextDecoder().decode(decryptedBuffer);
}

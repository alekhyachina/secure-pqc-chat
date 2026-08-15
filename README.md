# secure-pqc-chat

A post-quantum end-to-end encrypted chat application built with Next.js (Pages Router).

- **Key generation** runs in the browser: `keygen.c` (liboqs, Kyber-512) compiled to WebAssembly with Emscripten (`public/wasm_keygen.{js,wasm}`).
- **Message encryption** is done client-side with ML-KEM-512 key encapsulation (`crystals-kyber-js`) plus AES-256-GCM (Web Crypto API). Private keys never leave the browser.
- **Transport** is Socket.IO, authenticated with the login JWT. The server only relays ciphertext.
- **Storage** is MongoDB (users, bcrypt-hashed passwords, PQC public keys).

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables — copy `.env.example` to `.env.local` and set:

   | Variable      | Purpose                                          |
   | ------------- | ------------------------------------------------ |
   | `MONGODB_URI` | MongoDB connection string (local or Atlas)       |
   | `JWT_SECRET`  | Long random string used to sign session tokens   |

3. Run the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Usage workflow

1. Visit `/keygen` and generate a Kyber-512 key pair. Save both hex strings; the private key is shown only once and is never sent to the server.
2. Register at `/register` with a username, password, and your **public** key.
3. Log in at `/`, then paste your **private** key on the chat screen to enable decryption.
4. Enter a recipient username and send messages. Messages are encrypted to the recipient's public key before leaving your browser and are relayed live to the recipient if they are online.

## Rebuilding the WASM key generator

The compiled artifacts are committed under `public/`. To rebuild from `keygen.c` you need [emsdk](https://emscripten.org/) and [liboqs](https://github.com/open-quantum-safe/liboqs) built for Emscripten:

```bash
emcc keygen.c -I liboqs/build/include -L liboqs/build/lib -loqs \
  -s EXPORTED_FUNCTIONS='["_generate_kyber_keys","_get_pubkey_size","_get_privkey_size","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["HEAPU8"]' \
  -o public/wasm_keygen.js
```

Note: liboqs removed round-3 Kyber (`OQS_KEM_alg_kyber_512`) in v0.13 — rebuilding requires liboqs ≤ 0.12 or porting `keygen.c` to `OQS_KEM_alg_ml_kem_512`.

## Scripts

- `npm run dev` — development server (webpack, required by the custom WASM config)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint

## Deployment note

The Socket.IO server is attached to the Next.js HTTP server via `pages/api/socket.js` and requires a long-lived Node process (`npm run build && npm run start`). It will not work on serverless platforms such as Vercel.

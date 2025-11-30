#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <oqs/oqs.h>
#include <emscripten.h> 

// 1. Function to Generate Keys (Called from JS)
EMSCRIPTEN_KEEPALIVE
void generate_kyber_keys(uint8_t *public_key, uint8_t *secret_key) {
    // Initialize Kyber-512
    OQS_KEM *kem = OQS_KEM_new(OQS_KEM_alg_kyber_512);
    if (kem == NULL) return;

    // Generate keys directly into the memory JavaScript gave us
    OQS_KEM_keypair(kem, public_key, secret_key);

    // Cleanup
    OQS_KEM_free(kem);
}

// 2. Helper: Tell JS the Public Key size is 800 bytes
EMSCRIPTEN_KEEPALIVE
int get_pubkey_size() {
    return 800; 
}

// 3. Helper: Tell JS the Private Key size is 1632 bytes
EMSCRIPTEN_KEEPALIVE
int get_privkey_size() {
    return 1632; 
}
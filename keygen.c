#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <oqs/oqs.h>

// Helper function to print bytes as Hex String
void print_hex(const uint8_t *bytes, size_t len, const char *label) {
    printf("%s: ", label);
    for (size_t i = 0; i < len; i++) {
        printf("%02X", bytes[i]);
    }
    printf("\n\n");
}

int main() {
    // 1. Initialize the library and check for Kyber-512
    if (OQS_KEM_alg_is_enabled(OQS_KEM_alg_kyber_512) == 0) {
        printf("Error: Kyber-512 is not enabled in this build.\n");
        return 1;
    }

    // 2. Create the KEM context
    OQS_KEM *kem = OQS_KEM_new(OQS_KEM_alg_kyber_512);
    if (kem == NULL) {
        printf("Error: Failed to initialize KEM.\n");
        return 1;
    }

    // 3. Allocate memory for keys
    uint8_t *public_key = malloc(kem->length_public_key);
    uint8_t *secret_key = malloc(kem->length_secret_key);

    // 4. Generate Keypair
    if (OQS_KEM_keypair(kem, public_key, secret_key) != OQS_SUCCESS) {
        printf("Error: Key generation failed.\n");
        return 1;
    }

    // 5. Print the keys (Copy these!)
    printf("=== COPY THESE KEYS FOR YOUR ASSIGNMENT ===\n");
    print_hex(public_key, kem->length_public_key, "PUBLIC_KEY");
    print_hex(secret_key, kem->length_secret_key, "SECRET_KEY");

    // Cleanup
    OQS_KEM_free(kem);
    free(public_key);
    free(secret_key);

    return 0;
}
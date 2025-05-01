#!/bin/bash

# Pfade
ENV_FILE=".env"
PRIVATE_KEY_FILE="jwt_private.key"
PUBLIC_KEY_FILE="jwt_public.key"

# Generiere Private Key (RSA 4096)
openssl genpkey -algorithm RSA -out "$PRIVATE_KEY_FILE" -pkeyopt rsa_keygen_bits:4096

# Extrahiere Public Key
openssl rsa -in "$PRIVATE_KEY_FILE" -pubout -out "$PUBLIC_KEY_FILE"

# Escape \n für .env
ESCAPED_PRIVATE_KEY=$(awk '{printf "%s\\n", $0}' "$PRIVATE_KEY_FILE")
ESCAPED_PUBLIC_KEY=$(awk '{printf "%s\\n", $0}' "$PUBLIC_KEY_FILE")

# Füge in .env ein (vorher alte Einträge entfernen)
grep -v '^JWT_PRIVATE_KEY=' "$ENV_FILE" 2>/dev/null | grep -v '^JWT_PUBLIC_KEY=' > "${ENV_FILE}.tmp" || true
echo "JWT_PRIVATE_KEY=\"$ESCAPED_PRIVATE_KEY\"" >> "${ENV_FILE}.tmp"
echo "JWT_PUBLIC_KEY=\"$ESCAPED_PUBLIC_KEY\"" >> "${ENV_FILE}.tmp"
mv "${ENV_FILE}.tmp" "$ENV_FILE"

echo "✅ Keys generiert und in .env gespeichert"

#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="certs"
CA_KEY="${CERT_DIR}/ventry-local-ca-key.pem"
CA_CERT="${CERT_DIR}/ventry-local-ca.pem"
CERT_KEY="${CERT_DIR}/dev-local-key.pem"
CERT="${CERT_DIR}/dev-local.pem"
CSR="${CERT_DIR}/dev-local.csr"
CONFIG="${CERT_DIR}/dev-local.openssl.cnf"

GENERATE_CA=0
FORCE=0

usage() {
  cat <<'EOF'
Usage: bash scripts/generate-local-certs.sh [options]

Generates a local HTTPS certificate for:
  - local.dev
  - ventry.localhost
  - localhost
  - 127.0.0.1
  - ::1

Options:
  --ca       Generate the local CA before generating the server certificate.
             Required the first time unless certs/ventry-local-ca*.pem already exist.
  --force    Overwrite existing CA and/or server certificate files.
  --help     Show this help.

After generating a CA, trust certs/ventry-local-ca.pem in your OS/browser trust store.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ca)
      GENERATE_CA=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

mkdir -p "$CERT_DIR"

ensure_writable_target() {
  local file="$1"

  if [[ -e "$file" && "$FORCE" -ne 1 ]]; then
    echo "Refusing to overwrite $file. Pass --force to replace it." >&2
    exit 1
  fi
}

pair_exists() {
  [[ -f "$1" && -f "$2" ]]
}

if [[ "$GENERATE_CA" -eq 1 ]]; then
  if pair_exists "$CA_KEY" "$CA_CERT" && [[ "$FORCE" -ne 1 ]]; then
    echo "Reusing existing local CA:"
    echo "  $CA_CERT"
  else
    ensure_writable_target "$CA_KEY"
    ensure_writable_target "$CA_CERT"

    openssl genrsa -out "$CA_KEY" 4096
    openssl req \
      -x509 \
      -new \
      -nodes \
      -key "$CA_KEY" \
      -sha256 \
      -days 3650 \
      -out "$CA_CERT" \
      -subj "/CN=Ventry Local Development CA" \
      -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
      -addext "keyUsage=critical,keyCertSign,cRLSign" \
      -addext "subjectKeyIdentifier=hash"

    chmod 600 "$CA_KEY"
    chmod 644 "$CA_CERT"
  fi
fi

if [[ ! -f "$CA_KEY" || ! -f "$CA_CERT" ]]; then
  echo "Missing local CA files." >&2
  echo "Run: bash scripts/generate-local-certs.sh --ca" >&2
  exit 1
fi

if pair_exists "$CERT_KEY" "$CERT" && [[ "$FORCE" -ne 1 ]]; then
  echo "Reusing existing local server certificate:"
  echo "  $CERT"
  echo "  $CERT_KEY"
  echo
  echo "Certificate SANs:"
  openssl x509 -in "$CERT" -noout -ext subjectAltName
  exit 0
fi

ensure_writable_target "$CERT_KEY"
ensure_writable_target "$CERT"

cat > "$CONFIG" <<'EOF'
[req]
distinguished_name = dn
prompt = no
req_extensions = v3_req

[dn]
CN = local.dev

[v3_req]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = local.dev
DNS.2 = ventry.localhost
DNS.3 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

openssl genrsa -out "$CERT_KEY" 2048
openssl req -new -key "$CERT_KEY" -out "$CSR" -config "$CONFIG"
openssl x509 \
  -req \
  -in "$CSR" \
  -CA "$CA_CERT" \
  -CAkey "$CA_KEY" \
  -set_serial "0x$(openssl rand -hex 16)" \
  -out "$CERT" \
  -days 825 \
  -sha256 \
  -extfile "$CONFIG" \
  -extensions v3_req

rm -f "$CSR" "$CONFIG"
chmod 600 "$CERT_KEY"
chmod 644 "$CERT"

echo "Generated:"
echo "  $CERT"
echo "  $CERT_KEY"
echo
echo "Certificate SANs:"
openssl x509 -in "$CERT" -noout -ext subjectAltName

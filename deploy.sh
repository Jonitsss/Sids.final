#!/usr/bin/env bash
# =============================================================================
# SIDS · Deploy script
# =============================================================================
# Despliega Cloud Functions a Firebase y/o asigna el rol del primer pastor.
#
# IMPORTANTE: este script NO puede hacer `firebase login` ni descargar la
# service account key — esos pasos requieren TU navegador y TU cuenta.
# El script asume que ya están hechos y te lleva del "tengo las credenciales
# en mi máquina" hasta "functions deployadas y primer pastor asignado".
#
# Uso:
#   ./deploy.sh                                    # flujo completo
#   ./deploy.sh --deploy-only                      # solo deploy de functions
#   ./deploy.sh --set-rol --email juan@sids.org    # solo asignar rol
#   ./deploy.sh --key /ruta/sa.json                # ruta custom a la key
# =============================================================================

set -euo pipefail

# ------------------------- Config -------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_DIR="$SCRIPT_DIR/functions"
KEY_PATH="${HOME}/keys/sids-sa.json"
EMAIL=""
PROJECT_ID=""
DO_DEPLOY=true
DO_SET_ROL=false
SKIP_BUILD=false
FUNCTIONS_REGION="southamerica-east1"

# ------------------------- Colores -----------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
ok()      { echo -e "${GREEN}✔${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
err()     { echo -e "${RED}✗${NC}  $*" >&2; }
section() { echo -e "\n${BLUE}━━━ $* ━━━${NC}"; }

# ------------------------- Parse args ---------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)            KEY_PATH="$2"; shift 2 ;;
    --email)          EMAIL="$2"; shift 2 ;;
    --project)        PROJECT_ID="$2"; shift 2 ;;
    --deploy-only)    DO_DEPLOY=true;  DO_SET_ROL=false; shift ;;
    --set-rol)        DO_DEPLOY=false; DO_SET_ROL=true;  shift ;;
    --skip-build)     SKIP_BUILD=true; shift ;;
    --help|-h)        sed -n '2,20p' "$0"; exit 0 ;;
    *)                err "Argumento desconocido: $1"; exit 1 ;;
  esac
done

# ------------------------- Helpers -----------------------------------------
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Falta el comando '$1'. Instalalo antes de continuar."
    case "$1" in
      firebase)
        echo -e "  ${YELLOW}npm install -g firebase-tools${NC}"
        echo -e "  ${YELLOW}brew install firebase-cli${NC}  (macOS con Homebrew)"
        ;;
      node)
        echo -e "  Instalá Node.js 20+ desde https://nodejs.org/"
        ;;
    esac
    exit 1
  fi
}

require_file() {
  if [[ ! -f "$1" ]]; then
    err "No existe: $1"
    return 1
  fi
}

# ------------------------- Prereqs -----------------------------------------
section "Verificando requisitos"
require_cmd node
ok "node $(node --version)"

require_cmd npm
ok "npm $(npm --version)"

require_cmd firebase
FB_VERSION=$(firebase --version)
ok "firebase CLI $FB_VERSION"

# ------------------------- Auth --------------------------------------------
section "Verificando login de Firebase"
if ! firebase projects:list >/dev/null 2>&1; then
  err "No estás logueado en Firebase."
  echo -e "  ${YELLOW}Corré:  firebase login${NC}"
  echo "  (te abre el navegador para autorizar con tu cuenta de Google)"
  exit 1
fi
ok "Sesión de Firebase activa"

# ------------------------- Project ------------------------------------------
section "Proyecto activo"
if [[ -n "$PROJECT_ID" ]]; then
  firebase use "$PROJECT_ID"
elif [[ -f "$SCRIPT_DIR/.firebaserc" ]]; then
    CURRENT=$(firebase use 2>/dev/null | tr -d '[:space:]' || true)
    if [[ -n "$CURRENT" ]]; then
      ok "Proyecto: $CURRENT (desde .firebaserc)"
    else
      warn "No hay proyecto fijado. Pasá --project <id> o corré 'firebase use --add'."
      exit 1
    fi
else
  err "No hay .firebaserc ni --project. Corré: firebase use --add"
  exit 1
fi

# ------------------------- Service account key -----------------------------
section "Service account key"
if [[ ! -f "$KEY_PATH" ]]; then
  err "No se encuentra la key en: $KEY_PATH"
  echo
  echo "  Pasos para obtenerla:"
  echo "  1. Abrí https://console.firebase.google.com/  →  tu proyecto"
  echo "  2. ⚙ Project settings  →  pestaña 'Service accounts'"
  echo "  3. Click en 'Generate new private key'"
  echo "  4. Guardá el .json FUERA del repo (ej: ~/keys/sids-sa.json)"
  echo "  5. Volvé a correr este script con:  ./deploy.sh --key /ruta/al.json"
  exit 1
fi

# Sanity check: que parezca una key válida
if ! grep -q '"private_key"' "$KEY_PATH" 2>/dev/null; then
  err "El archivo $KEY_PATH no parece una service account key válida."
  exit 1
fi
ok "Key encontrada: $KEY_PATH"
warn "Mantené este archivo fuera del repo. serviceAccountKey.json está en .gitignore."

export GOOGLE_APPLICATION_CREDENTIALS="$KEY_PATH"

# ------------------------- Deploy -------------------------------------------
if $DO_DEPLOY; then
  section "Desplegando Cloud Functions (región: $FUNCTIONS_REGION)"

  cd "$FUNCTIONS_DIR"

  if [[ ! -d node_modules ]]; then
    info "Instalando dependencias de functions/ ..."
    npm install
  else
    ok "node_modules de functions/ ya existe"
  fi

  if $SKIP_BUILD; then
    warn "Saltando build (--skip-build)"
  else
    info "Compilando TypeScript ..."
    npm run build
  fi

  info "Desplegando ..."
  firebase deploy --only functions

  ok "Functions desplegadas:"
  echo -e "  ${GREEN}borrarDocumento${NC}  → callable"
  echo -e "  ${GREEN}setRolUsuario${NC}    → callable"
  echo
  warn "ANOTÁ: el custom claim tarda hasta ~1h en propagarse al idToken."
  warn "Para forzarlo YA: el usuario debe cerrar sesión y volver a entrar."

  cd "$SCRIPT_DIR"
fi

# ------------------------- Set initial rol ---------------------------------
if $DO_SET_ROL; then
  section "Asignar rol al primer pastor/administrador"

  if [[ -z "$EMAIL" ]]; then
    err "Falta --email. Uso: ./deploy.sh --set-rol --email juan@sids.org"
    exit 1
  fi

  cd "$FUNCTIONS_DIR"

  info "Asignando rol a: $EMAIL"
  npx ts-node src/scripts/setInitialRol.ts "$EMAIL" "pastor" "$KEY_PATH"

  ok "Listo. El usuario $EMAIL ya tiene el custom claim en Firebase Auth"
  echo -e "  ${YELLOW}IMPORTANTE${NC}: pedirle que cierre sesión y vuelva a entrar"
  echo -e "  en la app para que el idToken incluya el claim nuevo."

  cd "$SCRIPT_DIR"
fi

# ------------------------- Resumen -----------------------------------------
section "Resumen"
if $DO_DEPLOY; then
  ok "Functions deployadas en $FUNCTIONS_REGION"
  echo "  Próximo: ./deploy.sh --set-rol --email <tu@email> pastor"
fi
if $DO_SET_ROL; then
  ok "Rol asignado a $EMAIL"
  echo "  Próximo: re-login en la app y probar un delete"
fi
echo
ok "Listo."

#!/usr/bin/env bash
# MailPanel - Instalador principal
# Uso: sudo bash install.sh --domain mail.tudominio.com --email admin@tudominio.com
set -euo pipefail

# ─── Colores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
BOLD='\033[1m'; NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Argumentos ────────────────────────────────────────────────────────────────
MAIL_DOMAIN=""
ADMIN_EMAIL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) MAIL_DOMAIN="$2"; shift 2 ;;
    --email)  ADMIN_EMAIL="$2"; shift 2 ;;
    *) error "Argumento desconocido: $1" ;;
  esac
done

[[ -z "$MAIL_DOMAIN" ]] && error "Usa: $0 --domain mail.tudominio.com --email admin@tudominio.com"
[[ -z "$ADMIN_EMAIL" ]] && error "Usa: $0 --domain mail.tudominio.com --email admin@tudominio.com"
[[ "$(id -u)" != "0" ]]  && error "Este script debe ejecutarse como root (sudo)"

SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "\n${BOLD}═══════════════════════════════════════${NC}"
echo -e "${BOLD}   MailPanel - Instalación automática${NC}"
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo -e " Dominio:    ${GREEN}$MAIL_DOMAIN${NC}"
echo -e " Email:      ${GREEN}$ADMIN_EMAIL${NC}"
echo -e " IP del VPS: ${GREEN}$SERVER_IP${NC}"
echo -e "${BOLD}═══════════════════════════════════════${NC}\n"

read -rp "¿Continuar con la instalación? [s/N] " confirm
[[ "$confirm" != "s" && "$confirm" != "S" ]] && exit 0

# ─── Sistema ───────────────────────────────────────────────────────────────────
info "Actualizando paquetes del sistema..."
apt-get update -qq
apt-get upgrade -y -qq

info "Instalando dependencias del sistema..."
apt-get install -y -qq \
  postfix postfix-mysql \
  dovecot-core dovecot-imapd dovecot-pop3d dovecot-lmtpd dovecot-mysql \
  rspamd redis-server \
  opendkim opendkim-tools \
  opendmarc \
  nginx certbot python3-certbot-nginx \
  fail2ban \
  postgresql postgresql-contrib \
  python3 python3-pip python3-venv \
  doveadm \
  curl wget git unzip \
  mailutils

ok "Dependencias instaladas"

# ─── Usuario vmail ─────────────────────────────────────────────────────────────
info "Creando usuario vmail..."
if ! id vmail &>/dev/null; then
  groupadd -g 5000 vmail
  useradd -g vmail -u 5000 vmail -d /var/mail/vhosts -s /usr/sbin/nologin
fi
mkdir -p /var/mail/vhosts
chown -R vmail:vmail /var/mail/vhosts
chmod 750 /var/mail/vhosts
ok "Usuario vmail creado (UID 5000)"

# ─── PostgreSQL ────────────────────────────────────────────────────────────────
info "Configurando PostgreSQL..."
DB_PASS=$(openssl rand -base64 32 | tr -d '/+=')
sudo -u postgres psql -c "CREATE USER mailpanel WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
  sudo -u postgres psql -c "ALTER USER mailpanel WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE mailpanel OWNER mailpanel;" 2>/dev/null || true
ok "Base de datos PostgreSQL configurada"

# ─── Postfix ───────────────────────────────────────────────────────────────────
info "Configurando Postfix..."
bash "$SCRIPT_DIR/configure_postfix.sh" "$MAIL_DOMAIN" "$SERVER_IP"
ok "Postfix configurado"

# ─── Dovecot ───────────────────────────────────────────────────────────────────
info "Configurando Dovecot..."
bash "$SCRIPT_DIR/configure_dovecot.sh" "$MAIL_DOMAIN"
ok "Dovecot configurado"

# ─── OpenDKIM ──────────────────────────────────────────────────────────────────
info "Configurando OpenDKIM..."
bash "$SCRIPT_DIR/configure_opendkim.sh" "$MAIL_DOMAIN"
ok "OpenDKIM configurado"

# ─── Rspamd ────────────────────────────────────────────────────────────────────
info "Configurando Rspamd..."
bash "$SCRIPT_DIR/configure_rspamd.sh"
ok "Rspamd configurado"

# ─── Fail2ban ──────────────────────────────────────────────────────────────────
info "Configurando Fail2ban..."
cp "$PROJECT_DIR/configs/fail2ban/jail.local" /etc/fail2ban/jail.local
systemctl enable fail2ban
systemctl restart fail2ban
ok "Fail2ban configurado"

# ─── Nginx ────────────────────────────────────────────────────────────────────
info "Configurando Nginx..."
bash "$SCRIPT_DIR/configure_nginx.sh" "$MAIL_DOMAIN"
ok "Nginx configurado"

# ─── SSL con Certbot ───────────────────────────────────────────────────────────
info "Obteniendo certificado SSL con Let's Encrypt..."
certbot --nginx -d "$MAIL_DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect
ok "SSL configurado"

# ─── Backend Django ────────────────────────────────────────────────────────────
info "Instalando backend Django..."
cd "$PROJECT_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -q -r requirements.txt

# Generar .env
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
cat > .env <<EOF
SECRET_KEY=$SECRET_KEY
DEBUG=False
ALLOWED_HOSTS=$MAIL_DOMAIN,localhost
DB_ENGINE=django.db.backends.postgresql
DB_NAME=mailpanel
DB_USER=mailpanel
DB_PASSWORD=$DB_PASS
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
MAIL_VHOST_DIR=/var/mail/vhosts
DKIM_KEY_DIR=/etc/opendkim/keys
CORS_ALLOWED_ORIGINS=https://$MAIL_DOMAIN
EOF

python3 manage.py migrate --noinput
python3 manage.py collectstatic --noinput

# Crear superusuario desde variable
DJANGO_SUPERUSER_PASSWORD=$(openssl rand -base64 16)
python3 manage.py createsuperuser --noinput \
  --username admin --email "$ADMIN_EMAIL" 2>/dev/null || true
echo ""
echo -e "${YELLOW}Contraseña del admin: ${BOLD}$DJANGO_SUPERUSER_PASSWORD${NC}"
echo "(cambiala inmediatamente en /admin)"

deactivate
ok "Backend Django instalado"

# ─── Frontend React ───────────────────────────────────────────────────────────
info "Construyendo frontend React..."
cd "$PROJECT_DIR/frontend"
if command -v npm &>/dev/null; then
  npm install --silent
  npm run build --silent
  ok "Frontend construido"
else
  warn "npm no encontrado, saltando build del frontend. Instala Node.js manualmente."
fi

# ─── Gunicorn como servicio ───────────────────────────────────────────────────
info "Configurando Gunicorn como servicio systemd..."
cat > /etc/systemd/system/mailpanel.service <<EOF
[Unit]
Description=MailPanel Django Backend
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR/backend
Environment="PATH=$PROJECT_DIR/backend/venv/bin"
ExecStart=$PROJECT_DIR/backend/venv/bin/gunicorn mailpanel.wsgi:application \
  --workers 3 \
  --bind unix:/run/mailpanel.sock \
  --timeout 60 \
  --log-file /var/log/mailpanel/gunicorn.log
Restart=always
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /var/log/mailpanel
chown www-data:www-data /var/log/mailpanel
systemctl daemon-reload
systemctl enable mailpanel
systemctl restart mailpanel
ok "Gunicorn configurado"

# ─── Servicios finales ────────────────────────────────────────────────────────
info "Reiniciando todos los servicios..."
for svc in postfix dovecot rspamd opendkim nginx; do
  systemctl enable "$svc"
  systemctl restart "$svc" && ok "$svc reiniciado" || warn "$svc no pudo reiniciarse"
done

# ─── Resumen ──────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}${BOLD}═══════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}   ✓ Instalación completada!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════${NC}"
echo -e " Panel:    ${BOLD}https://$MAIL_DOMAIN${NC}"
echo -e " Webmail:  ${BOLD}https://$MAIL_DOMAIN/webmail${NC}"
echo -e " SMTP:     ${BOLD}$MAIL_DOMAIN:587${NC} (STARTTLS)"
echo -e " IMAP:     ${BOLD}$MAIL_DOMAIN:993${NC} (SSL)"
echo -e "\n${YELLOW}Registros DNS que debes configurar:${NC}"
echo -e " MX:    $MAIL_DOMAIN → mail.$MAIL_DOMAIN (10)"
echo -e " A:     mail.$MAIL_DOMAIN → $SERVER_IP"
echo -e " PTR:   $SERVER_IP → $MAIL_DOMAIN (en tu proveedor VPS)"
echo -e " SPF:   v=spf1 mx a ip4:$SERVER_IP ~all"
echo -e " DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@$MAIL_DOMAIN"
echo -e "\n${YELLOW}Ejecuta: cat /etc/opendkim/keys/$MAIL_DOMAIN/mail.txt${NC} para obtener tu clave DKIM"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════${NC}\n"

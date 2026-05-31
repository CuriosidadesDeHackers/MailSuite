#!/usr/bin/env bash
# Configura Rspamd como filtro antispam
set -euo pipefail

mkdir -p /etc/rspamd/local.d /etc/rspamd/override.d

# Activar milter para Postfix
cat > /etc/rspamd/local.d/worker-proxy.inc <<'EOF'
bind_socket = "127.0.0.1:11332";
milter = yes;
timeout = 120s;
upstream "local" {
  default = yes;
  self_scan = yes;
}
EOF

# Módulo DKIM signing
cat > /etc/rspamd/local.d/dkim_signing.conf <<'EOF'
enabled = true;
use_domain = "header";
use_redis = false;
path = "/etc/opendkim/keys/$domain/$selector.private";
selector = "mail";
EOF

# Acción por puntuación
cat > /etc/rspamd/local.d/actions.conf <<'EOF'
reject = 15;
add_header = 6;
greylist = 4;
EOF

# ARC
cat > /etc/rspamd/local.d/arc.conf <<'EOF'
enabled = true;
use_domain = "header";
path = "/etc/opendkim/keys/$domain/$selector.private";
selector = "mail";
EOF

# Redis para greylist
cat > /etc/rspamd/local.d/redis.conf <<'EOF'
servers = "127.0.0.1";
EOF

# Contraseña de control web (cambiar en producción)
RSPAM_PASS=$(openssl rand -base64 16)
cat > /etc/rspamd/local.d/worker-controller.inc <<EOF
bind_socket = "127.0.0.1:11334";
password = "$RSPAM_PASS";
EOF

echo "Rspamd configurado. Contraseña del panel: $RSPAM_PASS"

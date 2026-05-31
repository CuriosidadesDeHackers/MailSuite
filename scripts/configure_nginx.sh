#!/usr/bin/env bash
# Configura Nginx como proxy para MailPanel y webmail
set -euo pipefail

MAIL_DOMAIN="${1:?Falta dominio}"

# Deshabilitar default
rm -f /etc/nginx/sites-enabled/default

cat > /etc/nginx/sites-available/mailpanel <<EOF
# HTTP → HTTPS redirect (certbot lo reemplaza con la config final)
server {
    listen 80;
    server_name $MAIL_DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $MAIL_DOMAIN;

    # SSL (Certbot lo rellena)
    ssl_certificate     /etc/letsencrypt/live/$MAIL_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$MAIL_DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Cabeceras de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 50M;

    # Frontend estático (React build)
    root /opt/mailpanel/backend/staticfiles/frontend;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API Django
    location /api/ {
        proxy_pass         http://unix:/run/mailpanel.sock;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    # Archivos estáticos Django
    location /static/ {
        alias /opt/mailpanel/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Rspamd UI
    location /rspamd/ {
        proxy_pass http://127.0.0.1:11334/;
        proxy_set_header Host \$host;
        auth_basic           "Rspamd Admin";
        auth_basic_user_file /etc/nginx/.rspamd_htpasswd;
    }

    # Webmail (Roundcube)
    location /webmail/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/mailpanel /etc/nginx/sites-enabled/mailpanel
nginx -t && echo "Nginx configurado correctamente"

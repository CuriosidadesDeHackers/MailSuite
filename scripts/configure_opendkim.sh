#!/usr/bin/env bash
# Configura OpenDKIM para firma automática
set -euo pipefail

MAIL_DOMAIN="${1:?Falta dominio}"

cat > /etc/opendkim.conf <<EOF
Syslog              yes
SyslogSuccess       yes
LogWhy              yes
UMask               007
Mode                sv
PidFile             /run/opendkim/opendkim.pid
SignatureAlgorithm  rsa-sha256
UserID              opendkim:opendkim
Socket              inet:12301@localhost
Canonicalization    relaxed/simple
KeyTable            /etc/opendkim/KeyTable
SigningTable        refile:/etc/opendkim/SigningTable
ExternalIgnoreList  /etc/opendkim/TrustedHosts
InternalHosts       /etc/opendkim/TrustedHosts
EOF

cat > /etc/opendkim/TrustedHosts <<EOF
127.0.0.1
localhost
$MAIL_DOMAIN
EOF

mkdir -p /etc/opendkim/keys

# Generar clave para el dominio principal
if [[ ! -f "/etc/opendkim/keys/$MAIL_DOMAIN/mail.private" ]]; then
  mkdir -p "/etc/opendkim/keys/$MAIL_DOMAIN"
  opendkim-genkey -b 2048 -d "$MAIL_DOMAIN" -s mail -D "/etc/opendkim/keys/$MAIL_DOMAIN"
fi

chown -R opendkim:opendkim /etc/opendkim/keys
chmod 700 /etc/opendkim/keys
chmod 600 "/etc/opendkim/keys/$MAIL_DOMAIN/mail.private"

cat > /etc/opendkim/KeyTable <<EOF
mail._domainkey.$MAIL_DOMAIN $MAIL_DOMAIN:mail:/etc/opendkim/keys/$MAIL_DOMAIN/mail.private
EOF

cat > /etc/opendkim/SigningTable <<EOF
*@$MAIL_DOMAIN mail._domainkey.$MAIL_DOMAIN
EOF

# Configurar socket en Postfix milter
mkdir -p /var/spool/postfix/opendkim
chown opendkim:postfix /var/spool/postfix/opendkim

echo "OpenDKIM configurado. Clave pública:"
cat "/etc/opendkim/keys/$MAIL_DOMAIN/mail.txt"

#!/usr/bin/env bash
# Configura Postfix para servidor de correo virtual con PostgreSQL
set -euo pipefail

MAIL_DOMAIN="${1:?Falta dominio}"
SERVER_IP="${2:?Falta IP}"
BACKUP_DIR="/etc/postfix/backup_$(date +%Y%m%d_%H%M%S)"

# Backup de configuración existente
mkdir -p "$BACKUP_DIR"
cp -r /etc/postfix/* "$BACKUP_DIR/" 2>/dev/null || true

# main.cf
cat > /etc/postfix/main.cf <<EOF
# ─── Identificación ───────────────────────────────────────────
myhostname = $MAIL_DOMAIN
mydomain = $MAIL_DOMAIN
myorigin = \$myhostname

# ─── Red ──────────────────────────────────────────────────────
inet_interfaces = all
inet_protocols = ipv4
mydestination = localhost
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128

# ─── TLS Recepción ────────────────────────────────────────────
smtpd_tls_cert_file = /etc/letsencrypt/live/$MAIL_DOMAIN/fullchain.pem
smtpd_tls_key_file  = /etc/letsencrypt/live/$MAIL_DOMAIN/privkey.pem
smtpd_tls_security_level = may
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_ciphers = high
smtpd_tls_session_cache_database = btree:\${data_directory}/smtpd_scache
smtpd_tls_loglevel = 1

# ─── TLS Envío ────────────────────────────────────────────────
smtp_tls_security_level = may
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_session_cache_database = btree:\${data_directory}/smtp_scache
smtp_tls_loglevel = 1

# ─── SASL Autenticación ───────────────────────────────────────
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous, noplaintext
smtpd_sasl_tls_security_options = noanonymous
broken_sasl_auth_clients = yes

# ─── Restricciones anti-spam / anti-relay ─────────────────────
smtpd_helo_required = yes
smtpd_helo_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_invalid_helo_hostname,
    reject_non_fqdn_helo_hostname

smtpd_sender_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_non_fqdn_sender,
    reject_unknown_sender_domain

smtpd_recipient_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_non_fqdn_recipient,
    reject_unknown_recipient_domain,
    reject_unauth_destination,
    check_policy_service unix:private/policyd-spf,
    reject_rbl_client zen.spamhaus.org,
    reject_rbl_client bl.spamcop.net

smtpd_relay_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination

# ─── Dominios virtuales ───────────────────────────────────────
virtual_mailbox_domains = pgsql:/etc/postfix/pgsql-virtual-mailbox-domains.cf
virtual_mailbox_maps    = pgsql:/etc/postfix/pgsql-virtual-mailbox-maps.cf
virtual_alias_maps      = pgsql:/etc/postfix/pgsql-virtual-alias-maps.cf
virtual_transport       = lmtp:unix:private/dovecot-lmtp
virtual_mailbox_base    = /var/mail/vhosts
virtual_minimum_uid     = 5000
virtual_uid_maps        = static:5000
virtual_gid_maps        = static:5000

# ─── Milter (DKIM + Rspamd) ────────────────────────────────────
milter_default_action = accept
milter_protocol       = 6
smtpd_milters         = inet:127.0.0.1:11332
non_smtpd_milters     = inet:127.0.0.1:11332

# ─── Otros ────────────────────────────────────────────────────
message_size_limit     = 52428800
mailbox_size_limit     = 0
recipient_delimiter    = +
disable_vrfy_command   = yes
smtp_use_tls           = yes

# ─── SPF Policy ───────────────────────────────────────────────
policy-spf_time_limit = 3600s
EOF

# master.cf: activar submission (587) y smtps (465)
cat > /etc/postfix/master.cf <<'EOF'
smtp       inet  n  -  y  -  -  smtpd
submission inet  n  -  y  -  -  smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_tls_auth_only=yes
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
smtps      inet  n  -  y  -  -  smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
pickup     unix  n  -  y  60  1  pickup
cleanup    unix  n  -  y  -   0  cleanup
qmgr       unix  n  -  n  300 1  qmgr
tlsmgr     unix  -  -  y  1000? 1  tlsmgr
rewrite    unix  -  -  y  -   -  trivial-rewrite
bounce     unix  -  -  y  -   0  bounce
defer      unix  -  -  y  -   0  bounce
trace      unix  -  -  y  -   0  bounce
verify     unix  -  -  y  -   1  verify
flush      unix  n  -  y  1000? 0  flush
proxymap   unix  -  -  n  -   -  proxymap
proxywrite unix  -  -  n  -   1  proxymap
smtp       unix  -  -  y  -   -  smtp
relay      unix  -  -  y  -   -  smtp
showq      unix  n  -  y  -   -  showq
error      unix  -  -  y  -   -  error
retry      unix  -  -  y  -   -  error
discard    unix  -  -  y  -   -  discard
local      unix  -  n  n  -   -  local
virtual    unix  -  n  n  -   -  virtual
lmtp       unix  -  -  y  -   -  lmtp
anvil      unix  -  -  y  -   1  anvil
scache     unix  -  -  y  -   1  scache
postlog    unix-dgram n - n  -   1  postlogd
policyd-spf unix -  n  n  -   0  spawn
  user=policyd-spf argv=/usr/bin/policyd-spf
EOF

# Mapas PostgreSQL para Postfix
DB_PASS=$(grep DB_PASSWORD /opt/mailpanel/backend/.env 2>/dev/null | cut -d= -f2 || echo "CHANGE_ME")

for f in mailbox-domains mailbox-maps alias-maps; do
cat > "/etc/postfix/pgsql-virtual-${f}.cf" <<PGSQL
user     = mailpanel
password = $DB_PASS
hosts    = 127.0.0.1
dbname   = mailpanel
PGSQL
done

cat >> /etc/postfix/pgsql-virtual-mailbox-domains.cf <<'PGSQL'
query = SELECT name FROM apps_domains_domain WHERE name='%s' AND is_active=true
PGSQL

cat >> /etc/postfix/pgsql-virtual-mailbox-maps.cf <<'PGSQL'
query = SELECT CONCAT(d.name, '/', m.local_part, '/') FROM apps_mailboxes_mailbox m JOIN apps_domains_domain d ON m.domain_id=d.id WHERE m.local_part='%u' AND d.name='%d' AND m.is_active=true
PGSQL

cat >> /etc/postfix/pgsql-virtual-alias-maps.cf <<'PGSQL'
query = SELECT a.destinations FROM apps_aliases_alias a JOIN apps_domains_domain d ON a.domain_id=d.id WHERE a.local_part='%u' AND d.name='%d' AND a.is_active=true
PGSQL

chmod 640 /etc/postfix/pgsql-*.cf
chown root:postfix /etc/postfix/pgsql-*.cf

echo "Postfix configurado correctamente"

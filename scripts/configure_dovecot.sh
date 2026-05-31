#!/usr/bin/env bash
# Configura Dovecot con autenticación PostgreSQL y Maildir
set -euo pipefail

MAIL_DOMAIN="${1:?Falta dominio}"
BACKUP_DIR="/etc/dovecot/backup_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"
cp -r /etc/dovecot/* "$BACKUP_DIR/" 2>/dev/null || true

DB_PASS=$(grep DB_PASSWORD /opt/mailpanel/backend/.env 2>/dev/null | cut -d= -f2 || echo "CHANGE_ME")

# dovecot.conf principal
cat > /etc/dovecot/dovecot.conf <<EOF
protocols = imap pop3 lmtp
listen = *, ::
base_dir = /var/run/dovecot/
instance_name = dovecot
login_greeting = Dovecot ready.
log_path = /var/log/dovecot.log
!include conf.d/*.conf
EOF

# 10-mail.conf
cat > /etc/dovecot/conf.d/10-mail.conf <<'EOF'
mail_location = maildir:/var/mail/vhosts/%d/%n
mail_privileged_group = vmail
namespace inbox {
  inbox = yes
  separator = /
  mailbox Drafts     { special_use = \Drafts;  auto = subscribe; }
  mailbox Junk       { special_use = \Junk;    auto = subscribe; }
  mailbox Sent       { special_use = \Sent;    auto = subscribe; }
  mailbox Trash      { special_use = \Trash;   auto = subscribe; }
}
EOF

# 10-auth.conf
cat > /etc/dovecot/conf.d/10-auth.conf <<'EOF'
disable_plaintext_auth = yes
auth_mechanisms = plain login
!include auth-sql.conf.ext
EOF

# auth-sql.conf.ext
cat > /etc/dovecot/conf.d/auth-sql.conf.ext <<'EOF'
passdb {
  driver = sql
  args = /etc/dovecot/dovecot-sql.conf.ext
}
userdb {
  driver = static
  args = uid=vmail gid=vmail home=/var/mail/vhosts/%d/%n
}
EOF

# dovecot-sql.conf.ext
cat > /etc/dovecot/dovecot-sql.conf.ext <<EOF
driver          = pgsql
connect         = host=127.0.0.1 dbname=mailpanel user=mailpanel password=$DB_PASS
default_pass_scheme = SHA512-CRYPT
password_query  = SELECT password_hash AS password FROM apps_mailboxes_mailbox m \\
                  JOIN apps_domains_domain d ON m.domain_id=d.id \\
                  WHERE m.local_part='%n' AND d.name='%d' AND m.is_active=true
EOF

chmod 640 /etc/dovecot/dovecot-sql.conf.ext
chown root:dovecot /etc/dovecot/dovecot-sql.conf.ext

# 10-ssl.conf
cat > /etc/dovecot/conf.d/10-ssl.conf <<EOF
ssl = required
ssl_cert = </etc/letsencrypt/live/$MAIL_DOMAIN/fullchain.pem
ssl_key  = </etc/letsencrypt/live/$MAIL_DOMAIN/privkey.pem
ssl_min_protocol = TLSv1.2
ssl_cipher_list = ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:RSA+AESGCM:RSA+AES:!aNULL:!MD5:!DSS
ssl_prefer_server_ciphers = yes
EOF

# 10-master.conf (socket para Postfix SASL + LMTP)
cat > /etc/dovecot/conf.d/10-master.conf <<'EOF'
service imap-login {
  inet_listener imap  { port = 143 }
  inet_listener imaps { port = 993 ssl = yes }
}
service pop3-login {
  inet_listener pop3  { port = 110 }
  inet_listener pop3s { port = 995 ssl = yes }
}
service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode  = 0600
    user  = postfix
    group = postfix
  }
}
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode  = 0666
    user  = postfix
    group = postfix
  }
  unix_listener auth-userdb {
    mode  = 0600
    user  = vmail
  }
}
service auth-worker {
  user = vmail
}
EOF

# 90-quota.conf (soporte de cuota)
cat > /etc/dovecot/conf.d/90-quota.conf <<'EOF'
plugin {
  quota = maildir:User quota
  quota_rule = *:storage=1G
  quota_warning = storage=95%% quota-warning 95 %u
  quota_warning2 = storage=80%% quota-warning 80 %u
}
service quota-warning {
  executable = script /usr/local/bin/quota-warning.sh
  unix_listener quota-warning { user = vmail }
}
EOF

echo "Dovecot configurado correctamente"

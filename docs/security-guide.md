# Guía de Seguridad — MailPanel

## Principios aplicados

Este servidor de correo implementa las siguientes capas de seguridad:

### 1. Autenticación y acceso

- **JWT con rotación de tokens:** Los tokens de acceso expiran en 60 minutos. Los refresh tokens se invalidan al usarse.
- **Contraseñas de buzón con SHA512-CRYPT:** El mismo esquema que usa Dovecot nativamente.
- **Solo HTTPS:** Nginx redirige todo el tráfico HTTP a HTTPS.
- **Rate limiting:** La API limita a 20 req/min para usuarios anónimos y 200 req/min para autenticados.

### 2. Cifrado en tránsito

- **TLS 1.2+ obligatorio** en SMTP (submission port 587) e IMAP (993).
- **TLSv1 y TLSv1.1 desactivados** en Postfix y Dovecot.
- **HSTS** activado en Nginx con `max-age=31536000; includeSubDomains; preload`.
- **Certificados Let's Encrypt** con renovación automática vía cron.

### 3. Anti-spam y autenticación de correo

| Mecanismo | Qué protege |
|-----------|-------------|
| **SPF** | Evita que otros envíen correo desde tu dominio |
| **DKIM** | Firma criptográfica que verifica el origen |
| **DMARC** | Política que combina SPF + DKIM y genera reportes |
| **Rspamd** | Filtrado antispam con puntuación |
| **RBL checks** | Bloquea IPs en listas negras (Spamhaus, SpamCop) |

### 4. Anti-relay (no ser un open relay)

Postfix está configurado para **rechazar correo no autenticado** hacia dominios externos:

```
smtpd_relay_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination   ← CRÍTICO
```

Verifica que no eres un open relay en: https://mxtoolbox.com/diagnostic.aspx

### 5. Fail2ban

Protege contra fuerza bruta con baneos automáticos:

| Servicio | Intentos fallidos | Ban |
|----------|------------------|-----|
| SSH | 3 en 10 min | 24 horas |
| SMTP SASL | 3 en 10 min | 2 horas |
| Dovecot | 3 en 10 min | 2 horas |
| Postfix | 5 en 10 min | 1 hora |

Ver IPs baneadas: `fail2ban-client status postfix-sasl`

### 6. Backups

El instalador hace backups automáticos antes de modificar:
- `/etc/postfix/` → `/etc/postfix/backup_FECHA/`
- `/etc/dovecot/` → `/etc/dovecot/backup_FECHA/`

Al eliminar un buzón, el directorio Maildir se renombra a `.deleted_usuario_ID` en lugar de borrarse.

## Checklist de seguridad post-instalación

- [ ] Cambia la contraseña del superusuario Django inmediatamente
- [ ] Cambia la contraseña del panel Rspamd (en `/etc/rspamd/local.d/worker-controller.inc`)
- [ ] Verifica que el puerto 25 **acepta** conexiones entrantes (correo recibido)
- [ ] Verifica que el puerto 25 **no está en ninguna blacklist** (MXToolbox Blacklist Check)
- [ ] Confirma que NO eres open relay (MXToolbox Open Relay Test)
- [ ] Verifica la puntuación en mail-tester.com (objetivo: 10/10)
- [ ] Configura backups automáticos de PostgreSQL en cron
- [ ] Activa monitorización de servicios (UptimeRobot, Zabbix, etc.)
- [ ] Revisa `/var/log/mail.log` semanalmente

## Monitorización recomendada

```bash
# Cron: backup diario de la base de datos
0 2 * * * pg_dump mailpanel | gzip > /backup/mailpanel_$(date +\%Y\%m\%d).sql.gz

# Cron: limpieza de backups con más de 30 días
0 3 * * * find /backup -name "mailpanel_*.sql.gz" -mtime +30 -delete

# Cron: renovación SSL
0 0 1 * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

## Procedimiento ante incidente

1. **IP maliciosa detectada:**
   ```bash
   fail2ban-client set postfix-sasl banip <IP>
   # O agregar permanentemente:
   echo "<IP>" >> /etc/postfix/blacklist_ips
   postmap /etc/postfix/blacklist_ips && postfix reload
   ```

2. **Cuenta comprometida:**
   - Desactivar la cuenta en el panel (Buzones → Desactivar)
   - Cambiar contraseña inmediatamente
   - Revisar los logs: `grep usuario@dominio /var/log/mail.log | tail -100`

3. **Servidor en blacklist:**
   - Revisar qué IP está en la lista: https://multirbl.valli.org
   - Limpiar la cola de mensajes spam: `postsuper -d ALL deferred`
   - Solicitar eliminación de la blacklist (cada una tiene su proceso)
   - Verificar que no hay cuentas comprometidas enviando spam

4. **Disco lleno:**
   ```bash
   df -h /var/mail/vhosts
   du -sh /var/mail/vhosts/*/* | sort -rh | head -20
   # Reducir cuotas o eliminar correo antiguo
   ```

# MailPanel — Servidor de Correo Propio en VPS

Panel de administración completo para montar y gestionar un servidor de correo propio con Postfix, Dovecot, Rspamd, OpenDKIM y Nginx. Sin depender de proveedores externos.

---

## Arquitectura

```
Internet
   │
   ▼
Nginx (443 HTTPS)
   ├── /          → React Frontend (SPA)
   ├── /api/      → Django REST API (Gunicorn UNIX socket)
   ├── /webmail/  → Roundcube (opcional)
   └── /rspamd/   → Rspamd Web UI

Django API
   ├── JWT Auth
   ├── apps/domains    → Dominios + DKIM + DNS checker
   ├── apps/mailboxes  → Buzones virtuales
   ├── apps/aliases    → Alias y redirecciones
   └── apps/services   → Control de servicios + logs

Servidor de correo
   ├── Postfix (SMTP 25, Submission 587, SMTPS 465)
   │     └── consulta PostgreSQL para dominios/buzones/alias
   ├── Dovecot (IMAP 993, POP3 995)
   │     └── autentica contra PostgreSQL con SHA512-CRYPT
   ├── Rspamd (milter antispam)
   ├── OpenDKIM (firma DKIM)
   └── Fail2ban (protección fuerza bruta)

Base de datos: PostgreSQL
Almacenamiento: Maildir en /var/mail/vhosts/<dominio>/<usuario>/
```

---

## Requisitos del VPS

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| RAM     | 1 GB   | 2 GB        |
| CPU     | 1 vCPU | 2 vCPU      |
| Disco   | 20 GB  | 50+ GB      |
| OS      | Ubuntu 22.04 LTS | Ubuntu 22.04/24.04 |

**Puertos que deben estar abiertos en el firewall:**

| Puerto | Protocolo | Servicio |
|--------|-----------|---------|
| 22     | TCP       | SSH |
| 25     | TCP       | SMTP (recepción) |
| 80     | TCP       | HTTP (redirect) |
| 443    | TCP       | HTTPS (panel + webmail) |
| 465    | TCP       | SMTPS |
| 587    | TCP       | SMTP Submission |
| 993    | TCP       | IMAPS |
| 995    | TCP       | POP3S |

---

## Instalación en VPS limpio

### 1. Preparar el servidor

```bash
# Conectarse al VPS
ssh root@TU_IP_VPS

# Actualizar sistema
apt update && apt upgrade -y

# Instalar git
apt install -y git

# Clonar el proyecto
git clone https://github.com/tu-usuario/mailpanel.git /opt/mailpanel
cd /opt/mailpanel
```

### 2. Configurar el hostname

```bash
# Importante: el hostname debe coincidir con tu dominio de correo
hostnamectl set-hostname mail.tudominio.com
echo "127.0.0.1 mail.tudominio.com" >> /etc/hosts
```

### 3. Verificar que el DNS A está configurado

Antes de ejecutar el instalador, **configura primero el registro A** en tu proveedor DNS:

```
mail.tudominio.com  →  TU_IP_VPS
```

Espera a que propague (puede tardar de 5 minutos a 1 hora).

### 4. Ejecutar el instalador

```bash
chmod +x scripts/*.sh
sudo bash scripts/install.sh \
  --domain mail.tudominio.com \
  --email admin@tudominio.com
```

El instalador hará automáticamente:
- Instalar y configurar todos los paquetes
- Configurar Postfix, Dovecot, Rspamd, OpenDKIM
- Crear la base de datos PostgreSQL
- Obtener certificado SSL con Let's Encrypt
- Desplegar el backend Django con Gunicorn
- Construir el frontend React
- Configurar Fail2ban

### 5. Acceder al panel

Una vez instalado, ve a `https://mail.tudominio.com` y accede con:
- **Usuario:** admin
- **Contraseña:** la generada durante la instalación (se muestra al final del script)

> Cambia la contraseña inmediatamente en Perfil → Cambiar contraseña.

---

## Configuración DNS

Después de instalar, debes añadir estos registros DNS en tu proveedor de dominio:

### Registros obligatorios

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A    | `mail` | `TU_IP_VPS` | 3600 |
| MX   | `@` o `tudominio.com` | `mail.tudominio.com` (prioridad 10) | 3600 |
| TXT (SPF) | `@` | `v=spf1 mx a ip4:TU_IP_VPS ~all` | 3600 |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@tudominio.com` | 3600 |

### Registro DKIM

Obtén tu clave pública DKIM con:

```bash
cat /etc/opendkim/keys/tudominio.com/mail.txt
```

El resultado será algo como:
```
mail._domainkey IN TXT ( "v=DKIM1; k=rsa; "
  "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ..." )
```

Crea un registro TXT:
| Tipo | Nombre | Valor |
|------|--------|-------|
| TXT  | `mail._domainkey` | `v=DKIM1; k=rsa; p=TU_CLAVE_PUBLICA` |

### PTR (rDNS) — Crítico para evitar spam

El PTR **debes configurarlo en tu proveedor VPS** (Hetzner, DigitalOcean, etc.):
- IP: `TU_IP_VPS`
- Valor: `mail.tudominio.com`

---

## Verificar la configuración

```bash
# Verificar que Postfix envía correctamente
echo "Test" | mail -s "Test MailPanel" tu@otroemail.com

# Probar autenticación SMTP
swaks --to tu@otroemail.com --from usuario@tudominio.com \
  --server mail.tudominio.com:587 \
  --auth LOGIN \
  --auth-user usuario@tudominio.com

# Comprobar DKIM
opendkim-testkey -d tudominio.com -s mail -vvv

# Ver cola de Postfix
mailq

# Ver logs en tiempo real
tail -f /var/log/mail.log
```

### Herramientas online de verificación

- **MX Toolbox:** https://mxtoolbox.com/SuperTool.aspx
- **Mail Tester:** https://www.mail-tester.com (envía un correo y puntúa)
- **DKIM Validator:** https://dkimvalidator.com
- **Blacklist Check:** https://mxtoolbox.com/blacklists.aspx

---

## Gestión de correos

### Crear un buzón desde el panel

1. Ir a **Dominios** → añadir tu dominio
2. Verificar los registros DNS con el botón **Verificar DNS**
3. Ir a **Buzones** → **Crear buzón**
4. Rellenar usuario, contraseña (mínimo 12 caracteres) y cuota

### Crear un alias

1. Ir a **Alias** → **Crear alias**
2. Seleccionar dominio, nombre del alias y destinos (separados por coma)

### Configurar cliente de correo

| Campo | Valor |
|-------|-------|
| Servidor IMAP | `mail.tudominio.com` |
| Puerto IMAP   | `993` (SSL/TLS) |
| Servidor SMTP | `mail.tudominio.com` |
| Puerto SMTP   | `587` (STARTTLS) |
| Usuario       | `usuario@tudominio.com` |
| Contraseña    | La configurada en el panel |

---

## Instalación de Roundcube (Webmail)

```bash
# Instalar dependencias PHP
apt install -y php php-fpm php-mysql php-pgsql php-intl \
  php-mbstring php-xml php-zip php-curl php-gd

# Descargar Roundcube
cd /var/www
wget https://github.com/roundcube/roundcubemail/releases/download/1.6.7/roundcubemail-1.6.7-complete.tar.gz
tar xzf roundcubemail-1.6.7-complete.tar.gz
mv roundcubemail-1.6.7 roundcube
chown -R www-data:www-data roundcube

# Crear base de datos para Roundcube
sudo -u postgres psql -c "CREATE DATABASE roundcube OWNER mailpanel;"
sudo -u postgres psql roundcube < /var/www/roundcube/SQL/postgres.initial.sql

# Configurar /var/www/roundcube/config/config.inc.php
# (editar con los datos de tu servidor)
```

---

## Actualizar el panel

```bash
cd /opt/mailpanel
git pull

# Backend
source backend/venv/bin/activate
pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py collectstatic --noinput
deactivate

# Frontend
cd frontend && npm install && npm run build

# Reiniciar
systemctl restart mailpanel nginx
```

---

## Mantenimiento

```bash
# Ver estado de todos los servicios
for s in postfix dovecot rspamd opendkim nginx fail2ban; do
  systemctl status $s --no-pager -l | head -3
done

# Limpiar cola de correos bloqueados
postsuper -d ALL deferred

# Rotar logs de Postfix
postfix reload

# Renovar SSL (automático con cron, pero puede forzarse)
certbot renew --dry-run

# Backup de la base de datos
pg_dump mailpanel > /backup/mailpanel_$(date +%Y%m%d).sql
```

---

## Estructura del proyecto

```
mailpanel/
├── backend/                    # Django REST API
│   ├── mailpanel/              # Configuración Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── apps/
│   │   ├── accounts/           # Usuarios admin + JWT
│   │   ├── domains/            # Dominios + DKIM + DNS checker
│   │   ├── mailboxes/          # Buzones virtuales
│   │   ├── aliases/            # Alias y redirecciones
│   │   └── services/           # Estado servicios + logs
│   └── requirements.txt
├── frontend/                   # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── pages/              # Dashboard, Dominios, Buzones, etc.
│   │   ├── components/         # Layout, UI components
│   │   ├── api/                # Cliente Axios + interceptores JWT
│   │   └── context/            # AuthContext
│   └── package.json
├── scripts/                    # Instaladores Bash
│   ├── install.sh              # Script principal
│   ├── configure_postfix.sh
│   ├── configure_dovecot.sh
│   ├── configure_opendkim.sh
│   ├── configure_rspamd.sh
│   └── configure_nginx.sh
├── configs/
│   └── fail2ban/jail.local
└── docs/
    ├── dns-checklist.md
    └── security-guide.md
```

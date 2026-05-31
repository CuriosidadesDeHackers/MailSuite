<p align="center">
  <img src="https://raw.githubusercontent.com/CuriosidadesDeHackers/MailSuite/master/assets/banner.png" alt="MailSuite Banner" width="100%">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/CuriosidadesDeHackers/MailSuite/master/assets/logo.png" alt="MailSuite Logo" width="110" height="110" style="border-radius: 20px;">
</p>

<h1 align="center">MailSuite</h1>

<p align="center">
  <strong>Panel de administración completo para montar tu propio servidor de correo en una VPS.</strong><br>
  Gestiona dominios, buzones, alias y servicios de correo desde una interfaz web moderna.<br>
  Sin depender de proveedores externos. Postfix + Dovecot + Rspamd + DKIM + DMARC.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" alt="Maintained">
  <img src="https://img.shields.io/badge/PRs-welcome-blue.svg" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License MIT">
  <img src="https://img.shields.io/badge/Python-3.10+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/Django-4.2-green.svg" alt="Django">
  <img src="https://img.shields.io/badge/React-18-61DAFB.svg" alt="React">
</p>

---

## 👥 Autor

<br>

<div align="center">
  <table>
    <tr>
      <td align="center" width="200">
        <a href="https://github.com/CuriosidadesDeHackers" target="_blank">
          <img src="https://avatars.githubusercontent.com/CuriosidadesDeHackers" width="120" height="120" style="border-radius: 50%; border: 3px solid #3b82f6;" alt="CuriosidadesDeHackers">
        </a>
        <br><br>
        <strong>CuriosidadesDeHackers</strong>
        <br>
        <a href="https://github.com/CuriosidadesDeHackers" target="_blank">
          <img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white" alt="GitHub">
        </a>
        &nbsp;
        <a href="https://www.youtube.com/@CuriosidadesDeHackers" target="_blank">
          <img src="https://img.shields.io/badge/YouTube-FF0000?style=flat&logo=youtube&logoColor=white" alt="YouTube">
        </a>
      </td>
    </tr>
  </table>
</div>

<br>

---

## Estructura del Proyecto

```
MailSuite/
├── README.md                        # Este archivo
├── .gitignore
├── backend/                         # API REST — Django
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example                 # Variables de entorno (copiar a .env)
│   ├── mailpanel/                   # Configuración Django
│   │   ├── settings.py              # Producción (PostgreSQL)
│   │   ├── settings_dev.py          # Desarrollo local (SQLite)
│   │   ├── urls.py                  # Router principal
│   │   ├── celery.py                # Tareas asíncronas
│   │   └── wsgi.py
│   └── apps/
│       ├── accounts/                # Usuarios admin + JWT
│       ├── domains/                 # Dominios, DKIM, verificación DNS
│       ├── mailboxes/               # Buzones virtuales con cuotas
│       ├── aliases/                 # Alias y redirecciones
│       └── services/                # Estado de servicios + logs
├── frontend/                        # SPA — React + Vite + TailwindCSS
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/
│       │   └── client.js            # Axios + interceptor JWT
│       ├── context/
│       │   └── AuthContext.jsx      # Autenticación global
│       ├── components/
│       │   └── Layout.jsx           # Sidebar + navegación
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx    # Estadísticas + estado servicios
│           ├── DomainsPage.jsx      # Dominios + DNS Checklist + DKIM
│           ├── MailboxesPage.jsx    # Buzones + contraseñas + cuotas
│           ├── AliasesPage.jsx      # Alias multi-destino
│           ├── ServicesPage.jsx     # Control de servicios
│           └── LogsPage.jsx         # Visor de logs en tiempo real
├── scripts/                         # Instaladores Bash para VPS
│   ├── install.sh                   # Instalador principal (un solo comando)
│   ├── configure_postfix.sh
│   ├── configure_dovecot.sh
│   ├── configure_opendkim.sh
│   ├── configure_rspamd.sh
│   └── configure_nginx.sh
├── configs/
│   └── fail2ban/
│       └── jail.local               # Reglas de protección fuerza bruta
└── docs/
    ├── dns-checklist.md             # Checklist DNS por dominio
    └── security-guide.md            # Guía de seguridad y respuesta a incidentes
```

---

## 🚀 Instalación en VPS — Producción

Este es el modo de uso principal. El instalador configura todo automáticamente en una VPS limpia con Ubuntu 22.04.

### Requisitos del VPS

| Recurso | Mínimo | Recomendado |
| :--- | :--- | :--- |
| RAM | 1 GB | 2 GB |
| CPU | 1 vCPU | 2 vCPU |
| Disco | 20 GB | 50+ GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 / 24.04 |

### Puertos necesarios en el firewall

| Puerto | Servicio |
| :--- | :--- |
| 22 | SSH |
| 25 | SMTP (recepción de correo) |
| 80 | HTTP → redirect HTTPS |
| 443 | HTTPS (panel + webmail) |
| 465 | SMTPS |
| 587 | SMTP Submission (envío autenticado) |
| 993 | IMAPS |
| 995 | POP3S |

### Comando de instalación

```bash
# 1. Clonar el repositorio en la VPS
git clone https://github.com/CuriosidadesDeHackers/MailSuite.git /opt/mailsuite
cd /opt/mailsuite

# 2. Dar permisos a los scripts
chmod +x scripts/*.sh

# 3. Ejecutar el instalador (como root)
sudo bash scripts/install.sh \
  --domain mail.tudominio.com \
  --email admin@tudominio.com
```

El instalador realiza automáticamente:
- Instalación de Postfix, Dovecot, Rspamd, OpenDKIM, Nginx, Certbot, Fail2ban
- Configuración de PostgreSQL con usuario y contraseña aleatorios
- Obtención del certificado SSL con Let's Encrypt
- Despliegue del backend Django con Gunicorn como servicio systemd
- Build del frontend React y configuración de Nginx como proxy
- Configuración de Fail2ban para proteger SMTP, IMAP y SSH

Al finalizar, el panel estará disponible en `https://mail.tudominio.com`

---

## 🖥️ Instalación Local — Desarrollo

Para probar el panel en tu máquina antes de desplegarlo en producción.

### Requisitos

- Python 3.10+
- Node.js 18+
- npm 9+

### Backend Django

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/Scripts/activate  # Windows
# source venv/bin/activate     # Linux/macOS

# Instalar dependencias
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers python-decouple dnspython passlib bcrypt

# Crear base de datos (SQLite local)
DJANGO_SETTINGS_MODULE=mailpanel.settings_dev python manage.py migrate

# Crear superusuario admin
DJANGO_SETTINGS_MODULE=mailpanel.settings_dev \
DJANGO_SUPERUSER_USERNAME=admin \
DJANGO_SUPERUSER_EMAIL=tu@email.com \
DJANGO_SUPERUSER_PASSWORD=Admin1234567! \
python manage.py createsuperuser --noinput

# Arrancar servidor
DJANGO_SETTINGS_MODULE=mailpanel.settings_dev python manage.py runserver 8000
```

### Frontend React

```bash
cd frontend

# Instalar dependencias
npm install

# Arrancar servidor de desarrollo
npm run dev
```

El panel estará disponible en `http://localhost:5173`

> **Nota:** En local, los servicios de correo (Postfix, Dovecot, etc.) aparecen como inactivos porque `systemctl` es exclusivo de Linux. El resto del panel funciona completamente.

---

## 🔐 Acceso al Panel

| Campo | Valor por defecto |
| :--- | :--- |
| URL (dev) | `http://localhost:5173` |
| URL (prod) | `https://mail.tudominio.com` |
| Usuario | `admin` |
| Contraseña | La generada durante la instalación |

> Cambia la contraseña del administrador inmediatamente tras el primer acceso.

---

## 📋 Registros DNS

Tras instalar MailSuite, debes añadir estos registros en tu proveedor de dominio:

| Tipo | Nombre | Valor |
| :--- | :--- | :--- |
| `A` | `mail` | `TU_IP_VPS` |
| `MX` | `@` | `mail.tudominio.com` (prioridad 10) |
| `TXT` SPF | `@` | `v=spf1 mx a ip4:TU_IP_VPS ~all` |
| `TXT` DKIM | `mail._domainkey` | *(generado automáticamente — ver panel → Dominios → DNS)* |
| `TXT` DMARC | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@tudominio.com` |
| `PTR` | `TU_IP_VPS` | `mail.tudominio.com` *(configurar en el proveedor VPS)* |

La verificación de DNS puede hacerse desde el panel en **Dominios → Verificar DNS**.

Consulta la guía completa en [`docs/dns-checklist.md`](docs/dns-checklist.md).

---

## API Endpoints

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login/` | Obtener token JWT |
| `POST` | `/api/auth/refresh/` | Renovar token de acceso |
| `GET/POST` | `/api/domains/` | Listar / crear dominios |
| `POST` | `/api/domains/{id}/verify_dns/` | Verificar MX, SPF, DKIM, DMARC |
| `GET` | `/api/domains/{id}/dns_checklist/` | Registros DNS necesarios |
| `POST` | `/api/domains/{id}/regenerate_dkim/` | Regenerar clave DKIM |
| `GET/POST` | `/api/mailboxes/` | Listar / crear buzones |
| `POST` | `/api/mailboxes/{id}/change_password/` | Cambiar contraseña |
| `POST` | `/api/mailboxes/{id}/toggle_active/` | Activar / desactivar buzón |
| `GET` | `/api/mailboxes/{id}/usage/` | Uso de disco del buzón |
| `GET/POST` | `/api/aliases/` | Listar / crear alias |
| `POST` | `/api/aliases/{id}/toggle_active/` | Activar / desactivar alias |
| `GET` | `/api/services/` | Estado de todos los servicios |
| `POST` | `/api/services/{svc}/{action}/` | start / stop / restart / reload |
| `GET` | `/api/logs/` | Logs de Postfix, Dovecot o Rspamd |
| `GET` | `/api/dashboard/` | Estadísticas generales del servidor |

---

## Tecnologías

MailSuite combina un backend seguro y robusto con un frontend moderno, conectados a los servicios de correo estándar del ecosistema Linux.

<br>

| Capa | Tecnologías | Función |
| :--- | :--- | :--- |
| <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/React-Dark.svg" height="60" alt="Frontend"><br>**FRONTEND**<br>*SPA moderna* | <ul><li>**React 18** + Vite</li><li>**TailwindCSS** (dark theme)</li><li>**React Query** (caché + revalidación)</li><li>**Axios** + interceptor JWT</li></ul> | **Panel oscuro y reactivo**. Navegación instantánea sin recargas, actualización automática del estado de servicios cada 15 segundos y gestión completa de tokens con refresco silencioso. |
| <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Django.svg" height="60" alt="Backend"><br>**BACKEND**<br>*API REST segura* | <ul><li>**Django 4.2** + DRF</li><li>**JWT** con rotación de tokens</li><li>**Rate limiting** por usuario/IP</li><li>**Gunicorn** (producción)</li></ul> | **Seguridad por defecto**. HTTPS obligatorio, HSTS, X-Frame-Options, contraseñas con SHA512-CRYPT compatible con Dovecot, rate limiting de 20 req/min para anónimos. |
| <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/PostgreSQL-Dark.svg" height="60" alt="Database"><br>**BASE DE DATOS**<br>*Relacional* | <ul><li>**PostgreSQL** (producción)</li><li>**SQLite** (desarrollo local)</li><li>**Django ORM**</li></ul> | **Consultas en tiempo real**. Postfix y Dovecot consultan directamente PostgreSQL para validar dominios, buzones y alias sin reiniciar servicios. |
| <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Nginx.svg" height="60" alt="Proxy"><br>**PROXY + SSL**<br>*Infraestructura web* | <ul><li>**Nginx** (reverse proxy)</li><li>**Let's Encrypt** + Certbot</li><li>**TLS 1.2+** obligatorio</li></ul> | **Certificado gratuito y automático**. Nginx sirve el frontend React como SPA, proxifica la API Django, expone el webmail en `/webmail` y el panel de Rspamd en `/rspamd`. |
| <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Linux-Dark.svg" height="60" alt="Mail"><br>**SERVIDOR DE CORREO**<br>*Stack completo* | <ul><li>**Postfix** (SMTP)</li><li>**Dovecot** (IMAP/POP3)</li><li>**Rspamd** (antispam)</li><li>**OpenDKIM** (firma DKIM)</li></ul> | **Entregabilidad máxima**. SPF, DKIM y DMARC configurados por dominio. Rspamd actúa como milter con greylist y puntuación. Protección anti-relay garantizada por configuración. |
| <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Bash-Dark.svg" height="60" alt="Scripts"><br>**AUTOMATIZACIÓN**<br>*Despliegue* | <ul><li>**Bash** (scripts de instalación)</li><li>**Fail2ban** (protección)</li><li>**systemd** (servicios)</li></ul> | **Un solo comando para desplegar todo**. El instalador configura el sistema completo desde cero en una VPS limpia, incluyendo backups automáticos de configuraciones existentes antes de modificarlas. |

---

## 🛡️ Seguridad

MailSuite implementa múltiples capas de seguridad listas para producción:

- **Anti-relay:** `reject_unauth_destination` en Postfix — imposible ser usado como relay abierto
- **TLS obligatorio:** SMTP submission (587) e IMAP (993) requieren cifrado
- **DKIM por dominio:** Claves RSA-2048 generadas automáticamente y rotables desde el panel
- **Fail2ban:** Baneos automáticos tras intentos fallidos en SSH, SMTP y IMAP
- **SPF + DMARC:** Configurados automáticamente con política `quarantine`
- **Contraseñas:** SHA512-CRYPT compatible con Dovecot, mínimo 12 caracteres
- **JWT con blacklist:** Logout real con invalidación de tokens

Consulta la guía completa en [`docs/security-guide.md`](docs/security-guide.md).

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).

---

<p align="center">
  Hecho con ❤️ por <a href="https://github.com/CuriosidadesDeHackers">CuriosidadesDeHackers</a>
</p>

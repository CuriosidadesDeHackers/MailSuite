# Checklist DNS para cada dominio

Usa esta lista cada vez que añadas un nuevo dominio al servidor.

## Antes de añadir el dominio al panel

- [ ] El registro A `mail.tudominio.com → TU_IP_VPS` ya existe y propaga
- [ ] El PTR (rDNS) está configurado en el proveedor VPS: `TU_IP → mail.tudominio.com`

## Registros a crear en tu proveedor DNS

### 1. Registro A

```
Tipo:  A
Nombre: mail (o mail.tudominio.com si pide FQDN)
Valor:  TU_IP_VPS
TTL:   3600
```

### 2. Registro MX

```
Tipo:     MX
Nombre:   @ (o tudominio.com)
Valor:    mail.tudominio.com.
Prioridad: 10
TTL:      3600
```

### 3. Registro SPF (TXT)

```
Tipo:   TXT
Nombre: @ (o tudominio.com)
Valor:  v=spf1 mx a ip4:TU_IP_VPS ~all
TTL:    3600
```

> El `~all` es softfail (recomendado). Usa `-all` para reject estricto solo si estás seguro.

### 4. Registro DKIM (TXT)

Obtén la clave con: `cat /etc/opendkim/keys/tudominio.com/mail.txt`

O desde el panel: Dominios → tu dominio → **DNS** → copia el registro DKIM.

```
Tipo:   TXT
Nombre: mail._domainkey (o mail._domainkey.tudominio.com)
Valor:  v=DKIM1; k=rsa; p=TU_CLAVE_PUBLICA_BASE64
TTL:    3600
```

> La clave pública puede ser larga. Algunos paneles DNS requieren dividirla en segmentos de 255 caracteres entre comillas.

### 5. Registro DMARC (TXT)

```
Tipo:   TXT
Nombre: _dmarc (o _dmarc.tudominio.com)
Valor:  v=DMARC1; p=quarantine; rua=mailto:dmarc@tudominio.com; ruf=mailto:dmarc@tudominio.com; adkim=s; aspf=s; pct=100
TTL:    3600
```

**Valores de política DMARC:**
- `p=none` → Solo monitorizar, no actuar (ideal al principio)
- `p=quarantine` → Mover a spam los que fallen (recomendado)
- `p=reject` → Rechazar los que fallen (más estricto)

## Verificar desde el panel

En **Dominios → tu dominio → Verificar DNS** el panel comprobará automáticamente:

| Check | Herramienta manual |
|-------|-------------------|
| MX | `dig MX tudominio.com` |
| SPF | `dig TXT tudominio.com` |
| DKIM | `dig TXT mail._domainkey.tudominio.com` |
| DMARC | `dig TXT _dmarc.tudominio.com` |

## Verificación rápida en la terminal del VPS

```bash
DOMAIN="tudominio.com"

echo "=== MX ===" && dig MX $DOMAIN +short
echo "=== SPF ===" && dig TXT $DOMAIN +short | grep spf
echo "=== DKIM ===" && dig TXT mail._domainkey.$DOMAIN +short
echo "=== DMARC ===" && dig TXT _dmarc.$DOMAIN +short
echo "=== PTR ===" && dig -x TU_IP_VPS +short
```

## Puntuación objetivo

Envía un correo de prueba a https://www.mail-tester.com para obtener una puntuación.

| Puntuación | Estado |
|-----------|--------|
| 10/10 | Excelente — todos los registros correctos |
| 8-9/10 | Bueno — algún registro menor falta |
| < 7/10 | Revisar — posible problema de entregabilidad |

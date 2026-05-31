import socket
import dns.resolver
from typing import Optional


def check_mx(domain: str, expected_host: str) -> bool:
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        for rdata in answers:
            if expected_host.lower() in str(rdata.exchange).lower():
                return True
        return False
    except Exception:
        return False


def check_spf(domain: str) -> bool:
    try:
        answers = dns.resolver.resolve(domain, 'TXT')
        for rdata in answers:
            txt = ''.join(str(rdata).split('"')[1::2])
            if txt.startswith('v=spf1'):
                return True
        return False
    except Exception:
        return False


def check_dkim(domain: str, selector: str) -> bool:
    try:
        dkim_domain = f"{selector}._domainkey.{domain}"
        answers = dns.resolver.resolve(dkim_domain, 'TXT')
        for rdata in answers:
            txt = ''.join(str(rdata).split('"')[1::2])
            if 'v=DKIM1' in txt and 'p=' in txt:
                return True
        return False
    except Exception:
        return False


def check_dmarc(domain: str) -> bool:
    try:
        dmarc_domain = f"_dmarc.{domain}"
        answers = dns.resolver.resolve(dmarc_domain, 'TXT')
        for rdata in answers:
            txt = ''.join(str(rdata).split('"')[1::2])
            if txt.startswith('v=DMARC1'):
                return True
        return False
    except Exception:
        return False


def get_server_ip() -> Optional[str]:
    try:
        return socket.gethostbyname(socket.gethostname())
    except Exception:
        return None


def build_dns_checklist(domain: str, server_ip: str, selector: str, public_key: str) -> list:
    return [
        {
            'type': 'A',
            'name': f'mail.{domain}',
            'value': server_ip,
            'description': 'Registro A del servidor de correo',
        },
        {
            'type': 'MX',
            'name': domain,
            'value': f'10 mail.{domain}.',
            'description': 'Registro MX principal',
        },
        {
            'type': 'TXT (SPF)',
            'name': domain,
            'value': f'v=spf1 mx a ip4:{server_ip} ~all',
            'description': 'Política SPF',
        },
        {
            'type': 'TXT (DKIM)',
            'name': f'{selector}._domainkey.{domain}',
            'value': f'v=DKIM1; k=rsa; p={public_key}',
            'description': 'Clave pública DKIM',
        },
        {
            'type': 'TXT (DMARC)',
            'name': f'_dmarc.{domain}',
            'value': f'v=DMARC1; p=quarantine; rua=mailto:dmarc@{domain}; ruf=mailto:dmarc@{domain}; adkim=s; aspf=s',
            'description': 'Política DMARC',
        },
        {
            'type': 'PTR',
            'name': server_ip,
            'value': f'mail.{domain}',
            'description': 'Registro PTR (rDNS) — configurar en el proveedor VPS',
        },
    ]

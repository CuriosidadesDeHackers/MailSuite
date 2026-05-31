import os
import subprocess
from pathlib import Path
from django.conf import settings


def generate_dkim_keypair(domain: str, selector: str) -> dict:
    """Generate RSA 2048-bit DKIM keypair for a domain."""
    key_dir = Path(settings.DKIM_KEY_DIR) / domain
    key_dir.mkdir(parents=True, exist_ok=True)

    private_key_path = key_dir / f"{selector}.private"
    public_key_path = key_dir / f"{selector}.txt"

    subprocess.run(
        ['opendkim-genkey', '-b', '2048', '-d', domain, '-s', selector, '-D', str(key_dir)],
        check=True,
        capture_output=True,
    )

    private_key = private_key_path.read_text()
    public_key_raw = public_key_path.read_text()

    # Extract only the p= value from the TXT record
    public_key_value = _extract_public_key_value(public_key_raw)

    # Secure the private key file
    os.chmod(private_key_path, 0o600)

    return {
        'private_key': private_key,
        'public_key': public_key_value,
        'private_key_path': str(private_key_path),
    }


def _extract_public_key_value(txt_record: str) -> str:
    """Extract the p= base64 value from an opendkim TXT record file."""
    parts = []
    for line in txt_record.splitlines():
        if 'p=' in line:
            # Extract everything between quotes and concatenate
            import re
            matches = re.findall(r'"([^"]*)"', line)
            parts.extend(matches)
    combined = ''.join(parts)
    # Find p= and return the value
    if 'p=' in combined:
        return combined.split('p=')[1].rstrip('"').rstrip(')')
    return combined


def get_dkim_dns_record(domain: str, selector: str, public_key: str) -> str:
    """Return the DNS TXT record string for DKIM."""
    return (
        f"{selector}._domainkey.{domain}. IN TXT "
        f'"v=DKIM1; k=rsa; p={public_key}"'
    )

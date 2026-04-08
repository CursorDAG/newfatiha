"""Generate SSH key pair and print the public key to add to the server."""
import base64
import os
import struct
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import (
    Encoding, PrivateFormat, PublicFormat, NoEncryption
)

KEY_PATH = r'C:\Users\bityi\.ssh\id_ed25519_fatiha'
PUB_PATH = KEY_PATH + '.pub'


def _encode_openssh_pubkey(raw_pub_bytes: bytes) -> str:
    """Encode ed25519 public key in OpenSSH wire format -> base64."""
    algo = b'ssh-ed25519'
    def pack(b: bytes) -> bytes:
        return struct.pack('>I', len(b)) + b
    wire = pack(algo) + pack(raw_pub_bytes)
    return base64.b64encode(wire).decode()


def main():
    if not os.path.exists(KEY_PATH):
        print('[*] Генерирую SSH-ключ ed25519...')
        private_key = Ed25519PrivateKey.generate()

        # Save private key in OpenSSH PEM format
        pem = private_key.private_bytes(Encoding.PEM, PrivateFormat.OpenSSH, NoEncryption())
        with open(KEY_PATH, 'wb') as f:
            f.write(pem)
        os.chmod(KEY_PATH, 0o600)

        raw_pub = private_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
        b64 = _encode_openssh_pubkey(raw_pub)
        pub = f'ssh-ed25519 {b64} cursor-deploy@fatiha'
        with open(PUB_PATH, 'w') as f:
            f.write(pub + '\n')
        print(f'[+] Ключ сохранён: {KEY_PATH}')
    else:
        print(f'[+] Ключ уже существует: {KEY_PATH}')
        with open(PUB_PATH) as f:
            pub = f.read().strip()

    print()
    print('=' * 70)
    print('Вставьте эту команду в консоль LXC (Proxmox → контейнер → Console):')
    print('=' * 70)
    print()
    print(f'mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo \'{pub}\' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && systemctl enable ssh && systemctl start ssh && echo "SSH настроен!"')
    print()
    print('=' * 70)


if __name__ == '__main__':
    main()

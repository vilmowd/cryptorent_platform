from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

# This key MUST be kept secret in your .env file
# You can generate one using: Fernet.generate_key()
MASTER_KEY = os.getenv("ENCRYPTION_KEY")
cipher_suite = Fernet(MASTER_KEY)

def encrypt_key(plain_text: str) -> str:
    """Turn 'my_api_key' into 'gAAAAABl...'"""
    if not plain_text:
        return None
    return cipher_suite.encrypt(plain_text.encode()).decode()

def decrypt_key(encrypted_text: str) -> str:
    """Turn 'gAAAAABl...' back into 'my_api_key'"""
    if not encrypted_text:
        return None
    return cipher_suite.decrypt(encrypted_text.encode()).decode()
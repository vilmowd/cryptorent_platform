import os
import logging
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv()

# Setup logging to catch encryption errors
logger = logging.getLogger("security")

# CRITICAL: If this is missing, the app should fail immediately on startup
MASTER_KEY = os.getenv("ENCRYPTION_KEY")

if not MASTER_KEY:
    logger.error("🚨 ENCRYPTION_KEY NOT FOUND IN ENVIRONMENT VARIABLES")
    # In production, you might want to raise an error here
    cipher_suite = None 
else:
    try:
        cipher_suite = Fernet(MASTER_KEY.encode() if isinstance(MASTER_KEY, str) else MASTER_KEY)
    except Exception as e:
        logger.error(f"🚨 FAILED TO INITIALIZE FERNET: {e}")
        cipher_suite = None

def encrypt_key(plain_text: str) -> str:
    """Turn 'my_api_key' into 'gAAAAABl...' AES-128 token"""
    if not plain_text or not cipher_suite:
        return None
    try:
        return cipher_suite.encrypt(plain_text.encode()).decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return None

def decrypt_key(encrypted_text: str) -> str:
    """Turn Fernet token back into 'my_api_key'"""
    if not encrypted_text or not cipher_suite:
        return None
    
    # Handle cases where the text might already be 'clean' or using the old dev_enc format
    if not encrypted_text.startswith("gAAAAA"):
        logger.warning("Attempted to decrypt non-Fernet string. Returning raw value.")
        return encrypted_text

    try:
        return cipher_suite.decrypt(encrypted_text.encode()).decode()
    except InvalidToken:
        logger.error("Invalid Encryption Token: Key mismatch or corrupted data.")
        return None
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return None
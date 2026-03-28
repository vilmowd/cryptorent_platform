import ccxt
# IMPORT THE DECRYPTION LOGIC
from core.security import decrypt_key 

def initialize_exchange(bot):
    """
    Dynamically creates an exchange object with DECRYPTED credentials.
    """
    # 1. Decrypt keys using our Fernet Master Key
    try:
        api_key = decrypt_key(bot.encrypted_api_key)
        secret = decrypt_key(bot.encrypted_secret)
        # Passphrase might be None, so handle it safely
        passphrase = decrypt_key(bot.encrypted_passphrase) if bot.encrypted_passphrase else None
    except Exception as e:
        # If decryption fails, the bot shouldn't even try to connect
        print(f"❌ Decryption Error for Bot {bot.id}: {e}")
        return None

    # 2. Get the exchange class from ccxt (e.g., ccxt.kraken)
    try:
        # Use lowercase to match CCXT's attribute names
        platform_name = bot.platform.lower() 
        exchange_class = getattr(ccxt, platform_name)
    except AttributeError:
        print(f"⚠️ Exchange {bot.platform} is not supported by CCXT.")
        return None

    # 3. Build the configuration dictionary
    config = {
        'apiKey': api_key,
        'secret': secret,
        'enableRateLimit': True,
        'options': {'defaultType': 'spot'}
    }

    # 4. Add passphrase if the exchange requires it
    if passphrase:
        config['password'] = passphrase

    # 5. Initialize and return the live exchange object
    return exchange_class(config)
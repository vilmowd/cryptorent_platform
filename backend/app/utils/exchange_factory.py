import ccxt
# Import your actual decryption function here
# from app.utils.security import decrypt_key 

def initialize_exchange(bot):
    """
    Dynamically creates an exchange object based on the platform stored in DB.
    """
    # 1. Decrypt keys (Assuming you have a decrypt_key function)
    # If you haven't built decryption yet, just use the string for now
    api_key = bot.encrypted_api_key 
    secret = bot.encrypted_secret
    passphrase = bot.encrypted_passphrase 

    # 2. Get the exchange class from ccxt (e.g., ccxt.binance)
    try:
        exchange_class = getattr(ccxt, bot.platform)
    except AttributeError:
        raise Exception(f"Exchange {bot.platform} is not supported by CCXT.")

    # 3. Build the configuration dictionary
    config = {
        'apiKey': api_key,
        'secret': secret,
        'enableRateLimit': True,
        'options': {'defaultType': 'spot'}
    }

    # 4. Add passphrase if the exchange requires it (Bybit/Coinbase/OKX)
    if passphrase:
        config['password'] = passphrase

    # 5. Initialize and return
    exchange = exchange_class(config)
    return exchange
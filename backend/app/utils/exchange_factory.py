import ccxt
from core.security import decrypt_key 
import os

def initialize_exchange(bot):
    try:
        # 1. Decrypt (Ensure these are returning clean strings)
        api_key = decrypt_key(bot.encrypted_api_key).strip()
        secret = decrypt_key(bot.encrypted_secret).strip()
        print(f"DEBUG: Master Key Loaded: {os.getenv('MASTER_KEY') is not None}")
        
        # 2. Check for Kraken-specific naming
        platform_name = bot.platform.lower().strip()
        exchange_class = getattr(ccxt, platform_name)

        config = {
            'apiKey': api_key,
            'secret': secret,
            'enableRateLimit': True,
            'options': {
                'defaultType': 'spot',
                'adjustForTimeDifference': True # Kraken is strict on timing
            }
        }

        # 3. Handle Passphrase (for Bybit/OKX, Kraken doesn't use this)
        if bot.encrypted_passphrase:
            config['password'] = decrypt_key(bot.encrypted_passphrase).strip()

        exchange = exchange_class(config)
        
        # 4. CRITICAL: Force CCXT to check credentials immediately
        # This prevents the engine from running if the keys are bad
        exchange.check_required_credentials()
        
        return exchange

    except Exception as e:
        print(f"❌ Critical Auth Failure for Bot {bot.id}: {e}")
        return None
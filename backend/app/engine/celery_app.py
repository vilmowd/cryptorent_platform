from celery import Celery
from celery.schedules import crontab

app = Celery('trading_bot',
             broker='redis://localhost:6379/0',
             backend='redis://localhost:6379/0')

app.conf.beat_schedule = {
    'run-trading-logic-every-minute': {
        'task': 'engine.tasks.run_all_active_bots',
        'schedule': 60.0,
    },
    'check-billing-hourly': {
        'task': 'engine.tasks.check_billing_and_subscriptions',
        'schedule': 3600.0, # Run every hour
    },
}
app.conf.timezone = 'UTC'
import os
import asyncio
import logging
import json
from fastapi import APIRouter, Request, BackgroundTasks
from telegram import Update
from telegram_bot import setup_application

# Match the logger from telegram_bot
logger = logging.getLogger("telegram_bot")

router = APIRouter()

# Global application instance to avoid re-initializing on every request
# In serverless, this might still happen, but we try to reuse.
_tg_app = None

async def get_tg_app():
    global _tg_app
    if _tg_app is None:
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not token:
            raise ValueError("TELEGRAM_BOT_TOKEN not found")
        _tg_app = setup_application(token)
        # Initialize the application (runs post_init etc)
        await _tg_app.initialize()
    return _tg_app

@router.post("/telegram-webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Endpoint for Telegram Webhooks.
    """
    try:
        data = await request.json()
        app = await get_tg_app()
        
        # Process the update in the background to return 200 OK immediately to Telegram
        update = Update.de_json(data, app.bot)
        background_tasks.add_task(app.process_update, update)
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook Error: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}

@router.get("/telegram-webhook-setup")
async def telegram_webhook_setup(url: str):
    """
    Helper endpoint to set the webhook URL.
    Usage: GET /telegram-webhook-setup?url=https://your-vercel-app.vercel.app/api/telegram-webhook
    """
    try:
        app = await get_tg_app()
        webhook_url = f"{url.rstrip('/')}/api/telegram-webhook"
        success = await app.bot.set_webhook(url=webhook_url)
        if success:
            return {"status": "success", "webhook_url": webhook_url}
        else:
            return {"status": "failed"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

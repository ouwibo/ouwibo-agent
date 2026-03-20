# telegram_bot.py
import os
import sys
import asyncio
import logging
from typing import Any

# Force current directory into path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters, CommandHandler
from sqlalchemy.orm import Session
from web3 import Web3

import models
import database
from database import SessionLocal, engine
from core.agent import Agent
from core.logger import get_logger
from core.config import get_env
from core import schemas

# Reuse KeyRotator from api.py if needed, or define here
# Since api.py defines it at module level, importing it might trigger FastAPI startup.
# Better to have it as a shared utility or just re-import carefully.
# For simplicity, I'll re-initialize the rotator here or just use a single key.

load_dotenv()
logger = get_logger("telegram_bot")

ALLOWED_USER_ID = os.getenv("ALLOWED_USER_ID")
if ALLOWED_USER_ID:
    try:
        ALLOWED_USER_ID = int(ALLOWED_USER_ID)
    except ValueError:
        logger.warning(f"Invalid ALLOWED_USER_ID: {ALLOWED_USER_ID}. Bot will be open to everyone.")
        ALLOWED_USER_ID = None

def is_authorized(update: Update) -> bool:
    """Checks if the user is allowed to use this bot."""
    if not ALLOWED_USER_ID:
        return True # Not locked if ID not provided
    user_id = update.effective_user.id
    if user_id != ALLOWED_USER_ID:
        logger.warning(f"Unauthorized access attempt from user ID: {user_id}")
        return False
    return True

# Initialize database
models.Base.metadata.create_all(bind=engine)

# Reuse KeyRotator logic
from api import rotator, free_ai_client

async def set_bot_metadata(application):
    """Set bot name, description, and commands."""
    bot = application.bot
    
    # Send commands
    commands = [
        ("start", "Mulai asisten Ouwibo"),
        ("help", "Lihat kemampuan & bantuan"),
        ("clear", "Hapus riwayat percakapan ini"),
    ]
    try:
        await bot.set_my_commands(commands)
        await bot.set_my_name("Ouwibo")
        await bot.set_my_description(
            "Institutional-grade crypto analysis, real-time market metrics, and DeFi operations at your fingertips."
        )
        await bot.set_my_short_description(
            "Elite AI assistant for blockchain intelligence and DeFi research."
        )
        logger.info("Bot metadata updated successfully.")
    except Exception as e:
        logger.error(f"Failed to update bot metadata: {e}")

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)

# ... (rest of imports same)

def get_main_menu_keyboard():
    """Returns a premium inline keyboard for the bot."""
    keyboard = [
        [
            InlineKeyboardButton("🚀 Market Top 10", callback_data="market_top"),
            InlineKeyboardButton("📰 Berita Crypto", callback_data="news_latest"),
        ],
        [
            InlineKeyboardButton("🔍 Deep Research", callback_data="research_help"),
            InlineKeyboardButton("💰 Wallet Scan", callback_data="wallet_check"),
        ],
        [
            InlineKeyboardButton("🏦 My Wallet (Top-up)", callback_data="my_wallet_view"),
            InlineKeyboardButton("🧼 Clear History", callback_data="clear_chat"),
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

# ... (other handlers)

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle button clicks."""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    chat_id = str(query.message.chat_id)
    
    if data == "my_wallet_view":
        await my_wallet_command(update, context)
        return

    # ... (rest of logic)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /start command."""
    if not is_authorized(update): return
    chat_id = update.effective_chat.id
    logger.info(f"Command /start from {chat_id}")
    
    # Text intro
    text = (
        "👋 <b>Selamat Datang di Ouwibo Elite.</b>\n\n"
        "Saya adalah asisten AI spesialis <b>Blockchain Intelligence</b> dan <b>DeFi Research</b> Bapak.\n\n"
        "Gunakan menu di bawah untuk akses cepat atau langsung ketik pertanyaan Anda."
    )
    
    await update.message.reply_text(
        text,
        parse_mode="HTML",
        reply_markup=get_main_menu_keyboard()
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /help command."""
    if not is_authorized(update): return
    logger.info(f"Command /help from {update.effective_chat.id}")
    text = (
        "🧠 <b>Kemampuan Ouwibo Elite:</b>\n\n"
        "1. <b>Trading & Swap</b>: 'Swap 0.1 ETH ke USDC' (Via LI.FI Aggregator).\n"
        "2. <b>Wallet Generator</b>: 'Buatkan saya wallet baru'.\n"
        "3. <b>Market Scan</b>: 'Cek harga BTC' atau 'Top 10 Crypto'.\n\n"
        "<b>Perintah:</b>\n"
        "/start - Menu Utama\n"
        "/wallet - Cek Alamat Wallet Bot Anda\n"
        "/clear - Hapus Riwayat\n"
        "/help  - Bantuan\n\n"
        "<i>Power by Alibaba AI & Ouwibo Elite.</i>"
    )
    await update.message.reply_text(text, parse_mode="HTML")

async def my_wallet_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show the bot's own wallet address for funding."""
    if not is_authorized(update): return
    from web3 import Web3
    pk = os.getenv("PRIVATE_KEY")
    if not pk:
        await update.message.reply_text("❌ Private Key belum di-set di .env")
        return
    
    try:
        w3 = Web3()
        acct = w3.eth.account.from_key(pk)
        address = acct.address
        text = (
            "🏦 <b>Ouwibo Trading Wallet</b>\n\n"
            "Kirim saldo ke alamat ini untuk memulai trading:\n"
            f"<code>{address}</code>\n\n"
            "<i>Klik alamat di atas untuk menyalin.</i>"
        )
        await update.message.reply_text(text, parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"Gagal memuat wallet: {e}")

async def clear_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /clear command."""
    if not is_authorized(update): return
    chat_id = str(update.effective_chat.id)
    logger.info(f"Command /clear from {chat_id}")
    db: Session = SessionLocal()
    try:
        db.query(models.ChatMessage).filter_by(session_id=chat_id).delete()
        db.commit()
        await update.message.reply_text("🧼 Riwayat telah dibersihkan. Ouwibo siap kembali beraksi.", reply_markup=get_main_menu_keyboard())
    except Exception as e:
        db.rollback()
        logger.error(f"Clear Error: {e}")
        await update.message.reply_text("Gagal bersihkan riwayat.")
    finally:
        db.close()

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle button clicks."""
    if not is_authorized(update): return
    query = update.callback_query
    await query.answer()
    
    data = query.data
    chat_id = str(query.message.chat_id)
    
    commands = {
        "market_top": "Berikan saya ringkasan Top 10 Crypto hari ini.",
        "news_latest": "Apa berita crypto paling penting dalam 24 jam terakhir?",
        "research_help": "Bagaimana cara melakukan deep research pada sebuah token baru?",
        "wallet_check": "Bantu saya cek saldo sebuah wallet address."
    }

    if data == "clear_chat":
        # Simulate /clear command logic
        db: Session = SessionLocal()
        try:
            db.query(models.ChatMessage).filter_by(session_id=chat_id).delete()
            db.commit()
            await query.edit_message_text("🧼 Riwayat dibersihkan. Apa hari ini Anda ingin reset target 'alpha'?", reply_markup=get_main_menu_keyboard())
        except Exception:
            db.rollback()
        finally:
            db.close()
        return

    if data in commands:
        await query.message.reply_text(f"<i>🛡️ Memproses: {commands[data]}</i>", parse_mode="HTML")
        await handle_agent_request(query.message, commands[data], chat_id, context)

async def handle_agent_request(message_obj, text, chat_id, context):
    """Core logic to talk to the Ouwibo Agent."""
    await context.bot.send_chat_action(chat_id=chat_id, action="typing")
    
    db: Session = SessionLocal()
    try:
        # 1. Fetch history
        history = db.query(models.ChatMessage).filter_by(session_id=chat_id).order_by(models.ChatMessage.id).all()

        # 2. Setup Agent
        # Alibaba API (DashScope) priority via rotator
        client = rotator.get_current_client() or free_ai_client
        agent = Agent(client=client)
        for h in history:
            agent.memory.add(h.role, h.content)

        # 3. Run Agent (staying in Persona Ouwibo Elite)
        agent_response = await asyncio.to_thread(agent.run, text, session_id=chat_id)

        # 4. Save to DB
        db.add(models.ChatMessage(session_id=chat_id, role="user", content=text))
        db.add(models.ChatMessage(session_id=chat_id, role="assistant", content=agent_response))
        db.commit()

        # 5. Reply with branding
        final_text = f"🛡️ <b>Ouwibo Elite</b>\n\n{agent_response}"
        
        if len(final_text) > 4000:
            for i in range(0, len(final_text), 4000):
                await message_obj.reply_text(final_text[i:i+4000], parse_mode="HTML")
        else:
            try:
                await message_obj.reply_text(final_text, parse_mode="HTML")
            except Exception:
                await message_obj.reply_text(agent_response)

    except Exception as e:
        db.rollback()
        logger.error(f"Agent Request Error: {e}", exc_info=True)
        await message_obj.reply_text("Maaf Bapak, sistem intelijen saya sedang di-maintenance.")
    finally:
        db.close()

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text messages."""
    if not is_authorized(update): return
    if not update.message or not update.message.text:
        return
    
    user_text = update.message.text
    chat_id = str(update.effective_chat.id)
    
    logger.info(f"Message from {chat_id}: {user_text[:50]}...")
    await handle_agent_request(update.message, user_text, chat_id, context)

async def post_init(application):
    """Callback for bot initialization."""
    await set_bot_metadata(application)

def setup_application(token: str):
    """Initializes the Telegram application with all handlers."""
    application = ApplicationBuilder().token(token).post_init(post_init).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("wallet", my_wallet_command))
    application.add_handler(CommandHandler("clear", clear_command))
    application.add_handler(CallbackQueryHandler(handle_callback))
    application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_message))
    
    return application

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN not found in environment.")
        return

    application = setup_application(token)
    logger.info("Ouwibo Telegram Bot is starting (Polling)...")
    application.run_polling()

if __name__ == "__main__":
    main()

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

BOT_TOKEN = "7616964266:AAEgnLgIzVLu4Wny9-c6APDAu6YWwKfyqz0"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("Mở Mini App", web_app={"url": "https://tracker-gilt-rho.vercel.app/"})]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Bấm để mở Mini App:", reply_markup=reply_markup)

app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(CommandHandler("start", start))
app.run_polling()

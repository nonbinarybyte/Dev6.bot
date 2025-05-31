import os
import discord
from discord.ext import commands
from discord import app_commands
from aiohttp import web

BOT_TOKEN = os.getenv("BOT_TOKEN")
GUILD_ID = 1361525537545125928  # your guild ID

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# Simple test slash command
@bot.tree.command(name="ping", description="Test if bot is responsive")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message("🏓 Pong!", ephemeral=True)

# Webhook server setup
routes = web.RouteTableDef()

@routes.post("/github")
async def github_webhook(request):
    return web.Response(text="OK")

app = web.Application()
app.add_routes(routes)

async def run_webhook_server():
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 8080)
    await site.start()
    print("✅ Webhook server running at http://0.0.0.0:8080/github")

@bot.event
async def setup_hook():
    await run_webhook_server()

    try:
        guild = discord.Object(id=GUILD_ID)
        print("🔁 Syncing commands to guild...")
        bot.tree.clear_commands(guild=guild)
        synced = await bot.tree.sync(guild=guild)
        print(f"✅ Synced {len(synced)} command(s) to guild {GUILD_ID}")
    except Exception as e:
        print(f"❌ Sync failed: {e}")

@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user} (ID: {bot.user.id})")

bot.run(BOT_TOKEN)

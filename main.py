import os
import discord
from discord.ext import commands
from aiohttp import web
import json

# --- CONFIG ---
BOT_TOKEN = os.getenv('BOT_TOKEN') # Replace with your bot token
CONFIG_FILE = 'server_config.json'

# --- GLOBAL STATE ---
server_config = {}

# --- DISCORD BOT SETUP ---
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# --- CONFIG MANAGEMENT ---
def save_config():
    with open(CONFIG_FILE, 'w') as f:
        json.dump(server_config, f, indent=2)

def load_config():
    global server_config
    try:
        with open(CONFIG_FILE, 'r') as f:
            server_config = json.load(f)
    except FileNotFoundError:
        server_config = {}

# --- SLASH COMMANDS ---
@bot.tree.command(name="set_channel", description="Set the announcement channel")
async def set_channel(interaction: discord.Interaction):
    guild_id = str(interaction.guild_id)
    server_config.setdefault(guild_id, {})["channel_id"] = interaction.channel_id
    save_config()
    await interaction.response.send_message("✅ This channel is now set for GitHub commit announcements.", ephemeral=True)

@bot.tree.command(name="set_template", description="Set message template for a repo")
async def set_template(interaction: discord.Interaction, repo: str, template: str):
    guild_id = str(interaction.guild_id)
    server_config.setdefault(guild_id, {}).setdefault("templates", {})[repo] = template
    save_config()
    await interaction.response.send_message(f"✅ Template set for `{repo}`:\n```{template}```", ephemeral=True)

@bot.tree.command(name="map_repo", description="Link a GitHub repo to this server")
async def map_repo(interaction: discord.Interaction, repo: str):
    guild_id = str(interaction.guild_id)
    server_config.setdefault(guild_id, {}).setdefault("repo_map", [])

    if repo not in server_config[guild_id]["repo_map"]:
        server_config[guild_id]["repo_map"].append(repo)
        save_config()
        await interaction.response.send_message(f"✅ Repo `{repo}` linked to this server.", ephemeral=True)
    else:
        await interaction.response.send_message(f"ℹ️ Repo `{repo}` is already linked.", ephemeral=True)

# --- SEND COMMIT ANNOUNCEMENT ---
async def send_commit_announcement(guild_id, repo_name, commit_url, message, author):
    config = server_config.get(str(guild_id))
    if not config:
        return

    channel = bot.get_channel(config.get("channel_id"))
    if not channel:
        return

    template = config.get("templates", {}).get(
        repo_name,
        "🚀 Commit to {repo} by {author}: `{message}` → {url}"
    )
    formatted = template.format(repo=repo_name, author=author, message=message, url=commit_url)

    embed = discord.Embed(
        title="📌 GitHub Commit",
        description=formatted,
        color=discord.Color.green()
    )
    await channel.send(content="@everyone", embed=embed)

# --- GITHUB WEBHOOK HANDLER ---
routes = web.RouteTableDef()

@routes.post("/github")
async def github_webhook(request):
    data = await request.json()
    repo_name = data.get("repository", {}).get("full_name")

    guild_id = None
    for gid, config in server_config.items():
        if repo_name in config.get("repo_map", []):
            guild_id = gid
            break

    if not guild_id:
        return web.Response(text="Repo not mapped to a Discord server", status=400)

    for commit in data.get("commits", []):
        await send_commit_announcement(
            guild_id=guild_id,
            repo_name=repo_name,
            commit_url=commit["url"],
            message=commit["message"],
            author=commit["author"]["name"]
        )

    return web.Response(text="OK")

app = web.Application()
app.add_routes(routes)

# --- STARTUP ---
async def run_webhook_server():
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    print("Webhook server running at http://0.0.0.0:8080/github")

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")
    try:
        guild = discord.Object(id=1361525537545125928)  # Your server
        synced = await bot.tree.sync(guild=guild)
        print(f"✅ Synced {len(synced)} command(s) to the test server!")
    except Exception as e:
        print(f"❌ Failed to sync commands: {e}")

@bot.event
async def setup_hook():
    await run_webhook_server()
    # Debug: check loaded commands
for cmd in bot.tree.get_commands():
    print(f"🔍 Found command: {cmd.name}")
    
try:
    guild = discord.Object(id=1361525537545125928)
    synced = await bot.tree.sync(guild=guild)
    print(f"✅ Synced {len(synced)} command(s) to your server!")
except Exception as e:
    print(f"❌ Slash command sync failed: {e}")


bot.run(BOT_TOKEN)

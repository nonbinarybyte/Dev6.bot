import express from 'express';
import { Client, GatewayIntentBits, Collection, Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Repo from '../mongo/schema.js';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Health check for Render
app.get('/', (_, res) => res.send('Bot is running.'));

// GitHub webhook
app.post('/webhook', async (req, res) => {
  const { repository, head_commit } = req.body;

  if (!repository || !head_commit) return res.status(400).send('Invalid payload');

  const repoDoc = await Repo.findOne({ repoUrl: repository.html_url });
  if (!repoDoc) return res.status(404).send('No matching repo');

  const channel = client.channels.cache.get(repoDoc.channelId);
  if (!channel) return res.status(404).send('Channel not found');

  const ping = repoDoc.pingRole === 'everyone' ? '@everyone' : `<@&${repoDoc.pingRole}>`;

  await channel.send({
    content: ping,
    embeds: [{
      title: `🔧 ${head_commit.message}`,
      description: `[View Commit](${head_commit.url})`,
      footer: { text: `Pushed by ${head_commit.author.name}` },
      color: 0x7289DA
    }]
  });

  res.send('Posted!');
});

// Discord client setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = (await import(filePath)).default;
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'There was an error.', ephemeral: true });
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'customMessage') {
      const title = interaction.fields.getTextInputValue('title');
      const description = interaction.fields.getTextInputValue('description');
      const image = interaction.fields.getTextInputValue('image');

      const embed = {
        title,
        description,
        color: 0xFF66CC
      };

      if (image) embed.image = { url: image };

      await interaction.reply({ embeds: [embed] });
    }
  }
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🗃️ Connected to MongoDB');
    client.login(process.env.DISCORD_TOKEN);
    app.listen(process.env.PORT || 3000, () => {
      console.log(`🌐 Web server running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

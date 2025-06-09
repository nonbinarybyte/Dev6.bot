import { Client, GatewayIntentBits, Collection, Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

import Repo from '../mongo/schema.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(path.resolve(), 'bot', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = (await import(filePath)).default;
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction);
  } else if (interaction.isModalSubmit() && interaction.customId === 'customMessage') {
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    const image = interaction.fields.getTextInputValue('image');

    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x00b0f4);
    if (image) embed.setImage(image);

    const repoData = await Repo.findOne({ guildId: interaction.guildId });
    const pingRole = repoData?.pingRole ?? '@everyone';

    await interaction.reply({ content: pingRole === 'everyone' ? '@everyone' : `<@&${pingRole}>`, embeds: [embed] });
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI).then(() => console.log('📦 MongoDB connected'));

// Express Webhook Listener (for Render deployment)
const app = express();
app.use(bodyParser.json());

app.get('/', (_, res) => res.send('Bot is alive'));

app.post('/webhook', async (req, res) => {
  const { repository, head_commit, pusher } = req.body;
  const repoUrl = repository?.html_url;
  const message = head_commit?.message;
  const author = pusher?.name;

  const repoData = await Repo.findOne({ repoUrl });
  if (!repoData) return res.status(200).send('No repo config');

  const channel = await client.channels.fetch(repoData.channelId);
  if (!channel) return res.status(404).send('Channel not found');

  await channel.send({
    content: `📌 New commit in **${repository.name}** by **${author}**\n📝 ${message}\n🔗 ${head_commit.url}`
  });

  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Webhook server running on port ${PORT}`));

client.login(process.env.DISCORD_TOKEN);

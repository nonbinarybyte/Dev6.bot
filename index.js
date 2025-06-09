// File: bot/commands/set.js
import { SlashCommandBuilder } from 'discord.js';
import Repo from '../../mongo/schema.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set')
    .setDescription('Set GitHub repo to watch')
    .addStringOption(opt => opt.setName('repo').setDescription('GitHub repo URL').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post commits').setRequired(true)),

  async execute(interaction) {
    const repo = interaction.options.getString('repo');
    const channel = interaction.options.getChannel('channel');

    await Repo.findOneAndUpdate(
      { guildId: interaction.guildId },
      { repoUrl: repo, channelId: channel.id },
      { upsert: true }
    );

    await interaction.reply(`✅ Repository set to: ${repo}, channel: ${channel}`);
  }
};

// File: bot/commands/ping.js
import { SlashCommandBuilder } from 'discord.js';
import Repo from '../../mongo/schema.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Set role to ping in commit messages')
    .addRoleOption(opt => opt.setName('role').setDescription('Role to ping (leave blank for everyone)')),

  async execute(interaction) {
    const role = interaction.options.getRole('role');

    const pingRole = role ? role.id : 'everyone';

    await Repo.findOneAndUpdate(
      { guildId: interaction.guildId },
      { pingRole },
      { upsert: true }
    );

    await interaction.reply(`✅ Ping role set to: ${role ? role.name : '@everyone'}`);
  }
};

// File: bot/commands/ping-lat.js
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping-lat')
    .setDescription('Check bot latency'),

  async execute(interaction) {
    await interaction.reply(`🏓 Pong! Latency is ${Date.now() - interaction.createdTimestamp}ms.`);
  }
};

// File: bot/commands/message.js
import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('message')
    .setDescription('Send a custom modal message'),

  async execute(interaction) {
    const modal = new ModalBuilder().setCustomId('customMessage').setTitle('Create Custom Message');

    const title = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const desc = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const img = new TextInputBuilder()
      .setCustomId('image')
      .setLabel('Image URL (optional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(title),
      new ActionRowBuilder().addComponents(desc),
      new ActionRowBuilder().addComponents(img)
    );

    await interaction.showModal(modal);
  }
};

// File: deploy-commands.js
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

const commands = [];
const commandsPath = path.join(path.resolve(), 'bot', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = (await import(path.join(commandsPath, file))).default;
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log('📝 Refreshing application commands...');
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('✅ Successfully reloaded commands.');
} catch (error) {
  console.error('❌ Error loading commands:', error);
}

import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Set the role to ping for announcements')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to ping (leave empty for @everyone)')),
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const pingTarget = role ? role.toString() : '@everyone';
    
    // Store in database (pseudo-code)
    // await db.setPingRole(interaction.guildId, role?.id || 'everyone');
    
    await interaction.reply({
      content: `✅ Announcements will now ping ${pingTarget}`,
      ephemeral: true
    });
  },
};

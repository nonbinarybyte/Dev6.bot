import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping-lat')
    .setDescription("Check bot's latency and status"),
  async execute(interaction) {
    const sent = await interaction.reply({ 
      content: 'Pinging...', 
      fetchReply: true,
      ephemeral: true 
    });
    
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    await interaction.editReply(
      `🏓 Pong!\n` +
      `• Bot Latency: ${latency}ms\n` +
      `• API Latency: ${apiLatency}ms\n` +
      `• Status: Online ✅`
    );
  },
};

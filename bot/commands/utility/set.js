import { SlashCommandBuilder } from 'discord.js';
import { Octokit } from '@octokit/rest';

export default {
  data: new SlashCommandBuilder()
    .setName('set')
    .setDescription('Set a GitHub repository to post updates to this channel')
    .addStringOption(option =>
      option.setName('repo')
        .setDescription('GitHub repository URL')
        .setRequired(true)),
  async execute(interaction) {
    const repoUrl = interaction.options.getString('repo');
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    try {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) throw new Error('Invalid GitHub URL');

      const [_, owner, repo] = match;
      
      // Verify repo exists
      await octokit.repos.get({ owner, repo });
      
      // Store in database (pseudo-code - implement your actual storage)
      // await db.setChannelRepo(interaction.channelId, { owner, repo });
      
      await interaction.reply(`✅ This channel will now receive updates from ${owner}/${repo}`);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: '❌ Failed to set repository. Make sure:\n- URL is valid\n- Repository exists\n- Bot has access',
        ephemeral: true
      });
    }
  },
};

import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('message')
    .setDescription('Create a formatted announcement message'),
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('announcementModal')
      .setTitle('Create Announcement');

    const titleInput = new TextInputBuilder()
      .setCustomId('titleInput')
      .setLabel("Message Title")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('descriptionInput')
      .setLabel("Message Description")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const imageInput = new TextInputBuilder()
      .setCustomId('imageInput')
      .setLabel("Image URL (optional)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
    const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(imageInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
    await interaction.showModal(modal);
  },
};

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, Events } = require('discord.js');

module.exports = {
  name: 'appeal',
  description: 'Start a ban appeal form',
  async execute(message) {
    const modal = new ModalBuilder()
      .setCustomId('ban_appeal_modal')
      .setTitle('Ban Appeal Form');

    const whyBannedInput = new TextInputBuilder()
      .setCustomId('why_banned')
      .setLabel('Why were you banned?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);

    const whyUnbannedInput = new TextInputBuilder()
      .setCustomId('why_unbanned')
      .setLabel('Why should you be unbanned? (5+ sentences required)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000);

    const firstRow = new ActionRowBuilder().addComponents(whyBannedInput);
    const secondRow = new ActionRowBuilder().addComponents(whyUnbannedInput);

    modal.addComponents(firstRow, secondRow);

    await message.channel.send(`${message.author}, please check your Discord app for the appeal form!`);
    await message.author.send({ content: 'Click the button below to start your appeal:' }).then(dm => {
      dm.channel.send({ components: [] });
    }).catch(() => {
      message.reply('❗ I couldn\'t send you a DM. Please check your privacy settings.');
    });

    await message.author.send({ content: 'Please fill out this appeal form:', components: [] }).then(async dm => {
      await dm.showModal(modal).catch(console.error);
    });
  },

  async setup(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId !== 'ban_appeal_modal') return;

      const whyBanned = interaction.fields.getTextInputValue('why_banned');
      const whyUnbanned = interaction.fields.getTextInputValue('why_unbanned');

      const embed = new EmbedBuilder()
        .setTitle('📝 Ban Appeal Submitted')
        .setDescription(`A user has submitted a ban appeal:`)
        .addFields(
          { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})` },
          { name: 'Why were you banned?', value: whyBanned },
          { name: 'Why should you be unbanned?', value: whyUnbanned }
        )
        .setColor(0xB00000)
        .setTimestamp();

      const reviewChannelId = '1390957675311009902'; // Replace with the channel ID where staff reviews appeals
      const reviewChannel = await interaction.client.channels.fetch(reviewChannelId);
      if (!reviewChannel) {
        return interaction.reply({ content: '⚠️ Failed to find the review channel.', ephemeral: true });
      }

      await reviewChannel.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Your appeal has been submitted. Staff will review it soon.', ephemeral: true });
    });
  }
};

const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'application',
  description: 'Accept or deny a user\'s application',
  async execute(message, args) {
    if (!message.member.roles.cache.some(role => role.name === 'Discord Moderator')) {
      return message.reply('❌ Only users with the **Discord Moderator** role can use this command.');
    }

    const [action, mention, appType, ...reasonArr] = args;
    const reason = reasonArr.join(' ') || 'No reason provided';

    if (!['accept', 'deny'].includes(action?.toLowerCase())) {
      return message.reply('Usage: `!application accept|deny @user <type> <reason>`');
    }

    const user = message.mentions.members.first();
    if (!user) return message.reply('❌ Please mention a valid user.');
    if (!appType) return message.reply('❌ Please specify the type of application.');

    const accepted = action.toLowerCase() === 'accept';
    const embed = new EmbedBuilder()
      .setTitle(accepted ? `✅ Application Accepted` : `❌ Application Denied`)
      .setColor(accepted ? 0x2ecc71 : 0xe74c3c)
      .setDescription(
        accepted
          ? `**Your ${appType} application has been accepted!**\n\nI'm pleased to inform you that your application met our criteria and has been accepted by a member of our HR Team.\n\n**Reason:** ${reason}`
          : `**Your ${appType} application has been denied.**\n\nUnfortunately, your application did not meet our current requirements.\n\n**Reason:** ${reason}`
      )
      .setFooter({ text: `User ID: ${user.id}` })
      .setTimestamp();

    const reviewedByButton = new ButtonBuilder()
      .setLabel(`Reviewed by ${message.author.tag}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
      .setCustomId('reviewed_by'); // required even if disabled

    const row = new ActionRowBuilder().addComponents(reviewedByButton);

    try {
      await user.send({ embeds: [embed], components: [row] });
    } catch {
      await message.channel.send(`⚠️ Couldn't DM <@${user.id}>.`);
    }

    // Post in results channel
    const resultChannel = message.guild.channels.cache.get('1380691912234897518');
    if (resultChannel) {
      await resultChannel.send({
        content: `<@${user.id}>`,
        embeds: [embed],
        components: [row]
      });
    }

    await message.channel.send({
      content: `${accepted ? '✅ Accepted' : '❌ Denied'} ${user}`,
      embeds: [embed],
      components: [row]
    });
  }
};



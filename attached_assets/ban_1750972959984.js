const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ban',
  description: 'Ban a user.',
  permissions: PermissionsBitField.Flags.BanMembers,

  async execute(message, args) {
    if (!message.member.permissions.has(this.permissions)) {
      return message.reply("❌ You don't have permission to ban members.");
    }

    const user = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!user) return message.reply("❌ Please mention a user to ban.");
    if (!user.bannable) return message.reply("❌ I cannot ban this user.");

    try {
      await user.ban({ reason });
      const embed = new EmbedBuilder()
        .setTitle('⛔ User Banned')
        .addFields(
          { name: 'User', value: `<@${user.id}>`, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Banned by', value: `<@${message.author.id}>`, inline: true }
        )
        .setColor('DarkRed')
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply('⚠️ Failed to ban user.');
    }
  }
};


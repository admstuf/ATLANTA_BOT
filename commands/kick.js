
const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Kick a user.',
  permissions: PermissionsBitField.Flags.KickMembers,

  async execute(message, args) {
    if (!message.member.permissions.has(this.permissions)) {
      return message.reply("❌ You don't have permission to kick members.");
    }

    const user = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!user) return message.reply("❌ Please mention a user to kick.");
    if (!user.kickable) return message.reply("❌ I cannot kick this user.");

    try {
      await user.kick(reason);
      const embed = new EmbedBuilder()
        .setTitle('👢 User Kicked')
        .addFields(
          { name: 'User', value: `<@${user.id}>`, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Kicked by', value: `<@${message.author.id}>`, inline: true }
        )
        .setColor('Red')
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply('⚠️ Failed to kick user.');
    }
  }
};

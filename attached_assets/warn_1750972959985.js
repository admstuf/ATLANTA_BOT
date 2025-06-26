const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'warn',
  description: 'Warn a user with a reason.',
  permissions: PermissionsBitField.Flags.ManageMessages,

  async execute(message, args) {
    if (!message.member.permissions.has(this.permissions)) {
      return message.reply("❌ You don't have permission to warn members.");
    }

    const user = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!user) return message.reply("❌ Please mention a user to warn.");

    const embed = new EmbedBuilder()
      .setTitle('⚠️ User Warned')
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Warned by', value: `<@${message.author.id}>`, inline: true }
      )
      .setColor('Gold')
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
};


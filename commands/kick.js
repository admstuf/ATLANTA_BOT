const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Kick a user.',

  async execute(message, args) {
    const allowedRoleId = '1390448241828565002'; // role required for kick command

    if (!message.member.roles.cache.has(allowedRoleId)) {
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
        .setThumbnail('https://cdn.discordapp.com/icons/1373057856571441152/6c0b987aaf2152ce0f99b87e1488d532.webp?size=1024')
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply('⚠️ Failed to kick user.');
    }
  }
};


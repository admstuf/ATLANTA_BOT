const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ban',
  description: 'Ban a user.',

  async execute(message, args) {
    const allowedRoleId = '1390759296232587325'; // role required for ban command

    if (!message.member.roles.cache.has(allowedRoleId)) {
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
        .setThumbnail('https://cdn.discordapp.com/icons/1373057856571441152/6c0b987aaf2152ce0f99b87e1488d532.webp?size=1024')
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply('⚠️ Failed to ban user.');
    }
  }
};


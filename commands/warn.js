const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'warn',
  description: 'Warn a member.',
  async execute(message, args) {
    const allowedRoleId = '1390448241828565002'; // role required for warn command

    if (!message.member.roles.cache.has(allowedRoleId)) {
      return message.reply('🚫 You do not have permission to use this command.');
    }

    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ');

    if (!member || !reason) {
      return message.reply('Usage: `!warn @user reason`');
    }

    // send DM to the warned member
    try {
      await member.send(`⚠️ You have been warned in **${message.guild.name}** for: ${reason}`);
    } catch (err) {
      console.log('Could not DM the user.');
    }

    // send confirmation embed in the current channel
    const embed = new EmbedBuilder()
      .setTitle('User Warned')
      .addFields(
        { name: 'User', value: `${member.user.tag}`, inline: true },
        { name: 'Moderator', value: `${message.author.tag}`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setColor('Orange')
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
};



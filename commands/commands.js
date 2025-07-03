const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'commands',
  description: 'List all available commands.',

  async execute(message) {
    const allowedRoleId = '1390447159249211587'; // role allowed to view commands

    if (!message.member.roles.cache.has(allowedRoleId)) {
      return message.reply("❌ You don't have permission to view the commands list.");
    }

    const embed = new EmbedBuilder()
      .setTitle('Available Commands')
      .setDescription(
        '**Moderation Commands (Role 1390448241828565002 required):**\n' +
        '`!ban @user [reason]` - Ban a user\n' +
        '`!kick @user [reason]` - Kick a user\n' +
        '`!warn @user [reason]` - Warn a user\n\n' +
        '**Application Commands (Role 1390447159249211587 required):**\n' +
        '`!application accept/deny <@user> <type> <reason>` - Accept or deny applications\n' +
        '`!partner <@user>` - Partner with a user\n\n' +
        '**Other Commands:**\n' +
        '`!commands` - Show this list'
      )
      .setColor('#0099ff')
      .setThumbnail('https://cdn.discordapp.com/icons/1373057856571441152/6c0b987aaf2152ce0f99b87e1488d532.webp?size=1024')
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
};



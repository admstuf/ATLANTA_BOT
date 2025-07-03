const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'commands',
  description: 'List all available commands with role info.',
  async execute(message) {
    const traineeModRole = '<@&1390447159249211587>'; // application, partner role
    const modRole = '<@&1390448241828565002>'; // ban, kick, warn role

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🤖 Atlanta Roleplay Bot Commands')
      .setThumbnail('https://cdn.discordapp.com/icons/1373057856571441152/6c0b987aaf2152ce0f99b87e1488d532.webp?size=1024')
      .addFields(
        {
          name: 'Application & Partner Commands',
          value: `${traineeModRole} role required\n` +
                 '`!application` - Accept or deny applications\n' +
                 '`!partner` - Send partner invite embed',
        },
        {
          name: 'Moderation Commands',
          value: `${modRole} role required\n` +
                 '`!ban` - Ban a user\n' +
                 '`!kick` - Kick a user\n' +
                 '`!warn` - Warn a user',
        },
        {
          name: 'General',
          value: '`!commands` - Show this list',
        }
      )
      .setFooter({ text: 'Atlanta Roleplay Bot' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
};






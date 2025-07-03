const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'commands',
  description: 'List all available commands with role info.',
  async execute(message) {
    const traineeModRole = '<@&1390447159249211587>'; // application, partner role
    const modRole = '<@&1390448241828565002>'; // ban, kick, warn role

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Atlanta Roleplay Bot Commands')
      .setThumbnail('https://cdn.discordapp.com/attachments/1385162246707220551/1390213797897179218/IMG_5237-removebg-preview.png?ex=686819be&is=6866c83e&hm=a592788b28acba6f939c409ee7c8bc64159675f23449428055c6b0c575ab330f&')
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






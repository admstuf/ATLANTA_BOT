
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'commands',
  description: 'List all available bot commands.',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Bot Commands')
      .setColor(0x0099ff)
      .setDescription('Here are the commands you can use with this bot:')
      .addFields(
        { name: '!mute @user <minutes> <reason>', value: 'Mute a user temporarily.' },
        { name: '!warn @user <reason>', value: 'Warn a user.' },
        { name: '!kick @user <reason>', value: 'Kick a user from the server.' },
        { name: '!ban @user <reason>', value: 'Ban a user from the server.' },
        { name: '!application accept|deny @user <type> <reason>', value: 'Accept or deny an application.' },
        { name: '!restart', value: 'Restart the bot (Discord Moderator only).' },
        { name: '!commands', value: 'Show this command list.' }
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp();

    try {
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send commands embed:', error);
      await message.reply('⚠️ Could not send the commands list.');
    }
  }
};

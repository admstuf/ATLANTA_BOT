const { MessageEmbed } = require('discord.js');

module.exports = {
  name: 'appeal',
  description: 'Submit a ban appeal',
  async execute(message) {
    if (message.author.bot) return;

    try {
      await message.reply('Please answer the following questions within 5 minutes. Reply with your **roblox username**:');

      const filter = m => m.author.id === message.author.id;
      const collectedUsername = await message.channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
      const robloxUsername = collectedUsername.first().content;

      await message.reply('Why were you banned? Please answer in 5 or more sentences:');
      const collectedBanReason = await message.channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
      const banReason = collectedBanReason.first().content;

      await message.reply('Why should you be unbanned? Please answer in 5 or more sentences:');
      const collectedUnbanReason = await message.channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
      const unbanReason = collectedUnbanReason.first().content;

      const appealEmbed = new MessageEmbed()
        .setTitle('Ban Appeal')
        .setColor('RED')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .addFields(
          { name: 'User', value: `<@${message.author.id}>` },
          { name: 'Roblox Username', value: robloxUsername },
          { name: 'Why were you banned?', value: banReason },
          { name: 'Why should you be unbanned?', value: unbanReason }
        )
        .setTimestamp();

      const appealsChannel = message.guild.channels.cache.get('1390957675311009902');
      if (!appealsChannel) return message.reply('Appeals channel not found. Please contact an admin.');

      await appealsChannel.send({ embeds: [appealEmbed] });
      await message.reply('Your appeal has been submitted. Staff will review it and get back to you.');
    } catch (err) {
      console.log(err);
      await message.reply('You did not reply in time. Appeal cancelled.');
    }
  },
};



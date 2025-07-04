const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'partner',
  description: 'Send a partnership announcement.',
  async execute(message, args) {
    const allowedRoleId = '1390759183376453764'; // updated Trainee Discord Moderator role

    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    if (args.length < 3) {
      const reply = await message.reply('**Usage:** `!partner [representative] [invite link] [message]`');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const representativeMention = args[0];
    const inviteLink = args[1];
    const customMessage = args.slice(2).join(' ');

    const userIdMatch = representativeMention?.match(/^<@!?(\d+)>$/);
    if (!userIdMatch) {
      const reply = await message.reply('Please mention a valid representative.');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const representativeId = userIdMatch[1];

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🤝 New Partnership Established!')
      .setDescription(customMessage)
      .addFields(
        { name: 'Representative', value: `<@${representativeId}>`, inline: true },
        { name: 'Server Invite', value: inviteLink, inline: true }
      )
      .setThumbnail('https://cdn.discordapp.com/icons/1373057856571441152/6c0b987aaf2152ce0f99b87e1488d532.webp?size=1024')
      .setFooter({ text: `Representative ID: ${representativeId}` })
      .setTimestamp();

    const partnerButton = new ButtonBuilder()
      .setLabel('Atlanta Roleplay Affiliates')
      .setStyle(ButtonStyle.Link)
      .setURL(inviteLink);

    const row = new ActionRowBuilder().addComponents(partnerButton);

    const partnershipChannel = message.guild.channels.cache.get('1380691912234897518'); // replace with your partnership channel ID if different
    if (!partnershipChannel) {
      const reply = await message.reply('⚠️ **Error:** Could not find the partnership channel.');
      return setTimeout(() => reply.delete().catch(() => {}), 15000);
    }

    try {
      await partnershipChannel.send({
        content: `<@${representativeId}>`,
        embeds: [embed],
        components: [row]
      });

      const confirmation = await message.reply(`✅ Partnership announcement sent in <#1380691912234897518>!`);
      setTimeout(() => confirmation.delete().catch(() => {}), 8000);
    } catch (error) {
      console.error('Partner command error:', error);
      const errorReply = await message.reply('⚠️ **Error:** Failed to post partnership announcement.');
      setTimeout(() => errorReply.delete().catch(() => {}), 10000);
    }
  },
};





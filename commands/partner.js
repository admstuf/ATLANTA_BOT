const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'partner',
  description: 'Send a partner invite embed with a custom message.',
  async execute(message, args) {
    // permissions check (adjust role id as needed)
    const allowedRoleId = '1390447159249211587'; 
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    if (args.length < 3) {
      const reply = await message.reply('**Usage:** `!partner [representative] [invite link] [message]`');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const representative = args[0];
    const inviteLink = args[1];
    const customMessage = args.slice(2).join(' ');

    // Validate invite link format (basic check)
    if (!inviteLink.startsWith('http')) {
      const reply = await message.reply('Please provide a valid invite link starting with http/https.');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🤝 Atlanta Roleplay Affiliates')
      .setDescription(customMessage)
      .addFields(
        { name: 'Representative', value: representative, inline: true },
        { name: 'Invite Link', value: inviteLink, inline: true }
      )
      .setThumbnail('https://cdn.discordapp.com/attachments/1385162246707220551/1390213797897179218/IMG_5237-removebg-preview.png?ex=686819be&is=6866c83e&hm=a592788b28acba6f939c409ee7c8bc64159675f23449428055c6b0c575ab330f&')
      .setTimestamp();

    // Button labeled "Atlanta Roleplay Affiliates" linking to invite
    const button = new ButtonBuilder()
      .setLabel('Atlanta Roleplay Affiliates')
      .setStyle(ButtonStyle.Link)
      .setURL(inviteLink);

    const row = new ActionRowBuilder().addComponents(button);

    try {
      await message.channel.send({ embeds: [embed], components: [row] });

      const confirmation = await message.reply('✅ Partner invite sent!');
      setTimeout(() => confirmation.delete().catch(() => {}), 7000);
    } catch (error) {
      console.error('Partner command error:', error);
      const errorReply = await message.reply('⚠️ Failed to send partner invite. Please try again.');
      setTimeout(() => errorReply.delete().catch(() => {}), 10000);
    }
  },
};




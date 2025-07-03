const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'partner',
  description: 'Create a partnership announcement.',
  async execute(message, args) {
    const allowedRoleId = '1390447159249211587';

    // role check
    if (!message.member.roles.cache.has(allowedRoleId)) {
      return message.reply('🚫 You do not have the required role to use this command.');
    }

    // basic usage validation
    if (args.length < 2) {
      return message.reply('Usage: `!partner <@partnerUser> <partnershipDetails>`');
    }

    const partnerMention = args[0];
    const partnershipDetails = args.slice(1).join(' ');

    // validate mention
    const partnerIdMatch = partnerMention.match(/^<@!?(\d+)>$/);
    if (!partnerIdMatch) {
      return message.reply('Please mention a valid user to partner with.');
    }

    const partnerId = partnerIdMatch[1];

    // create embed
    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('🤝 New Partnership Established!')
      .setDescription(partnershipDetails)
      .addFields(
        { name: 'Partnered With', value: `<@${partnerId}>`, inline: false }
      )
      .setThumbnail('https://cdn.discordapp.com/attachments/1385162246707220551/1390213797897179218/IMG_5237-removebg-preview.png?ex=686819be&is=6866c83e&hm=a592788b28acba6f939c409ee7c8bc64159675f23449428055c6b0c575ab330f&')
      .setFooter({ text: 'Atlanta Roleplay | Partnership Program' })
      .setTimestamp();

    // create disabled partner button
    const partnerButton = new ButtonBuilder()
      .setLabel(`Partner: ${message.guild.members.cache.get(partnerId)?.displayName || 'Unknown'}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
      .setCustomId('partner_with');

    const row = new ActionRowBuilder().addComponents(partnerButton);

    try {
      const sentMessage = await message.channel.send({
        embeds: [embed],
        components: [row],
      });

      // add handshake reaction automatically
      await sentMessage.react('🤝');
    } catch (error) {
      console.error('Partner command error:', error);
      message.reply('⚠️ An error occurred while creating the partnership announcement.');
    }
  },
};



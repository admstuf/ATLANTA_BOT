const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require('discord.js');
const moment = require('moment');

module.exports = {
  name: 'ticket',
  description: 'Post the support ticket panel.',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor('#B22222')
      .setTitle('Atlanta Roleplay Support')
      .setThumbnail('https://cdn.discordapp.com/attachments/1385162246707220551/1390952762212352071/IMG_5237-removebg-preview.png')
      .setDescription(
        "**Atlanta Roleplay Support**\n" +
        "If you wish to report a member or a staff, need to partner with our server, apply for our media team, or have a general question, this is the place to do it! Please select a category where it says 'Select a Category' and click the ticket you want to open. Opening false tickets can result in a warning.\n\n" +
        "-----------------------------------\n\n" +
        "**❓ | General Support**: Open a general support ticket if you have a general question about the server, the game, or anything else! (You can use this to get help from HR without pinging them in general).\n\n" +
        "**🤝 | Partnership**: Open this ticket if you are interested in partnering with our server! Make sure you have **at least 50 members**. You can also open this ticket if you have a question about your partnership.\n\n" +
        "**⚠️ | Management Support**: Open this ticket if you are reporting an Atlanta Roleplay staff member. You can also open this ticket to get support from management (only for major questions, if not a major question, please open a general support ticket).\n\n" +
        "**🎮 | In-game Support**: To report an in-game player. Usually used for mod scenes! **Make sure to upload clips with Medal, Streamable, or Youtube links.** Not doing so will result in your report being denied by staff members.\n\n" +
        "**📷 | Media Application**: Open this ticket to apply for Atlanta Media Team! Make sure you have at least 2-5 pictures of high quality and edited. Make sure your pictures aren't heavily supported by shaders or other applications. Make sure your 13+ and are not banned in-game or have a large punishment history.\n\n" +
        "Please do not ping HR in general or in any channels to ask questions, but please open these tickets. Not doing so may result in a warning, or a kick depending on severity. Have a great day!"
      );

    const select = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Select a Category')
      .addOptions([
        { label: 'General Support', value: 'general', emoji: '❓' },
        { label: 'Partnership', value: 'partnership', emoji: '🤝' },
        { label: 'Management Support', value: 'management', emoji: '⚠️' },
        { label: 'In-game Support', value: 'ingame', emoji: '🎮' },
        { label: 'Media Application', value: 'media', emoji: '📷' },
      ]);

    const selectRow = new ActionRowBuilder().addComponents(select);

    try {
      await message.channel.send({ embeds: [embed], components: [selectRow] });
    } catch (err) {
      console.error('Failed to send ticket panel:', err);
      await message.reply('❌ Failed to post the ticket panel.');
    }
  },

  async setup(client) {
    client.on('interactionCreate', async interaction => {
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') {
        const categoryId = '1380177235499286638'; // your tickets category ID
        const modRoleId = '1379809709871071352'; // your staff role ID
        const user = interaction.user;
        const selected = interaction.values[0];

        const ticketName = `ticket-${selected}-${user.username}`.toLowerCase();

        const channel = await interaction.guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          parent: categoryId,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: modRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          ],
        });

        await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });

        let ticketMessage;
        switch (selected) {
          case 'general':
            ticketMessage = `Hello <@${user.id}>👋, thank you for opening a general ticket. Please explain your issue or request below.`;
            break;
          case 'partnership':
            ticketMessage = `Hello <@${user.id}>👋, thank you for opening a partnership ticket! A HR member will be with you shortly. Please fill out this format:\nServer Name:\nServer Owner:\nMembers without bots:\nServer link: (not ad)`;
            break;
          case 'management':
            ticketMessage = `Hello <@${user.id}>👋, thank you for opening a management support ticket. Please send the user of the staff member you are reporting and your form of proof. If you have another question, send it here.`;
            break;
          case 'ingame':
            ticketMessage = `Hello <@${user.id}>👋, thank you for opening an in-game support ticket. Make sure to upload clips with Medal, Streamable, or Youtube links. Not doing so will result in your report being denied by staff members.`;
            break;
          case 'media':
            ticketMessage = `Roblox username:\n\nAge:\n\nWhy do you want to apply?\n\nHow active will you be if you’re accepted?\n\nPlease showcase your previous work below. (Preferably ERLC Roleplay scenes. 2-5 pictures.)`;
            break;
          default:
            ticketMessage = `Hello <@${user.id}>, your ticket has been opened.`;
        }

        const embed = new EmbedBuilder()
          .setColor('#B22222')
          .setTitle('Atlanta Roleplay Ticket')
          .setDescription(ticketMessage)
          .setTimestamp();

        const claimButton = new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Success);

        const closeButton = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger);

        const buttonRow = new ActionRowBuilder().addComponents(claimButton, closeButton);

        await channel.send({ embeds: [embed], components: [buttonRow] });
      }

      // Claim ticket handler
      if (interaction.isButton() && interaction.customId === 'claim_ticket') {
        await interaction.update({ content: `✅ Ticket claimed by <@${interaction.user.id}>.`, components: [] });
      }

      // Close ticket handler
      if (interaction.isButton() && interaction.customId === 'close_ticket') {
        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 100 });
        const transcriptEmbed = new EmbedBuilder()
          .setTitle(`Transcript - ${channel.name}`)
          .setColor('#B22222')
          .setDescription(messages
            .reverse()
            .map(m => `[${moment(m.createdAt).format('M/D/YYYY, h:mm:ss A')}] ${m.author.tag}: ${m.content}`)
            .join('\n').slice(0, 4000) || 'No messages recorded.')
          .setTimestamp();

        const transcriptChannel = interaction.guild.channels.cache.get('1391251472515207219');
        if (transcriptChannel) await transcriptChannel.send({ embeds: [transcriptEmbed] });

        const starter = channel.permissionOverwrites.cache.find(perm => perm.type === 1);
        if (starter) {
          const starterUser = await interaction.guild.members.fetch(starter.id);
          starterUser.send({ embeds: [transcriptEmbed] }).catch(() => {});
        }

        await interaction.update({ content: 'Ticket closed and transcript sent.', embeds: [], components: [] });
        setTimeout(() => channel.delete().catch(() => {}), 5000);
      }
    });
  }
};













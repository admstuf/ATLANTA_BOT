const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
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
        "If you wish to report a member or staff, partner with our server, apply for media, or have a general question, please use the dropdown below. False tickets can result in a warning.\n\n" +
        "**❓ General Support**: Questions about the server/game.\n" +
        "**🤝 Partnership**: Partner with us (50+ members required).\n" +
        "**⚠️ Management Support**: Report staff or get management help.\n" +
        "**🎮 In-game Support**: Report players (clips required).\n" +
        "**📷 Media Application**: Apply for Media Team (2-5 HQ photos)."
      );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Select a Category')
      .addOptions([
        { label: 'General Support', value: 'general', emoji: '❓' },
        { label: 'Partnership', value: 'partnership', emoji: '🤝' },
        { label: 'Management Support', value: 'management', emoji: '⚠️' },
        { label: 'In-game Support', value: 'ingame', emoji: '🎮' },
        { label: 'Media Application', value: 'media', emoji: '📷' },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    try {
      await message.channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('Failed to send ticket panel:', err);
      await message.reply('❌ Failed to post the ticket panel.');
    }
  },

  async setup(client) {
    client.on('interactionCreate', async interaction => {
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') {
        const categoryId = '1380177235499286638'; // category for tickets
        const modRoleId = '1379809709871071352'; // staff role
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

        let messageContent;
        switch (selected) {
          case 'general':
            messageContent = `Hello <@${user.id}>👋, thank you for opening a general ticket. Please explain your issue or request below.`;
            break;
          case 'partnership':
            messageContent = `Hello <@${user.id}>👋, thank you for opening a partnership ticket! A HR member will be with you shortly. Please fill out this format:\nServer Name:\nServer Owner:\nMembers without bots:\nServer link: (not ad)`;
            break;
          case 'management':
            messageContent = `Hello <@${user.id}>👋, thank you for opening a management support ticket. Please send the user of the staff member you are reporting and your form of proof.`;
            break;
          case 'ingame':
            messageContent = `Hello <@${user.id}>👋, thank you for opening an in-game support ticket. Make sure to upload clips with Medal, Streamable, or Youtube links. Not doing so will result in your report being denied by staff members.`;
            break;
          case 'media':
            messageContent = `Roblox username:\n\nAge:\n\nWhy do you want to apply?\n\nHow active will you be if you’re accepted?\n\nPlease showcase your previous work below. (Preferably ERLC Roleplay scenes. 2-5 pictures.)`;
            break;
          default:
            messageContent = `Hello <@${user.id}>, your ticket has been opened.`;
        }

        const embed = new EmbedBuilder()
          .setColor('#B22222')
          .setTitle('Atlanta Roleplay Ticket')
          .setDescription(messageContent)
          .setTimestamp();

        const claimButton = new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Success);

        const closeButton = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger);

        const buttons = new ActionRowBuilder().addComponents(claimButton, closeButton);

        await channel.send({ embeds: [embed], components: [buttons] });
      }

      if (interaction.isButton()) {
        const channel = interaction.channel;

        if (interaction.customId === 'claim_ticket') {
          await interaction.update({ content: `✅ Ticket claimed by <@${interaction.user.id}>.`, embeds: [], components: [] });
        }

        if (interaction.customId === 'close_ticket') {
          const messages = await channel.messages.fetch({ limit: 100 });
          const transcript = messages
            .reverse()
            .map(m => `[${moment(m.createdAt).format('M/D/YYYY, h:mm:ss A')}] ${m.author.tag}: ${m.content}`)
            .join('\n')
            .slice(0, 4000) || 'No messages recorded.';

          const transcriptEmbed = new EmbedBuilder()
            .setTitle(`Transcript - ${channel.name}`)
            .setColor('#B22222')
            .setDescription(transcript)
            .setTimestamp();

          const logChannel = interaction.guild.channels.cache.get('1391251472515207219');
          if (logChannel) await logChannel.send({ embeds: [transcriptEmbed] });

          const ticketOwner = channel.permissionOverwrites.cache.find(po => po.type === 1);
          if (ticketOwner) {
            const starterUser = await interaction.guild.members.fetch(ticketOwner.id).catch(() => null);
            if (starterUser) starterUser.send({ embeds: [transcriptEmbed] }).catch(() => {});
          }

          await interaction.update({ content: 'Ticket closed and transcript sent.', embeds: [], components: [] });
          setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
      }
    });
  }
};














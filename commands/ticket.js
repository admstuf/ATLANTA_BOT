const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');

module.exports = {
  name: 'ticket',
  description: 'Open the ticket panel',
  async execute(message) {
    const allowedRoleId = '1387493566225322114'; // role allowed to run !ticket
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 Open a Ticket')
      .setDescription(
        `Open any of the tickets below and we will help you solve the issue you are having! If you are reporting a staff member, evidence is required. Choose the category below that fits your inquiry.\n\n`
        + `❓ | **General Support**: For general questions. Open this if no other category fits your topic!\n\n`
        + `🤝 | **Partnership**: Open this ticket if you are interested in partnering with our server!\n\n`
        + `⚠️ | **Management Support**: Open this ticket if you are reporting a staff member.\n\n`
        + `🎮 | **In-game Support**: To report a player in-game, used for mod scenes.\n\n`
        + `📷 | **Media Application**: Open this ticket to apply for Atlanta Media Team!`
      )
      .setColor('#B22222');

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_general').setLabel('❓ General').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_partnership').setLabel('🤝 Partnership').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_management').setLabel('⚠️ Management').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_ingame').setLabel('🎮 In-game').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_media').setLabel('📷 Media').setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({ embeds: [embed], components: [buttons] });
  },

  async setup(client) {
    client.on('interactionCreate', async interaction => {
      if (!interaction.isButton()) return;

      const categoryMap = {
        ticket_general: 'general',
        ticket_partnership: 'partnership',
        ticket_management: 'management',
        ticket_ingame: 'ingame',
        ticket_media: 'media'
      };

      const category = categoryMap[interaction.customId];
      if (!category) return;

      const categoryId = '1380177235499286638'; // new tickets category
      const user = interaction.user;

      const roleMap = {
        general: '1390942686026010645',
        partnership: '1379809709871071352',
        management: '1379809709871071352',
        ingame: '1379853523986022510',
        media: '1390951563366895647',
      };

      const allowedRole = roleMap[category];
      const channelName = `ticket-${category}-${user.username}`.toLowerCase();

      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: 0,
        parent: categoryId,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: allowedRole, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        ],
      });

      let ticketMessage;
      if (category === 'media') {
        ticketMessage = 'Roblox username:\n\nAge:\n\nWhy do you want to apply?\n\nHow active will you be if you’re accepted?\n\nPlease showcase your previous work below. (Preferably ERLC Roleplay scenes. 2-5 pictures.)';
      } else {
        ticketMessage = `Hello <@${user.id}>, thank you for opening a **${category}** ticket. Please explain your issue or request below.`;
      }

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
        .setDescription(ticketMessage)
        .setColor('#B22222');

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('🛡️ Claim Ticket').setStyle(ButtonStyle.Primary)
      );

      await channel.send({ content: `<@${user.id}>`, embeds: [ticketEmbed], components: [buttons] });
      await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });
    });

    client.on('interactionCreate', async interaction => {
      if (!interaction.isButton()) return;

      const { customId, channel, user } = interaction;
      if (customId === 'close_ticket') {
        const modal = new ModalBuilder()
          .setCustomId('close_ticket_modal')
          .setTitle('Close Ticket')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('close_reason')
                .setLabel('Reason for closing')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );
        return interaction.showModal(modal);
      }

      if (customId === 'claim_ticket') {
        await channel.send(`🛡️ Ticket claimed by ${interaction.user}. <@${channel.permissionOverwrites.cache.find(po => po.type === 1)?.id}>`);
        return interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
      }
    });

    client.on('interactionCreate', async interaction => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId !== 'close_ticket_modal') return;

      const reason = interaction.fields.getTextInputValue('close_reason');
      const channel = interaction.channel;
      const messages = await channel.messages.fetch({ limit: 100 });
      const ticketUser = channel.permissionOverwrites.cache.find(po => po.type === 1)?.id;
      const transcriptChannelId = '1391251472515207219';

      const transcript = messages
        .filter(m => !m.author.bot)
        .map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content}`)
        .reverse()
        .join('\n');

      const codeBlockTranscript = `\`\`\`\n${transcript}\n\`\`\``;

      const closeEmbed = new EmbedBuilder()
        .setTitle('🎫 Ticket Closed')
        .setDescription(`Ticket closed by ${interaction.user}\n**Reason:** ${reason}`)
        .setColor('#B22222')
        .setTimestamp();

      const transcriptChannel = interaction.guild.channels.cache.get(transcriptChannelId);
      if (transcriptChannel) {
        await transcriptChannel.send({ content: `Transcript for ${channel.name}:\n${codeBlockTranscript}` });
      }
      if (ticketUser) {
        const member = await interaction.guild.members.fetch(ticketUser).catch(() => null);
        if (member) await member.send({ embeds: [closeEmbed], content: `Transcript of your ticket:\n${codeBlockTranscript}` }).catch(() => {});
      }

      await interaction.reply({ content: 'Ticket has been closed and transcript sent.', ephemeral: true });
      await channel.delete().catch(() => {});
    });
  },
};









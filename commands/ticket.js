const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
} = require('discord.js');

module.exports = {
  name: 'ticket',
  description: 'Open the ticket panel',
  async execute(message) {
    const allowedRoleId = '1387493566225322114'; // role who can run !ticket
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 Open a Ticket')
      .setDescription(
        `Open any of the tickets below and we will help you solve the issue you are having! If you are reporting a staff member, evidence is required. Choose the category below that fits your inquiry.\n\n` +
        `❓ | **General Support**: For general questions. Open this if no other category fits your topic!\n\n` +
        `🤝 | **Partnership**: Open this ticket if you are interested in partnering with our server!\n\n` +
        `⚠️ | **Management Support**: Open this ticket if you are reporting a staff member.\n\n` +
        `🎮 | **In-game Support**: To report a player in-game, used for mod scenes.\n\n` +
        `📷 | **Media Application**: Open this ticket to apply for Atlanta Media Team!`
      )
      .setColor('Red');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Choose your ticket category')
      .addOptions([
        {
          label: 'General Support',
          description: 'Open a general support ticket',
          value: 'general',
          emoji: '❓',
        },
        {
          label: 'Partnership',
          description: 'Apply for a partnership',
          value: 'partnership',
          emoji: '🤝',
        },
        {
          label: 'Management Support',
          description: 'Report a staff member or management issue',
          value: 'management',
          emoji: '⚠️',
        },
        {
          label: 'In-game Support',
          description: 'Report players in-game or request mod assistance',
          value: 'ingame',
          emoji: '🎮',
        },
        {
          label: 'Media Application',
          description: 'Apply for the Atlanta Media Team',
          value: 'media',
          emoji: '📷',
        },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async setup(client) {
    const categoryId = '1380595048273412127';

    const roleMap = {
      ingame: '1379853523986022510',
      management: '1379809709871071352',
      general: '1390942686026010645',
      partnership: '1379809709871071352',
      media: '1390942686026010645', // Assuming same as general, change if needed
    };

    client.on(Events.InteractionCreate, async (interaction) => {
      // Handle ticket category select menu
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') {
        const category = interaction.values[0];
        const user = interaction.user;
        const allowedRole = roleMap[category];
        const channelName = `ticket-${category}-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        // Create channel with permissions
        const channel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: categoryId,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: allowedRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          ],
        });

        const ticketEmbed = new EmbedBuilder()
          .setTitle(`🎫 Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
          .setDescription(`Hello ${user}, thank you for opening a **${category}** ticket. Please explain your issue or request below.`)
          .setColor('Red');

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Close Ticket')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('🛡️ Claim Ticket')
            .setStyle(ButtonStyle.Primary)
        );

        await channel.send({ content: `<@${user.id}>`, embeds: [ticketEmbed], components: [buttons] });
        await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });
      }

      // Handle buttons
      if (interaction.isButton()) {
        const { customId, channel, user } = interaction;
        const ticketOwnerId = channel.permissionOverwrites.cache.find(po => po.type === 1 && po.allow.has(PermissionFlagsBits.ViewChannel))?.id;
        if (customId === 'close_ticket') {
          // Show modal to enter reason
          const modal = new ModalBuilder()
            .setCustomId('close_ticket_modal')
            .setTitle('Close Ticket Reason');

          const reasonInput = new TextInputBuilder()
            .setCustomId('close_reason_input')
            .setLabel('Reason for closing the ticket (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

          const row = new ActionRowBuilder().addComponents(reasonInput);
          modal.addComponents(row);

          await interaction.showModal(modal);
        }

        if (customId === 'claim_ticket') {
          const ticketCategory = channel.name.split('-')[1];
          const allowedRoleId = roleMap[ticketCategory];
          if (!allowedRoleId) {
            return interaction.reply({ content: 'This ticket category does not have a claim role setup.', ephemeral: true });
          }
          if (!interaction.member.roles.cache.has(allowedRoleId)) {
            return interaction.reply({ content: '🚫 You do not have permission to claim this ticket.', ephemeral: true });
          }

          await channel.send(`🛡️ Ticket claimed by <@${user.id}>. <@${ticketOwnerId}> you have been notified.`);
          await interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
        }
      }

      // Handle modal submit for closing ticket
      if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'close_ticket_modal') {
        const reason = interaction.fields.getTextInputValue('close_reason_input') || 'No reason provided';
        const channel = interaction.channel;

        // Fetch all messages from the channel for transcript
        const messages = await channel.messages.fetch({ limit: 100 });
        const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        let transcript = `Transcript for ticket: ${channel.name}\nClosed by: ${interaction.user.tag}\nReason: ${reason}\n\n`;

        sortedMessages.forEach(msg => {
          const time = new Date(msg.createdTimestamp).toLocaleString();
          transcript += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
        });

        // Send transcript DMs
        const ticketOwnerId = channel.permissionOverwrites.cache.find(po => po.type === 1 && po.allow.has(PermissionFlagsBits.ViewChannel))?.id;
        const claimMessage = await channel.messages.fetch({ limit: 10 }).then(msgs => msgs.find(m => m.content.includes('Ticket claimed by')));
        const claimerId = claimMessage ? claimMessage.mentions.users.first()?.id : null;

        try {
          if (ticketOwnerId) {
            const userDM = await interaction.client.users.fetch(ticketOwnerId);
            await userDM.send(`Your ticket **${channel.name}** has been closed.\nReason: ${reason}\n\nTranscript:\n\`\`\`\n${transcript}\n\`\`\``);
          }
          if (claimerId) {
            const claimerDM = await interaction.client.users.fetch(claimerId);
            await claimerDM.send(`Ticket **${channel.name}** you claimed has been closed.\nReason: ${reason}\n\nTranscript:\n\`\`\`\n${transcript}\n\`\`\``);
          }
        } catch {
          // DM might be closed, ignore errors
        }

        await interaction.reply({ content: '🔒 Ticket is now closed and transcript sent.', ephemeral: true });
        await channel.delete().catch(() => {});
      }
    });
  },
};



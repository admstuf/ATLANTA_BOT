const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, Events, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');

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
        `Open any of the tickets below and we will help you solve the issue you are having! If you are reporting a staff member, evidence is required. Choose the category below that fits your inquiry.\n\n`
        + `❓ | **General Support**: For general questions. Open this if no other category fits your topic!\n\n`
        + `🤝 | **Partnership**: Open this ticket if you are interested in partnering with our server!\n\n`
        + `⚠️ | **Management Support**: Open this ticket if you are reporting a staff member.\n\n`
        + `🎮 | **In-game Support**: To report a player in-game, used for mod scenes.\n\n`
        + `📷 | **Media Application**: Open this ticket to apply for Atlanta Media Team!`
      )
      .setColor(0x990000); // darker red

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
          description: 'Apply to join the Media Team',
          value: 'media',
          emoji: '📷',
        },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async setup(client) {
    const ticketCategoryId = '1380177235499286638';

    // Role IDs for claiming tickets by category
    const roleMap = {
      ingame: '1379853523986022510',
      management: '1379809709871071352',
      general: '1390942686026010645',
      partnership: '1379809709871071352',
      media: '1390951563366895647',
    };

    // Listen for select menu interaction to open tickets
    client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') {
        const category = interaction.values[0];
        const user = interaction.user;
        const allowedRole = roleMap[category];
        const channelName = `ticket-${category}-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        // Create the ticket channel with permissions
        const channel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: ticketCategoryId,
          topic: `TicketOwnerID: ${user.id}\nClaimerID: None`, // store claimer here, updated on claim
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: allowedRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          ],
        });

        // Embed for ticket message
        const ticketEmbed = new EmbedBuilder()
          .setTitle(`🎫 Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
          .setDescription(`Hello <@${user.id}>, thank you for opening a **${category}** ticket. Please explain your issue or request below.`)
          .setColor(0x990000);

        // Buttons: close, claim
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
    });

    // Handle button interactions: close ticket & claim ticket
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isButton()) return;

      const { customId, channel, user } = interaction;

      // Get ticket owner and claimer from channel topic
      const topic = channel.topic || '';
      const ticketOwnerMatch = topic.match(/TicketOwnerID: (\d+)/);
      const claimerMatch = topic.match(/ClaimerID: (\d+)/);
      const ticketOwnerId = ticketOwnerMatch ? ticketOwnerMatch[1] : null;
      let claimerId = claimerMatch ? claimerMatch[1] : null;

      // Check if user is ticket owner or claimer or allowed roles
      const userIsOwner = user.id === ticketOwnerId;
      const userIsClaimer = user.id === claimerId;
      const member = await interaction.guild.members.fetch(user.id);

      // Helper function to get ticket category from channel name (after "ticket-")
      const category = channel.name.split('-')[1];
      const claimRoleId = roleMap[category];

      if (customId === 'claim_ticket') {
        // Check if user has role to claim ticket
        if (!member.roles.cache.has(claimRoleId)) {
          return interaction.reply({ content: '🚫 You do not have permission to claim this ticket.', ephemeral: true });
        }

        // Update claimer id in channel topic
        const newTopic = topic.replace(/ClaimerID: .*/, `ClaimerID: ${user.id}`);
        await channel.setTopic(newTopic);

        // Notify ticket and claimer
        await channel.send(`🛡️ Ticket claimed by <@${user.id}>. <@${ticketOwnerId}>, your ticket is now being handled.`);
        return interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
      }

      if (customId === 'close_ticket') {
        // Show modal for close reason
        const modal = new ModalBuilder()
          .setCustomId('close_ticket_modal')
          .setTitle('Close Ticket');

        const reasonInput = new TextInputBuilder()
          .setCustomId('close_reason_input')
          .setLabel('Reason for closing (optional)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setPlaceholder('Enter a reason, or leave blank');

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
      }
    });

    // Handle modal submit for close ticket
    client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.type !== InteractionType.ModalSubmit) return;
      if (interaction.customId !== 'close_ticket_modal') return;

      const reason = interaction.fields.getTextInputValue('close_reason_input').trim();
      const channel = interaction.channel;
      const user = interaction.user;

      const topic = channel.topic || '';
      const ticketOwnerMatch = topic.match(/TicketOwnerID: (\d+)/);
      const claimerMatch = topic.match(/ClaimerID: (\d+)/);
      const ticketOwnerId = ticketOwnerMatch ? ticketOwnerMatch[1] : null;
      const claimerId = claimerMatch ? claimerMatch[1] : null;

      // Create transcript text
      let transcriptMsg = `Ticket **${channel.name}** has been closed by <@${user.id}>.\n`;
      if (reason) transcriptMsg += `**Close Reason:** ${reason}\n`;
      transcriptMsg += 'Thank you for using the support system.';

      // DM transcript to ticket owner
      if (ticketOwnerId) {
        try {
          const ticketOwner = await interaction.guild.members.fetch(ticketOwnerId);
          await ticketOwner.send({ content: transcriptMsg });
        } catch {
          // ignore if DM fails
        }
      }

      // DM transcript to claimer if different from owner
      if (claimerId && claimerId !== ticketOwnerId) {
        try {
          const claimer = await interaction.guild.members.fetch(claimerId);
          await claimer.send({ content: transcriptMsg });
        } catch {
          // ignore if DM fails
        }
      }

      await interaction.reply({ content: 'Ticket will be closed now.', ephemeral: true });

      setTimeout(() => {
        channel.delete().catch(() => {});
      }, 3000);
    });
  },
};





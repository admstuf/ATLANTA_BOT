const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, Events } = require('discord.js');

module.exports = {
  name: 'ticket',
  description: 'Open the ticket panel',
  async execute(message) {
    // Check if the user has the role allowed to run !ticket
    const allowedRoleId = '1387493566225322114'; // role who can run !ticket
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    // Create embed
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
      .setColor('#8B0000');

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
          description: 'Apply for Atlanta Media Team',
          value: 'media',
          emoji: '📷',
        },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async setup(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isStringSelectMenu()) return;
      if (interaction.customId !== 'ticket_category') return;

      const categoryId = '1380595048273412127'; // category for ticket channels
      const category = interaction.values[0];
      const user = interaction.user;

      // Map ticket categories to claim roles
      const roleMap = {
        ingame: '1379853523986022510',
        management: '1379809709871071352',
        general: '1390942686026010645',
        partnership: '1379809709871071352',
        media: '1390951563366895647',
      };

      const allowedRole = roleMap[category];
      const channelName = `ticket-${category}-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      // Create ticket channel
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
        .setColor('#8B0000');

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
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isButton()) return;

      const { customId, channel, user } = interaction;

      // Find ticket owner from permission overwrites
      const ticketOwnerOverwrite = channel.permissionOverwrites.cache.find(po => po.type === 1 && po.allow.has(PermissionFlagsBits.ViewChannel));
      const ticketOwnerId = ticketOwnerOverwrite ? ticketOwnerOverwrite.id : null;

      // Get ticket category from channel name
      const ticketCategory = channel.name.split('-')[1];

      const roleMap = {
        ingame: '1379853523986022510',
        management: '1379809709871071352',
        general: '1390942686026010645',
        partnership: '1379809709871071352',
        media: '1390951563366895647',
      };

      if (customId === 'close_ticket') {
        // Ask for confirmation before closing with buttons
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_close')
            .setLabel('✅ Confirm Close')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_close')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('close_with_reason')
            .setLabel('📄 Close with Reason')
            .setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ content: 'Are you sure you want to close this ticket?', components: [confirmRow], ephemeral: true });
      }

      if (customId === 'confirm_close') {
        await channel.delete().catch(() => {});
        await interaction.reply({ content: 'Ticket closed and channel deleted.', ephemeral: true });
      }

      if (customId === 'cancel_close') {
        await interaction.reply({ content: 'Ticket close canceled.', ephemeral: true });
      }

      if (customId === 'close_with_reason') {
        await interaction.reply({ content: 'Please send your reason for closing this ticket. This will auto-close after you send the reason.', ephemeral: true });

        const filter = m => m.author.id === user.id && m.channel.id === channel.id;
        const collector = channel.createMessageCollector({ filter, max: 1, time: 120000 });

        collector.on('collect', async (m) => {
          await channel.send(`🔒 Ticket closed by ${user.tag} with reason: ${m.content}`);
          await channel.delete().catch(() => {});

          // Optionally, send transcript logic here
          // (Implement your transcript sending to ticketOwner and claimer)
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            interaction.followUp({ content: '⏰ You did not provide a reason in time.', ephemeral: true });
          }
        });
      }

      if (customId === 'claim_ticket') {
        const allowedRoleId = roleMap[ticketCategory];
        if (!allowedRoleId) return interaction.reply({ content: '🚫 This ticket category cannot be claimed.', ephemeral: true });

        if (!interaction.member.roles.cache.has(allowedRoleId)) {
          return interaction.reply({ content: '🚫 You do not have permission to claim this ticket.', ephemeral: true });
        }

        // Ping ticket owner and tag the claimer
        if (ticketOwnerId) {
          await channel.send(`🛡️ Ticket claimed by ${interaction.user}. <@${ticketOwnerId}>`);
        } else {
          await channel.send(`🛡️ Ticket claimed by ${interaction.user}.`);
        }

        await interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
      }
    });
  },
};




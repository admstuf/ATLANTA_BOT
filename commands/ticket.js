const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, Events } = require('discord.js');

module.exports = {
  name: 'ticket',
  description: 'Open the ticket panel',
  async execute(message) {
    const allowedRoleId = '1387493566225322114';
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 Open a Ticket')
      .setDescription(
        `Open any of the tickets below and we will help you solve the issue you are having! If you are reporting a staff member, evidence is required. Choose the category below that fits your inquiry.\n\n`
        + `📷 | **Media Application**: Open this ticket to apply for Atlanta Media Team!\n\n`
        + `❓ | **General Support**: For general questions. Open this if no other category fits your topic!\n\n`
        + `🤝 | **Partnership**: Open this ticket if you are interested in partnering with our server!\n\n`
        + `⚠️ | **Management Support**: Open this ticket if you are reporting a staff member.\n\n`
        + `🎮 | **In-game Support**: To report a player in-game, used for mod scenes.`
      )
      .setColor(0xB00000);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Choose your ticket category')
      .addOptions([
        { label: 'Media Application', description: 'Apply for Media Team', value: 'media', emoji: '📷' },
        { label: 'General Support', description: 'Open a general support ticket', value: 'general', emoji: '❓' },
        { label: 'Partnership', description: 'Apply for a partnership', value: 'partnership', emoji: '🤝' },
        { label: 'Management Support', description: 'Report a staff member or management issue', value: 'management', emoji: '⚠️' },
        { label: 'In-game Support', description: 'Report players in-game or request mod assistance', value: 'ingame', emoji: '🎮' },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async setup(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isStringSelectMenu()) return;
      if (interaction.customId !== 'ticket_category') return;

      const categoryId = '1380595048273412127';
      const category = interaction.values[0];
      const user = interaction.user;

      const roleMap = {
        media: '1390951563366895647',
        ingame: '1379853523986022510',
        management: '1379809709871071352',
        general: '1390942686026010645',
        partnership: '1379809709871071352',
      };
      const allowedRole = roleMap[category];
      const channelName = `ticket-${category}-${user.username}`;

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
        .setColor(0xB00000);

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

      const { customId, channel, user, guild } = interaction;
      const ticketOwnerId = channel.permissionOverwrites.cache.find(po => po.type === 1 && po.allow.has(PermissionFlagsBits.ViewChannel))?.id;

      if (customId === 'close_ticket') {
        await interaction.reply({ content: 'Please reply with your reason for closing this ticket. You have 60 seconds.', ephemeral: true });

        const filter = m => m.author.id === user.id;
        const collector = channel.createMessageCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async m => {
          const reason = m.content;

          const messages = await channel.messages.fetch({ limit: 100 });
          const ordered = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

          let transcript = `Transcript for ticket: ${channel.name}\n`;
          transcript += `Closed by: ${interaction.user.tag}\n`;
          transcript += `Reason: ${reason}\n\n`;

          ordered.forEach(msg => {
            const timestamp = new Date(msg.createdTimestamp).toLocaleString('en-US', { hour12: false });
            transcript += `[${timestamp}] ${msg.author.tag}: ${msg.content}\n`;
          });

          try {
            const ticketOwner = await guild.members.fetch(ticketOwnerId);
            await ticketOwner.send(`\`\`\`\n${transcript}\n\`\`\``);
          } catch {}
          try {
            await user.send(`\`\`\`\n${transcript}\n\`\`\``);
          } catch {}

          await channel.delete().catch(() => {});
        });

        collector.on('end', collected => {
          if (collected.size === 0) interaction.followUp({ content: '⏰ You did not provide a reason in time.', ephemeral: true });
        });
      }

      if (customId === 'claim_ticket') {
        const roleMap = {
          media: '1390951563366895647',
          ingame: '1379853523986022510',
          management: '1379809709871071352',
          general: '1390942686026010645',
          partnership: '1379809709871071352',
        };
        const userRoles = interaction.member.roles.cache.map(r => r.id);
        const hasAllowedRole = Object.values(roleMap).some(role => userRoles.includes(role));

        if (!hasAllowedRole) return interaction.reply({ content: '🚫 You do not have permission to claim this ticket.', ephemeral: true });

        await channel.send(`🛡️ Ticket claimed by ${interaction.user}. <@${ticketOwnerId}>`);
        await interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
      }
    });
  }
};






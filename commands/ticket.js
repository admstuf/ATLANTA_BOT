const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, Events } = require('discord.js');

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
        + '❓ | **General Support**\n🤝 | **Partnership**\n⚠️ | **Management Support**\n🎮 | **In-game Support**\n📷 | **Media Application**'
      )
      .setColor('#B22222');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_general').setLabel('General Support').setEmoji('❓').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_partnership').setLabel('Partnership').setEmoji('🤝').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_management').setLabel('Management Support').setEmoji('⚠️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_ingame').setLabel('In-game Support').setEmoji('🎮').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_media').setLabel('Media Application').setEmoji('📷').setStyle(ButtonStyle.Primary),
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async setup(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('ticket_')) return;

      const category = interaction.customId.split('_')[1];
      const guild = interaction.guild;
      const user = interaction.user;
      const categoryId = '1380177235499286638';

      const roleMap = {
        ingame: '1379853523986022510',
        management: '1379809709871071352',
        general: '1390942686026010645',
        partnership: '1379809709871071352',
        media: '1390951563366895647',
      };
      const allowedRole = roleMap[category];
      const channelName = `ticket-${category}-${user.username}`.toLowerCase();

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: allowedRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ],
      });

      let ticketEmbed;
      if (category === 'media') {
        ticketEmbed = new EmbedBuilder()
          .setTitle('📷 Media Team Application')
          .setDescription(
            `Roblox username:\n\n`
            + `Age:\n\n`
            + `Why do you want to apply?\n\n`
            + `How active will you be if you’re accepted?\n\n`
            + `Please showcase your previous work below. (Preferably ERLC Roleplay scenes. 2-5 pictures.)`
          )
          .setColor('#B22222');
      } else {
        ticketEmbed = new EmbedBuilder()
          .setTitle(`🎫 Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
          .setDescription(`Hello <@${user.id}>, thank you for opening a **${category}** ticket. Please explain your issue or request below.`)
          .setColor('#B22222');
      }

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('🛡️ Claim Ticket').setStyle(ButtonStyle.Primary)
      );

      await channel.send({ content: `<@${user.id}>`, embeds: [ticketEmbed], components: [buttons] });
      await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isButton()) return;

      const { customId, channel, user } = interaction;
      const ticketOwnerId = channel.permissionOverwrites.cache.find(po => po.type === 1 && po.allow.has(PermissionFlagsBits.ViewChannel))?.id;

      if (customId === 'close_ticket') {
        await interaction.reply({
          content: 'Please reply in this channel with your reason for closing the ticket. You have 60 seconds:',
          ephemeral: true,
        });

        const filter = m => m.author.id === user.id;
        const collector = channel.createMessageCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async m => {
          const fetchedMessages = await channel.messages.fetch({ limit: 100 });
          const transcriptLines = fetchedMessages
            .filter(msg => !msg.author.bot)
            .map(msg => `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}`)
            .reverse();

          const transcript = `**Transcript for ${channel.name}**\n**Closed by:** ${user.tag}\n**Reason:** ${m.content}\n\n${transcriptLines.join('\n')}`;

          const transcriptChannel = interaction.guild.channels.cache.get('1391251472515207219');
          if (transcriptChannel) {
            await transcriptChannel.send({ content: transcript.slice(0, 2000) });
          }

          const ticketOwner = await interaction.guild.members.fetch(ticketOwnerId).catch(() => null);
          if (ticketOwner) {
            await ticketOwner.send({ content: transcript.slice(0, 2000) }).catch(() => {});
          }

          await channel.send('🔒 This ticket has been closed. Thank you for contacting us.');
          await channel.delete().catch(() => {});
        });

        collector.on('end', collected => {
          if (collected.size === 0) interaction.followUp({ content: '⏰ You did not provide a reason in time.', ephemeral: true });
        });
      }

      if (customId === 'claim_ticket') {
        const allowedRoleIds = Object.values({
          ingame: '1379853523986022510',
          management: '1379809709871071352',
          general: '1390942686026010645',
          partnership: '1379809709871071352',
          media: '1390951563366895647',
        });
        const hasRole = allowedRoleIds.some(roleId => interaction.member.roles.cache.has(roleId));
        if (!hasRole) return interaction.reply({ content: '🚫 You do not have permission to claim this ticket.', ephemeral: true });

        await channel.send(`🛡️ Ticket claimed by ${interaction.user}. <@${ticketOwnerId}>`);
        await interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
      }
    });
  },
};









const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'mute',
  description: 'Mute a user for a specified number of minutes.',

  async execute(message, args) {
    const allowedRoleId = '1390759183376453764'; // role for apps & partners
    const hasPermission = message.member.permissions.has(PermissionsBitField.Flags.MuteMembers);
    const hasRole = message.member.roles.cache.has(allowedRoleId);

    if (!hasPermission && !hasRole) {
      return message.reply("❌ You don't have permission to mute members.");
    }

    const user = message.mentions.members.first();
    const minutes = parseInt(args[1]);
    const reason = args.slice(2).join(' ') || 'No reason provided';

    if (!user) return message.reply("❌ Please mention a user to mute.");
    if (isNaN(minutes)) return message.reply("❌ Please specify a valid number of minutes.");

    if (!user.manageable) {
      return message.reply("❌ I can't mute this user. They might have a higher role than me.");
    }

    let mutedRole = message.guild.roles.cache.find(r => r.name === 'Muted');
    if (!mutedRole) {
      try {
        mutedRole = await message.guild.roles.create({
          name: 'Muted',
          color: '#514f48',
          permissions: []
        });
        for (const channel of message.guild.channels.cache.values()) {
          await channel.permissionOverwrites.edit(mutedRole, {
            SendMessages: false,
            Speak: false,
            AddReactions: false
          });
        }
      } catch (error) {
        console.error(error);
        return message.reply('⚠️ Failed to create Muted role.');
      }
    }

    await user.roles.add(mutedRole, `Muted by ${message.author.tag} for ${minutes} minutes. Reason: ${reason}`);

    const embed = new EmbedBuilder()
      .setTitle('🔇 User Muted')
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Duration', value: `${minutes} minute(s)`, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Muted by', value: `<@${message.author.id}>`, inline: true }
      )
      .setColor('DarkOrange')
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });

    setTimeout(async () => {
      if (user.roles.cache.has(mutedRole.id)) {
        await user.roles.remove(mutedRole, 'Mute duration expired');
        try {
          await message.channel.send(`<@${user.id}> has been unmuted after ${minutes} minutes.`);
        } catch {}
      }
    }, minutes * 60 * 1000);
  }
};

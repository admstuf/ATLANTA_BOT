const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'application',
    description: 'Accept or deny an application.',
    async execute(message, args) {
        const allowedRoleId = '1390759183376453764'; // new allowed role id

        if (!message.member.roles.cache.has(allowedRoleId)) {
            const reply = await message.reply('🚫 You do not have permission to use this command.');
            return setTimeout(() => reply.delete().catch(() => {}), 8000);
        }

        if (!args.length || (args[0] !== 'accept' && args[0] !== 'deny')) {
            const reply = await message.reply('**Usage:** `!application accept/deny <@user> <applicationType> <reason (required for deny)>`');
            return setTimeout(() => reply.delete().catch(() => {}), 10000);
        }

        const action = args[0];
        const userMention = args[1];
        const applicationType = args[2];
        const reason = args.slice(3).join(' ');

        const userIdMatch = userMention?.match(/^<@!?(\d+)>$/);
        if (!userIdMatch) {
            const reply = await message.reply('Please mention a valid user who was reviewed.');
            return setTimeout(() => reply.delete().catch(() => {}), 10000);
        }

        if (!applicationType) {
            const reply = await message.reply('Please specify the application type (Swat, Staff, Supervisor, or Media).');
            return setTimeout(() => reply.delete().catch(() => {}), 10000);
        }

        if (action === 'deny' && !reason) {
            const reply = await message.reply('A reason is required when denying an application.');
            return setTimeout(() => reply.delete().catch(() => {}), 10000);
        }

        const applicantId = userIdMatch[1];
        const isAccepted = action === 'accept';
        const appType = applicationType.toLowerCase();

        let description, footerText, bottomImage;

        if (appType === 'swat') {
            if (isAccepted) {
                description = 'Your swat application has been reviewed by our HR team. We are pleased to inform you that you were accepted! Please check our departments category for more information.';
                footerText = `User ID: ${applicantId} | Welcome to Swat!`;
            } else {
                description = `Your swat application has been reviewed by our HR team. You unfortunately do not meet the criteria for Swat. You may apply again after 30 days.\n\nReason: ${reason}`;
                footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
            }
            bottomImage = 'https://cdn.discordapp.com/attachments/1385162246707220551/1389448470221295697/SWAT_TEAM_APPLICATION.png';
        } else if (appType === 'staff') {
            if (isAccepted) {
                description = 'Your staff application has been reviewed by our HR team. We are pleased to inform you that you were accepted! Please check the Staff Team category for more information.';
                footerText = `User ID: ${applicantId} | Welcome to the Staff Team!`;
            } else {
                description = `Your staff application has been reviewed by our HR team. You unfortunately do not meet the criteria for the Staff Team. You may apply again after 30 days.\n\nReason: ${reason}`;
                footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
            }
            bottomImage = 'https://cdn.discordapp.com/attachments/1385162246707220551/1389448469499875378/STAFF_TEAM_APPLICATION.png';
        } else if (appType === 'supervisor') {
            if (isAccepted) {
                description = 'Your supervisor application has been reviewed by our HR team. We are pleased to inform you that you were accepted! Please check our departments category for more information.';
                footerText = `User ID: ${applicantId} | Welcome to Supervision!`;
            
            } else {
                description = `Your supervisor application has been reviewed by our HR team. You unfortunately do not meet the criteria for Supervisor. You may apply again after 30 days.\n\nReason: ${reason}`;
                footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
            }
            bottomImage = 'https://cdn.discordapp.com/attachments/1385162246707220551/1389448469856387112/SUPERVISOR_APPLICATION.png';
        } else if (appType === 'media') {
            if (isAccepted) {
                description = 'Your media team application has been reviewed by our Media Directing team. We are pleased to inform you that you were accepted! Please check the Media Team category for more information.';
                footerText = `User ID: ${applicantId} | Welcome to the Media Team!`;
            } else {
                description = `Your media team application has been reviewed by our Media Directing team. You unfortunately do not meet the criteria for the Media Team. You may apply again after 30 days.\n\nReason: ${reason}`;
                footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
            }
            bottomImage = 'https://cdn.discordapp.com/attachments/1385162246707220551/1389448469105606739/MEDIA_TEAM_APPLICATION.png';
        } else {
            const reply = await message.reply('Invalid application type. Please use: Swat, Staff, Supervisor, or Media.');
            return setTimeout(() => reply.delete().catch(() => {}), 10000);
        }

        // ⭐ Changed this line to set color based on acceptance status ⭐
        const embedColor = isAccepted ? '#00FF00' : '#8B0000'; // Green for accepted, Dark Red for denied

        const embed = new EmbedBuilder()
            .setColor(embedColor) // Use the dynamic color here
            .setTitle(isAccepted ? 'Application Accepted' : 'Application Denied')
            .setThumbnail('https://cdn.discordapp.com/attachments/1385162246707220551/1390952762212352071/IMG_5237-removebg-preview.png?ex=686a2135&is=6868cfb5&hm=be1b6f5843304e281f939599a7ab8a8711e94e6935072e712f6411717ecf54a6&')
            .setDescription(description)
            .addFields({ name: 'Application', value: applicationType.charAt(0).toUpperCase() + applicationType.slice(1), inline: true })
            .setImage(bottomImage)
            .setFooter({ text: footerText })
            .setTimestamp();

        const reviewerButton = new ButtonBuilder()
            .setLabel(`Reviewed by: ${message.author.displayName}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
            .setCustomId('reviewed_by');

        const row = new ActionRowBuilder().addComponents(reviewerButton);

        const resultsChannel = message.guild.channels.cache.get('1380691912234897518');
        if (!resultsChannel) {
            const reply = await message.reply('⚠️ **Error:** Could not find the results channel. Please contact a bot developer.');
            return setTimeout(() => reply.delete().catch(() => {}), 15000);
        }

        try {
            await resultsChannel.send({
                content: `<@${applicantId}>`,
                embeds: [embed],
                components: [row]
            });

            const confirmation = await message.reply(`**Application ${action}ed!** Results posted in <#1380691912234897518>`);
            setTimeout(() => confirmation.delete().catch(() => {}), 8000);

            try {
                const user = await message.guild.members.fetch(applicantId);
                await user.send({ embeds: [embed], components: [row] });
            } catch {
                // silently fail if DMs closed
            }
        } catch (error) {
            console.error('Application command error:', error);
            const errorReply = await message.reply('⚠️ **Error:** Failed to process application. Please try again.');
            setTimeout(() => errorReply.delete().catch(() => {}), 10000);
        }
    },
};
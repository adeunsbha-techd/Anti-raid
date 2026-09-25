const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

async function handleSetup(interaction) {
  await interaction.deferReply();
  const name = interaction.options.getString('name');
  const rawChannels = interaction.options.getString('channels');
  const permission = interaction.options.getString('permission');
  const guild = interaction.guild;
  const everyone = guild.roles.everyone;
  const channels = rawChannels.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const overwrites = [];
    if (permission === 'admin') {
      overwrites.push({ id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
    } else if (permission === 'public') {
      overwrites.push({ id: everyone.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
    } else if (permission === 'all') {
      overwrites.push({ id: everyone.id,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.SendMessages] });
    }

    const category = await guild.channels.create({
      name: name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: overwrites
    });

    const created = [];
    for (const chName of channels) {
      try {
        const isVoice = /^[🔊🔈🎤📢🎵]/.test(chName);
        const ch = await guild.channels.create({
          name: chName,
          type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: overwrites
        });
        created.push(ch);
      } catch (e) {
        console.error('Channel error', chName, e.message);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('✅ Setup Complete')
      .addFields(
        { name: '📁 Kategori', value: `\`${name}\``, inline: true },
        { name: '🔒 Permission', value: `\`${permission}\``, inline: true },
        { name: '📊 Channels', value: `${created.length} dibuat`, inline: true }
      )
      .setDescription(created.map(c => `• <#${c.id}>`).join('\n') || '_(kosong)_')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (e) {
    console.error(e);
    await interaction.editReply({ content: `❌ Error: \`${e.message}\`` });
  }
}

async function handleWhitelist(interaction, DATA, saveData) {
  const user = interaction.options.getUser('user');
  if (!DATA.whitelist.includes(user.id)) DATA.whitelist.push(user.id);
  else DATA.whitelist = DATA.whitelist.filter(id => id !== user.id);
  saveData();
  const inList = DATA.whitelist.includes(user.id);
  await interaction.reply({
    content: `${inList ? '✅ Ditambah ke' : '❌ Dihapus dari'} whitelist: <@${user.id}>`,
    ephemeral: true
  });
}

async function handlePurge(interaction) {
  const count = Math.min(100, Math.max(1, interaction.options.getInteger('count')));
  await interaction.deferReply({ ephemeral: true });
  const deleted = await interaction.channel.bulkDelete(count, true).catch(()=>null);
  await interaction.editReply({
    content: deleted ? `✅ Hapus ${deleted.size} pesan.` : '❌ Gagal.'
  });
}

async function handleSlowmode(interaction) {
  const sec = Math.max(0, Math.min(21600, interaction.options.getInteger('seconds')));
  await interaction.channel.setRateLimitPerUser(sec).catch(()=>{});
  await interaction.reply({ content: `✅ Slowmode: ${sec}s`, ephemeral: true });
}

async function handleStatus(interaction, DATA, CONFIG) {
  const embed = new EmbedBuilder()
    .setColor(DATA.raidMode ? 0xFF5555 : 0x55FF55)
    .setTitle('🛡️ RaidGuard Status')
    .addFields(
      { name: 'Anti-Raid', value: CONFIG.antiRaid.enabled ? '✅ ON' : '❌ OFF', inline: true },
      { name: 'Raid Mode', value: DATA.raidMode ? '🚨 ACTIVE' : '🟢 Normal', inline: true },
      { name: 'Whitelist', value: `${DATA.whitelist.length} user`, inline: true },
      { name: 'Threshold', value: `${CONFIG.antiRaid.joinThreshold}/${CONFIG.antiRaid.joinWindowSec}s`, inline: true },
      { name: 'Min Age', value: `${CONFIG.antiRaid.accountAgeMinDays} hari`, inline: true },
      { name: 'Auto Kick', value: CONFIG.antiRaid.autoKickNewAccounts ? '✅' : '❌', inline: true }
    )
    .setTimestamp();
  if (DATA.raidMode && DATA.lockdownUntil > Date.now()) {
    const min = Math.ceil((DATA.lockdownUntil - Date.now()) / 60000);
    embed.setFooter({ text: `Lockdown berakhir ~${min} menit` });
  }
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { handleSetup, handleWhitelist, handlePurge, handleSlowmode, handleStatus };

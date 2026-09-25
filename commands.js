const { SlashCommandBuilder, ChannelType, PermissionFlagsBits,
        EmbedBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup server otomatis')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Bikin kategori + channels')
      .addStringOption(opt => opt
        .setName('name').setDescription('Nama kategori').setRequired(true))
      .addStringOption(opt => opt
        .setName('channels').setDescription('Daftar channel pisah koma')
        .setRequired(true))
      .addStringOption(opt => opt
        .setName('permission').setDescription('Permission')
        .setRequired(true)
        .addChoices(
          { name: 'Admin only', value: 'admin' },
          { name: 'Public (chat-able)', value: 'public' },
          { name: 'All (read-only)', value: 'all' }
        )))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Panic mode')
    .addStringOption(opt => opt.setName('reason').setDescription('Alasan'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Matikan lockdown')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Whitelist user dari anti-raid')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Hapus pesan')
    .addIntegerOption(opt => opt.setName('count').setDescription('1-100').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode')
    .addIntegerOption(opt => opt.setName('seconds').setDescription('0-21600').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('raidguard')
    .setDescription('Status anti-raid')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

module.exports = { commands };

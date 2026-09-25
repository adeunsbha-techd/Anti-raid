const { Client, GatewayIntentBits, Partials, REST, Routes,
        PermissionFlagsBits, EmbedBuilder,
        ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ============ LOAD CONFIG (dari file ATAU ENV) ============
let CONFIG;
try {
  CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (e) {
  CONFIG = {};
}

// ENV selalu override (buat Railway/deploy)
if (process.env.DISCORD_TOKEN) CONFIG.token = process.env.DISCORD_TOKEN;
if (process.env.CLIENT_ID) CONFIG.clientId = process.env.CLIENT_ID;
if (process.env.GUILD_ID) CONFIG.guildId = process.env.GUILD_ID;

// Default anti-raid
CONFIG.logChannelName = CONFIG.logChannelName || 'raid-logs';
CONFIG.alertChannelName = CONFIG.alertChannelName || 'raid-alerts';
CONFIG.antiRaid = CONFIG.antiRaid || {
  enabled: true,
  joinThreshold: 5,
  joinWindowSec: 10,
  accountAgeMinDays: 7,
  autoKickNewAccounts: true,
  autoLockdown: true,
  lockdownDurationMin: 10
};
CONFIG.welcome = CONFIG.welcome || {
  enabled: true,
  channelName: 'welcome',
  message: '🎉 Welcome {user} ke {server}!'
};
CONFIG.autoRole = CONFIG.autoRole || { enabled: false, roleName: 'Member' };

// Validate
if (!CONFIG.token || CONFIG.token.includes('ISI_')) {
  console.error('❌ DISCORD_TOKEN belum diset!');
  process.exit(1);
}
if (!CONFIG.guildId || CONFIG.guildId.includes('ISI_')) {
  console.error('❌ GUILD_ID belum diset!');
  process.exit(1);
}

console.log('✅ Config loaded:');
console.log('   Guild ID:', CONFIG.guildId);
console.log('   Client ID:', CONFIG.clientId);
console.log('   Token:', CONFIG.token.substring(0, 20) + '...');

// ============ DATA ============
let DATA = { whitelist: [], raidMode: false, lockdownUntil: 0 };
const DATA_PATH = path.join(__dirname, 'data.json');

if (fs.existsSync(DATA_PATH)) {
  try { DATA = { ...DATA, ...JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) }; } catch(e){}
}
function saveData(){
  try { fs.writeFileSync(DATA_PATH, JSON.stringify(DATA, null, 2)); }
  catch (e) { /* read-only filesystem di cloud — skip */ }
}

// ============ CLIENT ============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.GuildMember, Partials.Channel]
});

const joinTracker = new Map();

async function logAction(guild, text, color = 0xFF5555) {
  try {
    const ch = guild.channels.cache.find(c => c.name === CONFIG.logChannelName
      && c.type === ChannelType.GuildText);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🛡️ RaidGuard Log')
      .setDescription(text)
      .setTimestamp();
    await ch.send({ embeds: [embed] }).catch(()=>{});
  } catch (e) {}
}

async function lockDown(guild, minutes, reason) {
  try {
    DATA.raidMode = true;
    DATA.lockdownUntil = Date.now() + minutes * 60_000;
    saveData();

    await guild.setVerificationLevel(4).catch(()=>{});

    guild.channels.cache.forEach(async ch => {
      if (ch.type === ChannelType.GuildText) {
        try {
          await ch.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: false
          });
        } catch (e) {}
      }
    });

    try {
      const invites = await guild.invites.fetch();
      invites.forEach(inv => inv.delete().catch(()=>{}));
    } catch (e) {}

    await logAction(guild,
      `🚨 **LOCKDOWN AKTIF**\n**Alasan:** ${reason}\n**Durasi:** ${minutes} menit`,
      0xFF0000);
  } catch (e) {
    console.error('lockDown error', e);
  }
}

async function unlockDown(guild) {
  try {
    DATA.raidMode = false;
    DATA.lockdownUntil = 0;
    saveData();

    await guild.setVerificationLevel(1).catch(()=>{});

    guild.channels.cache.forEach(async ch => {
      if (ch.type === ChannelType.GuildText) {
        try {
          await ch.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: null
          });
        } catch (e) {}
      }
    });

    await logAction(guild, `✅ **Lockdown berakhir.** Server kembali normal.`, 0x55FF55);
  } catch (e) {}
}

client.on('guildMemberAdd', async member => {
  const guild = member.guild;
  const now = Date.now();
  const times = (joinTracker.get(guild.id) || []).filter(t => now - t < CONFIG.antiRaid.joinWindowSec * 1000);
  times.push(now);
  joinTracker.set(guild.id, times);

  const accountAgeDays = (now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  const isNew = accountAgeDays < CONFIG.antiRaid.accountAgeMinDays;

  if (DATA.whitelist.includes(member.id)) return;

  if (DATA.raidMode && isNew && CONFIG.antiRaid.autoKickNewAccounts) {
    await member.kick('Raid mode: akun baru').catch(()=>{});
    await logAction(guild, `🔨 Kick **${member.user.tag}** saat raid`, 0xFFAA00);
    return;
  }

  if (CONFIG.antiRaid.autoKickNewAccounts && isNew && !DATA.raidMode) {
    await member.kick(`Akun terlalu baru (${accountAgeDays.toFixed(1)}h)`).catch(()=>{});
    await logAction(guild, `⚠️ Kick akun baru: **${member.user.tag}**`, 0xFFAA00);
    return;
  }

  if (CONFIG.antiRaid.enabled && times.length >= CONFIG.antiRaid.joinThreshold) {
    if (!DATA.raidMode) {
      await lockDown(guild, CONFIG.antiRaid.lockdownDurationMin,
        `${times.length} join dalam ${CONFIG.antiRaid.joinWindowSec}s`);
    }
  }

  if (CONFIG.welcome.enabled) {
    const wch = guild.channels.cache.find(c => c.name === CONFIG.welcome.channelName);
    if (wch) {
      wch.send(CONFIG.welcome.message
        .replace('{user}', `<@${member.id}>`)
        .replace('{server}', guild.name)).catch(()=>{});
    }
  }

  if (CONFIG.autoRole.enabled) {
    const role = guild.roles.cache.find(r => r.name === CONFIG.autoRole.roleName);
    if (role) member.roles.add(role).catch(()=>{});
  }
});

setInterval(() => {
  if (DATA.raidMode && Date.now() > DATA.lockdownUntil) {
    client.guilds.cache.forEach(g => unlockDown(g));
  }
}, 30_000);

module.exports = { client, CONFIG, DATA, saveData, lockDown, unlockDown };

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

console.log("🚀 BOT STARTING...");

// ======================
// ❗ HANDLE ERROR (ANTI CRASH)
// ======================
process.on('uncaughtException', err => {
  console.error('UNCAUGHT ERROR:', err);
});

process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION:', err);
});

// ======================
// ❗ VALIDASI TOKEN
// ======================
if (!process.env.TOKEN) {
  console.log("❌ TOKEN GA KEBACA! CEK VARIABLES");
  process.exit(1);
}

// ======================
// 📂 DATABASE
// ======================
let data = {};
if (fs.existsSync('./database.json')) {
  data = JSON.parse(fs.readFileSync('./database.json'));
}

// ======================
// 🤖 CLIENT
// ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ======================
// ✅ READY
// ======================
client.once('clientReady', () => {
  console.log(`🔥 Bot aktif sebagai ${client.user.tag}`);
});

// ======================
// 🧠 XP SYSTEM
// ======================
function getNeededXP(level) {
  if (level <= 2) return 100;
  if (level <= 10) return 1000;
  if (level <= 15) return 1600;
  if (level <= 20) return 2500;
  if (level <= 25) return 4000;
  if (level <= 30) return 6000;
  return 6000 + ((level - 30) * 3000);
}

// ======================
// 🎖️ TIER
// ======================
function getTier(level) {
  if (level < 5) return { name: 'Junior 🌱', color: '#a855f7' };
  if (level < 10) return { name: 'Senior ⚡', color: '#22c55e' };
  if (level < 20) return { name: 'Sepuh 🧘', color: '#eab308' };
  return { name: 'Kakek Buyut 👴', color: '#ef4444' };
}

const cooldown = new Set();

// ======================
// 🎮 MESSAGE EVENT
// ======================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const id = message.author.id;

  if (!data[id]) {
    data[id] = { xp: 0, level: 1, messages: 0, voice: 0, badges: [] };
  }

  let user = data[id];

  // ======================
  // COMMAND
  // ======================
  if (message.content === '!level') {
    return sendLevel(message, user);
  }

  if (message.content === '!leaderboard') {
    return sendLeaderboard(message);
  }

  // ======================
  // XP SYSTEM
  // ======================
  user.messages++;

  if (!cooldown.has(id)) {
    cooldown.add(id);
    setTimeout(() => cooldown.delete(id), 60000);
    user.xp += Math.floor(Math.random() * 10) + 10;
  }

  while (user.xp >= getNeededXP(user.level)) {
    user.xp -= getNeededXP(user.level);
    user.level++;
    message.channel.send(`🔥 GG ${message.author} naik ke level ${user.level}!`);
  }

  fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
});

// ======================
// 🎨 LEVEL
// ======================
async function sendLevel(message, user) {

  const neededXP = getNeededXP(user.level);
  const tier = getTier(user.level);

  const embed = new EmbedBuilder()
    .setColor(tier.color)
    .setTitle(`🔥 ${message.author.username}`)
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
      { name: 'Level', value: `${user.level}`, inline: true },
      { name: 'XP', value: `${user.xp}/${neededXP}`, inline: true },
      { name: 'Tier', value: `${tier.name}`, inline: true }
    );

  return message.reply({ embeds: [embed] });
}

// ======================
// 🏆 LEADERBOARD
// ======================
function sendLeaderboard(message) {

  const users = Object.entries(data)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp)
    .slice(0, 10);

  let text = users.map((u, i) =>
    `#${i+1} <@${u.id}> • Lv.${u.level} • ${u.xp} XP`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor('#a855f7')
    .setTitle('🏆 Leaderboard')
    .setDescription(text);

  return message.channel.send({ embeds: [embed] });
}

// ======================
// 🎤 VOICE TRACK
// ======================
const voiceMap = new Map();

client.on('voiceStateUpdate', (oldState, newState) => {

  const id = newState.id;

  if (!data[id]) {
    data[id] = { xp: 0, level: 1, messages: 0, voice: 0, badges: [] };
  }

  if (!oldState.channel && newState.channel) {
    voiceMap.set(id, Date.now());
  }

  if (oldState.channel && !newState.channel) {
    const joinTime = voiceMap.get(id);
    if (!joinTime) return;

    const duration = Math.floor((Date.now() - joinTime) / 60000);
    data[id].voice += duration;

    voiceMap.delete(id);
    fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
  }

});

// ======================
// 🚀 LOGIN
// ======================
client.login(process.env.TOKEN);
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const Canvas = require('canvas');
const fs = require('fs');

console.log("🚀 BOT STARTING...");

// ======================
// ❗ ANTI CRASH (WAJIB)
// ======================
process.on('uncaughtException', err => {
  console.error('ERROR:', err);
});

process.on('unhandledRejection', err => {
  console.error('REJECTION:', err);
});

// ======================
// ❗ TOKEN CHECK
// ======================
if (!process.env.TOKEN) {
  console.log("❌ TOKEN GA ADA");
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
    GatewayIntentBits.MessageContent
  ]
});

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
    data[id] = { xp: 0, level: 1 };
  }

  let user = data[id];

  if (message.content === '!level') {
    return sendLevel(message, user, id);
  }

  if (message.content === '!leaderboard') {
    return sendLeaderboard(message);
  }

  // XP SYSTEM
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
// 🎨 LEVEL CARD CANVAS
// ======================
async function sendLevel(message, user, id) {

  const canvas = Canvas.createCanvas(1000, 300);
  const ctx = canvas.getContext('2d');

  // BG (PAKE GAMBAR LU)
  const bg = await Canvas.loadImage('https://files.catbox.moe/kgbned.jpeg');
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  // DARK OVERLAY
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // AVATAR
  const avatar = await Canvas.loadImage(
    message.author.displayAvatarURL({ extension: 'png' })
  );

  ctx.save();
  ctx.beginPath();
  ctx.arc(120, 150, 70, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatar, 50, 80, 140, 140);
  ctx.restore();

  // RANK
  const users = Object.entries(data)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp);

  const rank = users.findIndex(u => u.id === id) + 1;

  const neededXP = getNeededXP(user.level);
  const tier = getTier(user.level);

  // TEXT
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 35px sans-serif';
  ctx.fillText(message.author.username, 230, 110);

  ctx.fillStyle = tier.color;
  ctx.font = '20px sans-serif';
  ctx.fillText(tier.name, 230, 150);

  // XP TEXT
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText(`${user.xp}/${neededXP} XP`, 230, 185);

  // PROGRESS BAR
  const barX = 230;
  const barY = 200;
  const barWidth = 600;
  const progress = user.xp / neededXP;

  ctx.fillStyle = '#2a2a3d';
  ctx.fillRect(barX, barY, barWidth, 20);

  const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  gradient.addColorStop(0, tier.color);
  gradient.addColorStop(1, '#ffffff');

  ctx.fillStyle = gradient;
  ctx.fillRect(barX, barY, barWidth * progress, 20);

  // SHINE EFFECT
  const shineX = barX + (barWidth * progress * 0.7);
  const shine = ctx.createLinearGradient(shineX, 0, shineX + 80, 0);
  shine.addColorStop(0, 'rgba(255,255,255,0)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.7)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = shine;
  ctx.fillRect(shineX, barY, 80, 20);

  // RANK KANAN
  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 50px sans-serif';
  ctx.fillText(`#${rank}`, 780, 110);

  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`LEVEL ${user.level}`, 780, 150);

  return message.reply({
    files: [{ attachment: canvas.toBuffer(), name: 'rank.png' }]
  });
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
// 🚀 LOGIN
// ======================
client.login(process.env.TOKEN);
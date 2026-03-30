require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

console.log("🚀 BOT STARTING...");

// ======================
// ❗ ANTI CRASH
// ======================
process.on('uncaughtException', err => {
  console.error('ERROR:', err);
});
process.on('unhandledRejection', err => {
  console.error('REJECTION:', err);
});

// ======================
// ❗ LOAD CANVAS (SAFE)
// ======================
let Canvas;
try {
  Canvas = require('canvas');
  console.log("✅ Canvas loaded");
} catch (e) {
  console.log("⚠️ Canvas gagal load (Railway mode)");
}

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
// 💬 MESSAGE EVENT
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

  // XP
  if (!cooldown.has(id)) {
    cooldown.add(id);
    setTimeout(() => cooldown.delete(id), 60000);
    user.xp += Math.floor(Math.random() * 10) + 10;
  }

  while (user.xp >= getNeededXP(user.level)) {
    user.xp -= getNeededXP(user.level);
    user.level++;
    message.channel.send(`🔥 ${message.author} naik ke level ${user.level}!`);
  }

  fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
});

// ======================
// 🎨 LEVEL CARD (SMART)
// ======================
async function sendLevel(message, user, id) {

  // ======================
  // 🧠 CANVAS MODE
  // ======================
  if (Canvas) {
    try {

      const canvas = Canvas.createCanvas(1000, 300);
      const ctx = canvas.getContext('2d');

      const bg = await Canvas.loadImage('https://files.catbox.moe/kgbned.jpeg');
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const avatar = await Canvas.loadImage(
        message.author.displayAvatarURL({ extension: 'png' })
      );

      ctx.beginPath();
      ctx.arc(120, 150, 70, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 50, 80, 140, 140);

      const neededXP = getNeededXP(user.level);
      const tier = getTier(user.level);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(message.author.username, 230, 120);

      ctx.fillStyle = tier.color;
      ctx.fillRect(230, 200, 600 * (user.xp / neededXP), 20);

      return message.reply({
        files: [{ attachment: canvas.toBuffer(), name: 'rank.png' }]
      });

    } catch (err) {
      console.log("⚠️ Canvas error:", err);
    }
  }

  // ======================
  // 💀 FALLBACK MODE
  // ======================
  const neededXP = getNeededXP(user.level);
  const tier = getTier(user.level);

  const embed = new EmbedBuilder()
    .setColor(tier.color)
    .setTitle(`🔥 ${message.author.username}`)
    .setDescription(`Level: ${user.level}\nXP: ${user.xp}/${neededXP}\nTier: ${tier.name}`);

  return message.reply({ embeds: [embed] });
}

// ======================
// 🚀 LOGIN
// ======================
client.login(process.env.TOKEN);
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const Canvas = require('canvas');
const GIFEncoder = require('gifencoder');
const fs = require('fs');

const cooldown = new Set();

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

// ======================
// 🧊 ROUND RECT
// ======================
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

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
  // 🔥 COMMAND PRIORITY
  // ======================
  if (message.content === '!level') {
    return sendLevelCardAnimated(message, user, id);
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
    message.channel.send(`🔥 GG ${message.author} you just advanced to level ${user.level}!`);
  }

  fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
});

// ======================
// 🎨 LEVEL CARD (XP FIX)
// ======================
async function sendLevelCardAnimated(message, user, id) {

  const width = 1000;
  const height = 300;

  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(30);
  encoder.setQuality(10);

  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bg = await Canvas.loadImage('./bg.jpg');

  const users = Object.entries(data)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp);

  const rank = users.findIndex(u => u.id === id) + 1;
  const neededXP = getNeededXP(user.level);
  const tier = getTier(user.level);

  const avatar = await Canvas.loadImage(
    message.author.displayAvatarURL({ extension: 'png' })
  );

  const target = user.xp / neededXP;

  for (let i = 0; i <= 20; i++) {

    const progress = target * (i / 20);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bg, 0, 0, width, height);

    // panel
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, 20, 20, 960, 260, 25);
    ctx.fill();

    // avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 150, 70, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 50, 80, 140, 140);
    ctx.restore();

    // username
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 35px sans-serif';
    ctx.fillText(message.author.username, 230, 110);

    // tier
    ctx.fillStyle = tier.color;
    ctx.font = '20px sans-serif';
    ctx.fillText(tier.name, 230, 150);

    // ======================
    // 💜 XP TEXT (FIX)
    // ======================
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';

    const currentXP = user.xp ?? 0;

    ctx.fillText(`${currentXP}/${neededXP} XP`, 230, 185);

    ctx.restore();

    // ======================
    // 📊 PROGRESS BAR
    // ======================
    const barX = 230;
    const barY = 200;
    const barWidth = 600;

    ctx.fillStyle = 'rgba(30,30,50,0.8)';
    roundRect(ctx, barX, barY, barWidth, 22, 12);
    ctx.fill();

    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, tier.color);
    gradient.addColorStop(1, '#ffffff');

    ctx.fillStyle = gradient;
    roundRect(ctx, barX, barY, barWidth * progress, 22, 12);
    ctx.fill();

    // shine
    const shineX = barX + (barWidth * progress);
    const shine = ctx.createLinearGradient(shineX - 80, 0, shineX, 0);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = shine;
    roundRect(ctx, shineX - 80, barY, 80, 22, 12);
    ctx.fill();

    // rank
    ctx.shadowColor = rank === 1 ? '#FFD700' : '#a855f7';
    ctx.shadowBlur = rank === 1 ? 30 : 15;

    ctx.fillStyle = rank === 1 ? '#FFD700' : '#a855f7';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(`#${rank}`, 780, 110);

    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`LEVEL ${user.level}`, 780, 150);

    ctx.shadowBlur = 0;

    encoder.addFrame(ctx);
  }

  encoder.finish();

  return message.reply({
    files: [{
      attachment: encoder.out.getData(),
      name: 'rank.gif'
    }]
  });
}

// ======================
// 🏆 LEADERBOARD
// ======================
function sendLeaderboard(message) {

  const users = Object.entries(data)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp)
    .slice(0, 50);

  let text = users.map((u, i) =>
    `#${i+1} <@${u.id}> • Lv.${u.level} • ${u.xp} XP`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor('#a855f7')
    .setTitle('🏆 ELITE Leaderboard')
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

client.login(process.env.TOKEN);
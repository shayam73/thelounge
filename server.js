// =========================================
// BOTING v7.0 - Smart IRC Bot by Artesh
// =========================================

const IRC = require("irc-framework");
const http = require("http");

const bot = new IRC.Client();
const startTime = Date.now();

bot.connect({
  host: "irc.mahdkoosh.com",
  port: 6667,
  nick: "BOTING",
  gecos: "Smart IRC Bot v7.0",
});

const channels = ["#gap"];
const lastSeen = {};
const scores = {}; // { nick: { points: Number } }
let activeRiddle = null;
let riddleTimer = null;
let activeChallenge = null;

// --------------------------------------
// چیستان‌ها
// --------------------------------------
const riddles = [
  { q: "چی پره ولی پرنده نیست؟", a: ["هواپیما", "havapeyma", "plane"] },
  { q: "اون چیه که دندون داره ولی گاز نمی‌گیره؟", a: ["شونه", "shoone", "comb"] },
  { q: "اون چیه که هر چی ازش برداری بزرگ‌تر میشه؟", a: ["چاله", "chale", "hole"] },
  { q: "اون چیه که می‌دوه ولی پا نداره؟", a: ["آب", "ab", "water"] },
  { q: "اون چیه که چشم داره ولی نمی‌بینه؟", a: ["سوزن", "sozan", "needle"] },
];

// --------------------------------------
// اتصال
// --------------------------------------
bot.on("registered", () => {
  console.log("[BOTING] ✅ Connected to irc.mahdkoosh.com");
  channels.forEach((ch) => bot.join(ch));
});

// --------------------------------------
// خوش‌آمد
// --------------------------------------
bot.on("join", (e) => {
  const { nick, channel } = e;
  if (nick === "BOTING") return;

  if (nick.toLowerCase() === "artesh") {
    bot.say(channel, `🤖 Welcome back ${nick}! mamnoon baraye sakhtane in robot 🌹`);
  } else {
    bot.say(channel, `khosh amadid ${nick} be ${channel} 🌸`);
  }
});

// --------------------------------------
// پیام‌ها / دستورات
// --------------------------------------
bot.on("message", (e) => {
  const nick = e.nick;
  const target = e.target;
  const text = e.message.trim();

  // آخرین پیام هر نیک
  lastSeen[nick.toLowerCase()] = {
    time: new Date().toLocaleString(),
    channel: target,
    message: text,
  };

  // ==================== HELP ====================
  if (text === "help") {
    bot.say(
      target,
      `📜 ${nick}: dastorat → seen <nick> | time | ontime | chistan | challenge <nick> | answer <javab> | scoreboard | game`
    );
  }

  // ==================== SEEN ====================
  if (text.startsWith("seen ")) {
    const who = text.split(" ")[1]?.toLowerCase();
    if (!who) return bot.say(target, `${nick}: esm karbar ra vared kon.`);
    if (who === nick.toLowerCase()) return bot.say(target, `${nick}: khodet hasti 😅`);
    if (lastSeen[who]) {
      const d = lastSeen[who];
      bot.say(
        target,
        `${nick}: ${who} akharin bar dar ${d.time} dar ${d.channel} goft: "${d.message}"`
      );
    } else bot.say(target, `${nick}: ${who} ra hanooz nadidam 🤔`);
  }

  // ==================== TIME ====================
  if (text === "time") {
    bot.say(target, `${nick}: zamani alan ast → ${new Date().toLocaleString()}`);
  }

  // ==================== ONTIME ====================
  if (text === "ontime") {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    bot.say(target, `${nick}: bot az ${h}h ${m}m ${s}s pish online ast`);
  }

  // ==================== CHISTAN (تک‌نفره) ====================
  if (text === "chistan") {
    if (activeRiddle) return bot.say(target, `${nick}: chistan ghabl dar hale ejra ast.`);
    const r = riddles[Math.floor(Math.random() * riddles.length)];
    activeRiddle = { ...r, user: nick };
    bot.say(target, `🧩 ${nick}: ${r.q} (4 daghighe vaght dari javab bedi!)`);

    riddleTimer = setTimeout(() => {
      bot.say(target, `${nick}: ⏰ zaman tamoom shod! javab dorost bood: ${r.a[0]}`);
      activeRiddle = null;
    }, 240000);
  }

  // ==================== CHALLENGE (چندنفره) ====================
  if (text.startsWith("challenge ")) {
    const opponent = text.split(" ")[1];
    if (!opponent) return bot.say(target, `${nick}: esm kasi ke mikhay chalesh bedi ro benevis.`);
    if (activeChallenge)
      return bot.say(target, `yeki az chalengeha dar hale ejrast, sabr kon!`);

    const r = riddles[Math.floor(Math.random() * riddles.length)];
    activeChallenge = {
      riddle: r,
      players: [nick, opponent],
      answers: {},
    };

    bot.say(target, `🔥 ${nick} ${opponent} ro be chaleshe chistan davat kard!`);
    bot.say(target, `🧠 soal: ${r.q} (4 daghighe vaght dari javab bedi!)`);

    riddleTimer = setTimeout(() => {
      bot.say(target, `⏰ zaman chalesh tamoom shod! javab dorost: ${r.a[0]}`);
      activeChallenge = null;
    }, 240000);
  }

  // ==================== ANSWER ====================
  if (text.startsWith("answer ")) {
    const answer = text.substring(7).trim().toLowerCase();
    if (!answer) return bot.say(target, `${nick}: javabet ro benevis.`);

    const normalize = (str) => str.replace(/[آاآ]/g, "ا").toLowerCase();

    // پاسخ برای چیستان تکی
    if (activeRiddle && activeRiddle.user === nick) {
      const correct = activeRiddle.a.some((a) => normalize(a) === normalize(answer));
      if (correct) {
        clearTimeout(riddleTimer);
        bot.say(target, `✅ afarin ${nick}! javabet dorost bood.`);
        scores[nick] = (scores[nick] || 0) + 1;
        activeRiddle = null;
      } else {
        bot.say(target, `❌ ${nick}: javabet ghalat ast, dobare talash kon!`);
      }
    }

    // پاسخ برای چالش دو نفره
    if (activeChallenge && activeChallenge.players.includes(nick)) {
      activeChallenge.answers[nick] = answer;
      const correct = activeChallenge.riddle.a.some(
        (a) => normalize(a) === normalize(answer)
      );
      if (correct) {
        clearTimeout(riddleTimer);
        bot.say(target, `🏆 ${nick} barande shod! javab dorost bood: ${activeChallenge.riddle.a[0]}`);
        scores[nick] = (scores[nick] || 0) + 2;
        activeChallenge = null;
      } else {
        bot.say(target, `${nick}: javabet dorost nist 😅`);
      }
    }
  }

  // ==================== SCOREBOARD ====================
  if (text === "scoreboard") {
    if (Object.keys(scores).length === 0)
      return bot.say(target, `hanooz kasi emtiaz nagerefte!`);
    const list = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([n, s]) => `${n}: ${s}`)
      .join(" | ");
    bot.say(target, `🏅 jadval emtiaz: ${list}`);
  }

  // ==================== GAME ساده ====================
  if (text === "game") {
    const num = Math.floor(Math.random() * 5) + 1;
    bot.say(target, `${nick}: adad ra hads bezan (1 ta 5)`);
    bot.once("message", (e2) => {
      if (parseInt(e2.message) === num) {
        bot.say(target, `🎯 afarin ${nick}! javab ${num} bood.`);
        scores[nick] = (scores[nick] || 0) + 1;
      } else bot.say(target, `❌ ${nick}, javab dorost ${num} bood.`);
    });
  }
});

// --------------------------------------
// Keep Alive for Render
// --------------------------------------
http.createServer((req, res) => res.end("BOTING active")).listen(process.env.PORT || 3000);

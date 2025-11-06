const IRC = require("irc-framework");
const fs = require("fs");

const BOT_NICK = "BOTING";
const IRC_HOST = "irc.mahdkoosh.com";
const IRC_PORT = 6667;
const CHANNELS = ["#gap", "#iran", "#BOTING"];
const OWNER = "Artesh";

const startTime = Date.now();
let welcomeEnabled = {};
let owners = [OWNER];
let seen = {};
let scores = {};
let activeChistans = {};

// ---- تابع ذخیره دیتا ----
function saveData() {
  fs.writeFileSync("data.json", JSON.stringify({ seen, scores, owners, welcomeEnabled }, null, 2));
}

// ---- بارگذاری دیتا ----
if (fs.existsSync("data.json")) {
  const data = JSON.parse(fs.readFileSync("data.json"));
  seen = data.seen || {};
  scores = data.scores || {};
  owners = data.owners || [OWNER];
  welcomeEnabled = data.welcomeEnabled || {};
}

// ---- تعریف کلاینت ----
const bot = new IRC.Client();
bot.connect({
  host: IRC_HOST,
  port: IRC_PORT,
  nick: BOT_NICK,
  gecos: "BOTING Smart Bot v4.0",
  username: BOT_NICK,
  auto_reconnect: true,
});

// ---- ورود ربات ----
bot.on("registered", () => {
  console.log("✅ BOTING connected to", IRC_HOST);
  CHANNELS.forEach((ch) => bot.join(ch));
});

// ---- پیام‌ها ----
bot.on("message", (event) => {
  const { nick, target, message } = event;
  if (!nick || nick === BOT_NICK) return;

  seen[nick] = { time: Date.now(), channel: target, message };
  saveData();

  const text = message.trim().toLowerCase();

  // ======= Help =======
  if (text === "help") {
    bot.say(target, `${nick}: دستورات ربات 👇`);
    bot.say(target, `ping, time, ontime, seen <nick>, chistan, answer <جواب>, join <کانال>, part <کانال>, addowner <nick>, welcome on/off`);
    return;
  }

  // ======= Ping واقعی =======
  if (text === "ping") {
    const start = Date.now();
    const token = Math.random().toString(36).slice(2, 8);
    const handlePong = (ev) => {
      if (ev.message === token) {
        const latency = Date.now() - start;
        bot.say(target, `${nick}: 🏓 pong from ${IRC_HOST} (${latency}ms)`);
        bot.off("pong", handlePong);
      }
    };
    bot.on("pong", handlePong);
    bot.raw(`PING :${token}`);
    return;
  }

  // ======= Time =======
  if (text === "time") {
    bot.say(target, `${nick}: 🕒 ${new Date().toLocaleString()}`);
    return;
  }

  // ======= OnTime =======
  if (text === "ontime") {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    bot.say(target, `${nick}: ⏱ BOT فعال بوده ${h}h ${m}m ${s}s`);
    return;
  }

  // ======= Seen =======
  if (text.startsWith("seen ")) {
    const n = text.split(" ")[1];
    if (seen[n]) {
      const last = new Date(seen[n].time).toLocaleString();
      bot.say(target, `${nick}: ${n} آخرین بار در ${seen[n].channel} بود (${last}) گفت: ${seen[n].message}`);
    } else bot.say(target, `${nick}: از ${n} خبری ندارم!`);
    return;
  }

  // ======= خوش‌آمد =======
  if (text === "welcome on" && owners.includes(nick)) {
    welcomeEnabled[target] = true;
    bot.say(target, `${nick}: خوش‌آمدگویی فعال شد ✅`);
    saveData();
    return;
  }
  if (text === "welcome off" && owners.includes(nick)) {
    welcomeEnabled[target] = false;
    bot.say(target, `${nick}: خوش‌آمدگویی غیرفعال شد ❌`);
    saveData();
    return;
  }

  // ======= Owner اضافه کردن =======
  if (text.startsWith("addowner ") && owners.includes(nick)) {
    const newOwner = text.split(" ")[1];
    if (!owners.includes(newOwner)) {
      owners.push(newOwner);
      saveData();
      bot.say(target, `${nick}: ${newOwner} الان صاحب ربات شد 🔑`);
    } else bot.say(target, `${nick}: قبلاً هست!`);
    return;
  }

  // ======= Join / Part =======
  if (text.startsWith("join ") && owners.includes(nick)) {
    const ch = text.split(" ")[1];
    bot.join(ch);
    bot.say(target, `${nick}: وارد ${ch} شدم ✅`);
    return;
  }
  if (text.startsWith("part ") && owners.includes(nick)) {
    const ch = text.split(" ")[1];
    bot.part(ch, "BYE 👋");
    bot.say(target, `${nick}: از ${ch} خارج شدم ✅`);
    return;
  }

  // ======= چیستان =======
  if (text === "chistan") {
    const chistans = [
      { q: "چیه که هرچی ازش می‌کنی کوچیک‌تر میشه؟", a: "مداد" },
      { q: "اون چیه که پرواز میکنه ولی بال نداره؟", a: "زمان" },
      { q: "اون چیه که دو تا پا داره ولی راه نمیره؟", a: "شلوار" },
      {"q": "chi chizi ast ke har chi azash bekeshi koochiktar mishe?", "a": "medad"},
      {"q": "oon chie ke bal dare vali parvande nist?", "a": "zaman"},
      {"q": "chi por az soorakh ast vali ab negah midare?", "a": "esfanji"},
      {"q": "chi dahan dare vali harf nemizane?", "a": "rudkhane"},
      {"q": "chi vaghti khoshk mikoni khis mishe?", "a": "havle"},
      {"q": "chi hame ja hast vali dide nemishe?", "a": "havaa"},
      {"q": "chi dare vali nemitune negah dare?", "a": "nafas"},
      {"q": "chi ro mishe shekast vali narahat nemishe?", "a": "sokoot"},
      {"q": "chi har che bishtar dashte bashi kamtar mibini?", "a": "tariki"},
      {"q": "chi rah mire vali pa nadare?", "a": "sa-at"}
    ];
    const random = chistans[Math.floor(Math.random() * chistans.length)];
    activeChistans[target] = { q: random.q, a: random.a, time: Date.now(), askedBy: nick };
    bot.say(target, `${nick}: 🤔 ${random.q} (۴ دقیقه وقت داری)`);
    setTimeout(() => {
      if (activeChistans[target]) {
        bot.say(target, `${nick}: ⏰ وقت تموم شد! جواب درست: ${random.a}`);
        delete activeChistans[target];
      }
    }, 240000);
    return;
  }

  if (text.startsWith("answer ")) {
    const answer = text.split(" ").slice(1).join(" ").trim();
    const current = activeChistans[target];
    if (current) {
      if (answer.includes(current.a) || current.a.includes(answer)) {
        bot.say(target, `${nick}: 🎉 آفرین درست گفتی! جواب ${current.a} بود.`);
        scores[nick] = (scores[nick] || 0) + 1;
        delete activeChistans[target];
      } else {
        bot.say(target, `${nick}: ❌ نه، اشتباه گفتی!`);
      }
      saveData();
    }
    return;
  }
});

// ======= خوش‌آمد خودکار =======
bot.on("join", (ev) => {
  const { nick, channel } = ev;
  if (nick === BOT_NICK) return;
  if (nick.toLowerCase() === OWNER.toLowerCase()) {
    bot.say(channel, `🎖 خوش‌اومدی فرمانده ${nick}! ممنون برای ساخت BOTING ❤️`);
  } else if (welcomeEnabled[channel] !== false) {
    const welcomes = [
      `سلام ${nick}، خوش اومدی 🌸`,
      `${nick} اومد! همه دست بزنید 👏`,
      `یه ${nick} جدید اومده 😄`,
      `درود بر ${nick} عزیز! ☀️`,
      `${nick} خوش اومدی به ${channel} 💫`,
    ];
    const msg = welcomes[Math.floor(Math.random() * welcomes.length)];
    bot.say(channel, msg);
  }
});

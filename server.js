const irc = require("irc");
const fs = require("fs");

const config = {
  server: "irc.mahdkoosh.com",
  botName: "BOTING",
  channels: ["#gap", "#iran", "#BOTING"],
  owner: ["Artesh"], // صاحبان اولیه
};

// دیتابیس ساده برای امتیازها و مالکان
let owners = new Set(config.owner);
let scores = {};
let riddles = JSON.parse(fs.readFileSync("riddles.json", "utf8"));

// ساخت بات IRC
const bot = new irc.Client(config.server, config.botName, {
  channels: config.channels,
  autoConnect: true,
});

// زمان ورود
const startTime = new Date();

// پیام ورود
bot.addListener("join", function (channel, nick) {
  if (nick === config.botName) {
    console.log(`Joined ${channel}`);
  } else if (nick.toLowerCase() === "artesh") {
    bot.say(channel, `⭐ خوش اومدی ارتش! ممنون برای ساخت این ربات! 🌟`);
  } else {
    bot.say(channel, `Welcome ${nick}! خوش اومدی به ${channel}`);
  }
});

// تابع خوشامد
function welcomeUser(channel, nick) {
  bot.say(channel, `Welcome ${nick}! خوش اومدی به ${channel}`);
}

// دستورها
bot.addListener("message", function (from, to, text) {
  const msg = text.trim();
  const lower = msg.toLowerCase();

  // Ping
  if (lower.startsWith("!ping")) {
    const now = new Date();
    bot.say(to, `Pong! ⏱ ${now.toLocaleTimeString()}`);
  }

  // زمان آنلاین
  if (lower.startsWith("!ontime") || lower.startsWith("!time")) {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    bot.say(to, `⏳ من ${hours} ساعت و ${mins} دقیقه هست که آنلاینم!`);
  }

  // اضافه کردن owner
  if (lower.startsWith("!owner add")) {
    const parts = msg.split(" ");
    const nick = parts[2];
    if (owners.has(from)) {
      owners.add(nick);
      bot.say(to, `${nick} به عنوان owner اضافه شد ✅`);
    } else {
      bot.say(to, `${from} شما اجازه ندارید این دستور را اجرا کنید ❌`);
    }
  }

  // Join کانال جدید
  if (lower.startsWith("!join")) {
    const parts = msg.split(" ");
    if (owners.has(from) && parts[1]) {
      bot.join(parts[1]);
      bot.say(to, `به کانال ${parts[1]} پیوستم ✅`);
    }
  }

  // Part از کانال
  if (lower.startsWith("!part")) {
    const parts = msg.split(" ");
    if (owners.has(from) && parts[1]) {
      bot.part(parts[1], "Goodbye 👋");
    }
  }

  // شروع چیستان
  if (lower.startsWith("!chistan")) {
    const riddle = riddles[Math.floor(Math.random() * riddles.length)];
    bot.say(to, `🤔 چیستان: ${riddle.q}`);

    let answered = false;
    const timerHint = setTimeout(() => {
      if (!answered) bot.say(to, `💡 راهنمایی: ${riddle.hint}`);
    }, 2 * 60 * 1000);

    const timerEnd = setTimeout(() => {
      if (!answered) bot.say(to, `⏰ وقت تموم شد! جواب درست: ${riddle.a}`);
    }, 4 * 60 * 1000);

    const answerListener = function (nick, chan, message) {
      if (chan === to && !answered) {
        const normalized = message.replace(/[\u200c]/g, "").trim().toLowerCase();
        const ans = riddle.a.toLowerCase();
        if (normalized === ans || normalized === toEnglish(ans)) {
          answered = true;
          clearTimeout(timerHint);
          clearTimeout(timerEnd);
          scores[nick] = (scores[nick] || 0) + 1;
          bot.say(to, `✅ آفرین ${nick}! درست گفتی. امتیازت شد ${scores[nick]} 🎯`);
          bot.removeListener("message", answerListener);
        }
      }
    };
    bot.addListener("message", answerListener);
  }

  // نمایش امتیازها
  if (lower.startsWith("!score")) {
    const entries = Object.entries(scores)
      .map(([nick, sc]) => `${nick}: ${sc}`)
      .join(", ");
    bot.say(to, entries || "هیچ امتیازی ثبت نشده هنوز 😅");
  }
});

// تبدیل فارسی به انگلیسی برای مقایسه جواب‌ها
function toEnglish(str) {
  const map = {
    ا: "a",
    ب: "b",
    پ: "p",
    ت: "t",
    ث: "s",
    ج: "j",
    چ: "ch",
    ح: "h",
    خ: "kh",
    د: "d",
    ر: "r",
    ز: "z",
    ژ: "zh",
    س: "s",
    ش: "sh",
    ف: "f",
    ق: "gh",
    ک: "k",
    گ: "g",
    ل: "l",
    م: "m",
    ن: "n",
    و: "v",
    ه: "h",
    ی: "y",
  };
  return str
    .split("")
    .map((c) => map[c] || c)
    .join("");
}

console.log("🤖 MySmartBot در حال اجراست...");

import irc from "irc";
import express from "express";

// سرور ساده برای Render (برای بیدار نگه داشتن)
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("🤖 BOTING IRC Bot is running..."));
app.listen(PORT, () => console.log(`🌐 Web active on port ${PORT}`));

// تنظیمات اصلی IRC
const config = {
  server: "irc.mahdkoosh.com",
  nick: "BOTING",
  channels: ["#gap", "#iran", "#BOTING"],
  userName: "BOT",
  realName: "BOT v4.0",
  port: 6667,
  autoConnect: true,
};

const client = new irc.Client(config.server, config.nick, {
  channels: config.channels,
  userName: config.userName,
  realName: config.realName,
  port: config.port,
  autoConnect: config.autoConnect,
});

let owners = ["Artesh"]; // صاحبان ربات
let scores = {}; // امتیازها
let riddles = [
  { q: "چی چیزی است که پر است ولی خالیست؟", a: "توری" },
  { q: "اون چیه هرچی بیشتر می‌کِشی کوتاه‌تر میشه؟", a: "سیگار" },
  { q: "چی بدون نفس نفس می‌زنه؟", a: "ساعت" },
  { q: "اون چیه تو شب میاد و صبح میره؟", a: "ستاره" },
];

// زمانی که وصل شد
client.addListener("registered", () => {
  console.log("✅ BOTING connected to IRC:", config.server);
  client.say("#gap", "🤖 BOTING v4.0 online! Type !help for commands");
});

// خوش‌آمد
client.addListener("join", (channel, nick) => {
  if (nick === "Artesh") {
    client.say(channel, "🎖 سلام Artesh! خسته نباشی بابت ساخت BOTING ❤️");
  } else {
    client.say(channel, `👋 خوش اومدی ${nick}!`);
  }
});

// مدیریت پیام‌ها
client.addListener("message", (from, to, message) => {
  const msg = message.trim();
  const lower = msg.toLowerCase();

  // دستور help
  if (lower === "!help") {
    client.say(
      to,
      `📘 Available Commands:
!ping → بررسی وضعیت ربات
!time → ساعت فعلی
!ontime → زمان فعال بودن ربات
!join #channel → پیوستن به کانال
!part #channel → ترک کانال
!addowner <nick> → افزودن مدیر
!riddle → دریافت چیستان
!score → مشاهده امتیاز
!challenge <nick> → چالش دو نفره
!help → نمایش راهنما`
    );
  }

  // Ping
  else if (lower === "!ping") {
    client.say(to, `🏓 Pong! ${new Date().toLocaleTimeString()}`);
  }

  // زمان فعلی
  else if (lower === "!time") {
    const now = new Date();
    client.say(to, `🕒 زمان فعلی: ${now.toLocaleTimeString()} (${now.toLocaleDateString()})`);
  }

  // زمان فعال بودن
  else if (lower === "!ontime") {
    client.say(to, "⚡ BOTING از زمان اتصال همچنان فعاله!");
  }

  // جوین کانال
  else if (lower.startsWith("!join ")) {
    const chan = msg.split(" ")[1];
    if (owners.includes(from)) {
      client.join(chan);
      client.say(to, `✅ Joined ${chan}`);
    } else client.say(to, "❌ فقط مدیران می‌تونن این دستور رو بزنن.");
  }

  // ترک کانال
  else if (lower.startsWith("!part ")) {
    const chan = msg.split(" ")[1];
    if (owners.includes(from)) {
      client.part(chan);
      client.say(to, `🚪 Left ${chan}`);
    } else client.say(to, "❌ فقط مدیران می‌تونن این دستور رو بزنن.");
  }

  // افزودن owner جدید
  else if (lower.startsWith("!addowner ")) {
    if (owners.includes(from)) {
      const newOwner = msg.split(" ")[1];
      owners.push(newOwner);
      client.say(to, `👑 ${newOwner} به لیست مدیران اضافه شد!`);
    } else client.say(to, "❌ فقط مدیران می‌تونن مدیر جدید اضافه کنن.");
  }

  // چیستان
  else if (lower === "!riddle") {
    const r = riddles[Math.floor(Math.random() * riddles.length)];
    client.say(to, `🧩 چیستان: ${r.q}`);
    client.say(to, "(برای پاسخ، جواب را تایپ کنید)");
    client.pendingRiddle = { question: r.q, answer: r.a, user: from, channel: to };
  }

  // پاسخ به چیستان
  else if (client.pendingRiddle && to === client.pendingRiddle.channel) {
    const guess = msg.replace(/[a-zA-Z]/g, (ch) => ch); // برای تشخیص فارسی/انگلیسی
    if (guess.includes(client.pendingRiddle.answer)) {
      client.say(to, `🎉 آفرین ${from}! جواب درست بود ✅`);
      scores[from] = (scores[from] || 0) + 10;
      client.pendingRiddle = null;
    }
  }

  // امتیاز
  else if (lower === "!score") {
    const score = scores[from] || 0;
    client.say(to, `🏅 ${from} امتیاز شما: ${score}`);
  }

  // چالش دو نفره
  else if (lower.startsWith("!challenge ")) {
    const opponent = msg.split(" ")[1];
    if (!opponent) return client.say(to, "❗ نام کاربر را وارد کن.");
    client.say(to, `⚔️ ${from} ${opponent} را به چالش دعوت کرده!`);
    client.say(to, `🎮 هر دو با !ready تایپ کنید تا شروع کنیم.`);
    client.challenge = { p1: from, p2: opponent, ready: [] };
  }

  else if (lower === "!ready" && client.challenge) {
    const ch = client.challenge;
    if (ch.ready.includes(from)) return;
    ch.ready.push(from);
    if (ch.ready.length === 2) {
      client.say(to, "🔥 چالش شروع شد! اولین کسی که جواب درست بده برنده‌ست!");
      const r = riddles[Math.floor(Math.random() * riddles.length)];
      ch.riddle = r;
      client.say(to, `🧠 سوال: ${r.q}`);
    }
  }

  else if (client.challenge && client.challenge.riddle && to === "#gap") {
    const r = client.challenge.riddle;
    if (msg.includes(r.a)) {
      const winner = from;
      client.say(to, `🏆 ${winner} برنده چالش شد!`);
      scores[winner] = (scores[winner] || 0) + 20;
      client.challenge = null;
    }
  }
});

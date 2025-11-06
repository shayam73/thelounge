const IRC = require("irc-framework");
const fs = require("fs");

// پیکربندی اصلی
const BOT_NICK = "BOTING";
const IRC_HOST = "irc.mahdkoosh.com";
const IRC_PORT = 6667;

// داده‌های ذخیره‌ای
const dataFile = "./data.json";
let data = { seen: {}, scores: {}, owners: ["Amir"], channels: {} };

// لود فایل دیتا
if (fs.existsSync(dataFile)) {
  data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

// ذخیره خودکار
function saveData() {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// اتصال IRC
const client = new IRC.Client();
client.connect({
  host: IRC_HOST,
  port: IRC_PORT,
  nick: BOT_NICK,
  username: BOT_NICK,
  gecos: "BOT v4.0",
  auto_reconnect: true,
  channels: ["#gap"]
});

// زمان شروع برای uptime
const startTime = Date.now();

// 🟢 رویداد: وقتی وارد کانال میشه
client.on("registered", () => {
  console.log(`[${BOT_NICK}] Connected to ${IRC_HOST}`);
});

client.on("join", (event) => {
  const { nick, channel } = event;
  if (nick === BOT_NICK) return; // خود ربات رو نادیده بگیر

  // خوش آمد گویی فقط اگه روشنه
  if (!data.channels[channel]) data.channels[channel] = { welcome: true };
  if (data.channels[channel].welcome) {
    if (!data.lastWelcome || data.lastWelcome !== nick) {
      data.lastWelcome = nick;
      client.say(channel, `سلام ${nick} 🌷 خوش اومدی به ${channel}`);
      saveData();
    }
  }

  // ذخیره زمان seen
  data.seen[nick] = { time: Date.now(), channel };
  saveData();
});

client.on("part", (event) => {
  const { nick, channel } = event;
  data.seen[nick] = { time: Date.now(), channel, part: true };
  saveData();
});

// 📜 دریافت پیام‌ها
client.on("message", (event) => {
  const { nick, message, target } = event;
  const args = message.trim().split(" ");
  const cmd = args[0].toLowerCase();
  const owner = data.owners.includes(nick);

  // ذخیره آخرین فعالیت کاربر
  data.seen[nick] = { time: Date.now(), channel: target };
  saveData();

  // ---------- دستورات ----------

  if (cmd === "help") {
    client.say(
      target,
      "📘 دستورات ربات:\n" +
        "help - راهنما\n" +
        "seen <nick> - آخرین زمان فعالیت\n" +
        "join <#channel> - اضافه شدن به کانال (فقط مالک)\n" +
        "part <#channel> - خروج از کانال (فقط مالک)\n" +
        "welcome on/off - فعال یا غیرفعال‌کردن خوش‌آمدگویی\n" +
        "ontime - نمایش زمان روشن بودن ربات\n" +
        "time - ساعت فعلی\n" +
        "chistan - شروع چیستان هوش\n" +
        "score - امتیاز شما"
    );
  }

  // 🎯 seen
  else if (cmd === "seen" && args[1]) {
    const user = args[1];
    if (data.seen[user]) {
      const last = new Date(data.seen[user].time);
      client.say(
        target,
        `👀 ${user} آخرین‌بار در ${data.seen[user].channel} در ${last.toLocaleString()} دیده شده.`
      );
    } else client.say(target, `❌ اطلاعاتی از ${user} ندارم.`);
  }

  // 🧠 chistan (چیستان)
  else if (cmd === "chistan") {
    const riddles = [
      { q: "چیه که پر داره ولی پرنده نیست؟", a: "بالش" },
      { q: "اون چیه که خیس میشه ولی خشک می‌کنه؟", a: "حوله" },
      { q: "اون چیه که دو تا پا داره ولی راه نمیره؟", a: "شلوار" },
      { q: "اون چیه که پره ولی پرواز نمی‌کنه؟", a: "ابر" }
    ];
    const item = riddles[Math.floor(Math.random() * riddles.length)];
    client.say(target, `🧩 چیستان: ${item.q} (۴ دقیقه فرصت داری!)`);

    data.currentRiddle = { user: nick, question: item.q, answer: item.a, time: Date.now() };
    saveData();

    // راهنمایی بعد از ۲ دقیقه
    setTimeout(() => {
      if (data.currentRiddle && Date.now() - data.currentRiddle.time < 240000)
        client.say(target, "🕒 راهنما: جوابش با " + item.a[0] + " شروع میشه!");
    }, 120000);

    // اتمام ۴ دقیقه
    setTimeout(() => {
      if (data.currentRiddle && Date.now() - data.currentRiddle.time >= 240000) {
        client.say(target, `⏰ وقت تموم شد! جواب درست: ${item.a}`);
        data.currentRiddle = null;
        saveData();
      }
    }, 240000);
  }

  // بررسی پاسخ چیستان
  else if (data.currentRiddle && message.trim() === data.currentRiddle.answer) {
    client.say(target, `✅ آفرین ${nick}! جواب درست بود.`);
    data.scores[nick] = (data.scores[nick] || 0) + 1;
    data.currentRiddle = null;
    saveData();
  }

  // 🏆 امتیاز
  else if (cmd === "score") {
    const score = data.scores[nick] || 0;
    client.say(target, `⭐ امتیاز شما: ${score}`);
  }

  // ⏱ ontime
  else if (cmd === "ontime") {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    client.say(target, `⏰ زمان روشن بودن ربات: ${h} ساعت ${m} دقیقه ${s} ثانیه`);
  }

  // 🕒 time
  else if (cmd === "time") {
    const now = new Date();
    client.say(target, `🕓 زمان فعلی: ${now.toLocaleString("fa-IR")}`);
  }

  // ⚙️ welcome on/off
  else if (cmd === "welcome" && args[1]) {
    if (!owner) return client.say(target, "❌ فقط مالک می‌تواند تغییر دهد.");
    const ch = target;
    if (!data.channels[ch]) data.channels[ch] = { welcome: true };
    data.channels[ch].welcome = args[1] === "on";
    saveData();
    client.say(ch, `🎉 خوش‌آمدگویی در ${ch} ${args[1] === "on" ? "فعال" : "غیرفعال"} شد.`);
  }

  // ➕ join
  else if (cmd === "join" && owner) {
    const ch = args[1];
    if (ch) {
      client.join(ch);
      client.say(ch, "🤖 BOTING وصل شد!");
    }
  }

  // ➖ part
  else if (cmd === "part" && owner) {
    const ch = args[1] || target;
    client.part(ch, "خداحافظ 👋");
  }
});

// ===============================
// 🧠 BOTING IRC + Web Server
// ===============================

// 1️⃣ کتابخانه‌ها
const express = require("express");
const http = require("http");
const irc = require("irc");
const moment = require("moment");

// 2️⃣ تنظیمات سرور
const app = express();
const PORT = process.env.PORT || 10000; // ← این خط باعث میشه Render خودش پورت رو بده

// 3️⃣ ایجاد سرور HTTP برای UptimeRobot و Render
app.get("/", (req, res) => {
  res.send(`
    <h2>🤖 BOTING is online!</h2>
    <p>Server time: ${moment().format("YYYY-MM-DD HH:mm:ss")}</p>
    <p>Status: Running smoothly 🚀</p>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// ===============================
// ⚙️ تنظیمات IRC Bot
// ===============================

// اطلاعات اتصال
const botName = "BOTING";
const channels = ["#iran", "#gap", "#BOTING"];

const client = new irc.Client("irc.mahkoosh.com", botName, {
  channels: channels,
  autoRejoin: true,
  autoConnect: true,
  retryCount: 9999,
  retryDelay: 5000,
});

// ===============================
// 🤖 رفتارهای ربات
// ===============================

// خوش‌آمدگویی برای کاربران جدید
const welcomeMessages = [
  "🎉 خوش اومدی به سرور!",
  "🔥 به جمع ما خوش اومدی!",
  "💫 نورت زیاد!",
  "😎 BOTING در خدمت شماست!",
  "🎊 یه کاربر جدید! خوش اومدی!",
];

// تابع انتخاب پیام تصادفی بدون تکرار زیاد
function randomWelcome() {
  const msg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  return msg;
}

// وقتی ربات به سرور وصل میشه
client.addListener("registered", () => {
  console.log("🤖 BOTING connected to IRC server successfully!");
});

// وقتی کسی وارد کانال شد
client.addListener("join", (channel, nick) => {
  if (nick === botName) return;
  const message = `${nick}, ${randomWelcome()}`;
  client.say(channel, message);

  // تشکر از نیک خاص
  if (nick.toLowerCase() === "artesh") {
    client.say("#BOTING", "🙏 تشکر از Art3sh برای ویرایش ربات 💪");
  }

  // تشکر خاص از aMIR
  if (nick.toLowerCase() === "amir") {
    client.say("#BOTING", "⚡ aMIR joined — BOTING appreciates your presence 💎");
  }
});

// پاسخ دادن به زمانی که اسم ربات صدا زده میشه (فارسی یا انگلیسی)
client.addListener("message", (from, to, message) => {
  const msg = message.toLowerCase();

  // وقتی اسم ربات گفته شد
  if (msg.includes("boting") || msg.includes("بوتینگ")) {
    const replies = [
      "👋 I'm here!",
      "⚡ BOTING active!",
      "💬 Yes? How can I help?",
      "🤖 BOTING ready for action!",
      "😄 At your service!",
      "👀 Listening!",
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    client.say(to, reply);
  }

  // وقتی کسی گفت artesh
  if (msg.includes("artesh")) {
    client.say(to, "💎 Special thanks to Art3sh for maintaining BOTING!");
  }

  // تغییر نام ربات فقط توسط نیک aMIR
  if (from.toLowerCase() === "amir" && msg.startsWith("amir change nick")) {
    const parts = msg.split(" ");
    const newNick = parts[3];
    if (newNick) {
      client.send("NICK", newNick);
      client.say(to, `✅ Nickname changed to ${newNick}`);
    } else {
      client.say(to, "⚠️ Please specify a new nickname after 'amir change nick'");
    }
  }

  // خاموش شدن ربات فقط توسط aMIR
  if (from.toLowerCase() === "amir" && msg === "off amir") {
    client.say(to, "🛑 BOTING is going offline...");
    client.disconnect("Shutdown command by aMIR");
    process.exit(0);
  }
});

// خطایابی
client.addListener("error", (message) => {
  console.error("❌ IRC Error:", message);
});

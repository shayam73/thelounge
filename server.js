const express = require("express");
const IRC = require("irc-framework");
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("🤖 BOTING IRC bot is online and running smoothly!");
});

app.listen(PORT, () => {
  console.log(`🚀 Web server running on port ${PORT}`);
});

// === IRC Bot Config ===
const client = new IRC.Client();

const BOT_NICK = "BOTING";
const BOT_OWNER = "Artesh";
const PASSWORD = "123654";
const CHANNELS = ["#iran", "#gap", "#BoTiNG"];
const COLORS = ["\x0304", "\x0308", "\x0310", "\x0312", "\x0309", "\x0307", "\x0303", "\x0313", "\x0314"];

let isActive = true;

client.connect({
  host: "irc.mahdkoosh.com",
  port: 6667,
  nick: BOT_NICK,
  password: PASSWORD,
  auto_reconnect: true,
  username: "BOTING",
  gecos: "Advanced IRC Bot"
});

client.on("registered", () => {
  CHANNELS.forEach(c => client.join(c));
  console.log(`🤖 Connected as ${BOT_NICK}`);
});

client.on("message", (event) => {
  if (!isActive) return;

  const msg = event.message.trim();
  const nick = event.nick;
  const channel = event.target;

  // وقتی کسی اسم ربات را گفت
  if (msg.toLowerCase().includes(BOT_NICK.toLowerCase())) {
    const responses = [
      "I'm here but busy right now.",
      "Not available at the moment.",
      "BOTING is online but sleeping mode 😴.",
      "Hi there! BOTING at your service ⚡",
      "Please contact my admin, I'm resting 💤"
    ];
    const reply = responses[Math.floor(Math.random() * responses.length)];
    client.say(channel, `${nick}: ${reply}`);
  }

  // فقط نیک Artesh می‌تواند کنترل کند
  if (nick === BOT_OWNER) {
    if (msg.toLowerCase().startsWith("off amir")) {
      isActive = false;
      client.say(channel, `${nick}: BOTING has been turned off 📴`);
    }

    if (msg.toLowerCase().startsWith("on amir")) {
      isActive = true;
      client.say(channel, `${nick}: BOTING is now active again ⚡`);
    }

    if (msg.toLowerCase().startsWith("amir change nick")) {
      const parts = msg.split(" ");
      const newNick = parts[3] || "BOTING";
      client.changeNick(newNick);
      client.say(channel, `Nickname changed to ${newNick} ✅`);
    }
  }

  // تشکر از Artesh
  if (msg.toLowerCase().includes("artesh")) {
    client.say(channel, `Thanks ${nick} for mentioning Artesh 🙌`);
  }
});

// پیام خوش‌آمدگویی رنگی
client.on("join", (event) => {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const nick = event.nick;
  const channel = event.channel;
  const message = `${color}Welcome ${nick}! 🌈 BOTING is happy to see you here!`;
  client.say(channel, message);

  if (nick === BOT_OWNER) {
    client.say(channel, `🎖️ Thank you ${BOT_OWNER} for joining! BOTING appreciates your presence.`);
  }
});

client.on("close", () => console.log("🔌 Disconnected. Reconnecting..."));

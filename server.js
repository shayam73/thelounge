import irc from "irc";
import fs from "fs";
import express from "express";

// 📂 خواندن لیست معماها از فایل riddles.json
const riddles = JSON.parse(fs.readFileSync("riddles.json", "utf8"));

// 👑 مدیران
const owners = ["YourNick"]; // 👈 اسم IRC خودت رو اینجا بذار
const scores = {};

// 🛰️ اتصال ربات به سرور IRC
const client = new irc.Client("irc.mahdkoosh.com", "BOTING", {
  channels: ["#gap", "#iran", "#boting"],
});

// 🟢 وقتی ربات بالا میاد
client.addListener("registered", () => {
  console.log("🤖 BOTING آماده اجراست ...");
});

// 🎉 خوش‌آمدگویی خودکار
client.addListener("join", (channel, nick) => {
  if (nick === "BOTING") return; // خودش رو خوش‌آمد نگو
  if (nick.toLowerCase() === "artesh") {
    client.say(channel, `🎖️ خوش اومدی آرش خالق ربات BOTING! 💪 ممنون برای ساخت این پروژه!`);
  } else {
    client.say(channel, `👋 Welcome ${nick}! خوش اومدی به ${channel} 🌷`);
  }
});

// 💬 واکنش به پیام‌ها
client.addListener("message", (from, to, msg) => {
  const lower = msg.toLowerCase();

  // 🔹 پینگ
  if (lower === "!ping") {
    client.say(to, `🏓 pong (${new Date().toLocaleTimeString()})`);
  }

  // 🔹 اطلاعات
  else if (lower === "!about") {
    client.say(to, "🤖 من BOTING هستم، ربات چت، معما و چالش ساخته شده توسط Artesh!");
  }

  // 🔹 پیوستن به کانال
  else if (lower.startsWith("!join ")) {
    const chan = msg.split(" ")[1];
    if (owners.includes(from)) {
      client.join(chan);
      client.say(to, `✅ Joined ${chan}`);
    } else {
      client.say(to, "❌ فقط مدیران می‌تونن از این دستور استفاده کنن.");
    }
  }

  // 🔹 ترک کانال
  else if (lower.startsWith("!part ")) {
    const chan = msg.split(" ")[1];
    if (owners.includes(from)) {
      client.part(chan);
      client.say(to, `👋 Left ${chan}`);
    } else {
      client.say(to, "❌ فقط مدیران می‌تونن از این دستور استفاده کنن.");
    }
  }

  // 🔹 اضافه کردن مدیر
  else if (lower.startsWith("!addowner ")) {
    if (owners.includes(from)) {
      const newOwner = msg.split(" ")[1];
      owners.push(newOwner);
      client.say(to, `👑 ${newOwner} به لیست مدیران اضافه شد!`);
    } else {
      client.say(to, "❌ فقط مدیران می‌تونن مدیر جدید اضافه کنن.");
    }
  }

  // 🔹 معما
  else if (lower === "!riddle") {
    const r = riddles[Math.floor(Math.random() * riddles.length)];
    client.say(to, `🧩 سوال: ${r.q}`);
    client.pendingRiddle = { q: r.q, a: r.a, channel: to };
  }

  // 🔹 پاسخ معما
  else if (client.pendingRiddle && to === client.pendingRiddle.channel) {
    const guess = msg.replace(/[A-Za-zآ-ی]/g, (ch) => ch.toLowerCase());
    if (guess.includes(client.pendingRiddle.a)) {
      client.say(to, `🎉 آفرین ${from}! جواب درست بود ✅`);
      scores[from] = (scores[from] || 0) + 10;
      client.pendingRiddle = null;
    }
  }

  // 🔹 امتیاز
  else if (lower === "!score") {
    const score = scores[from] || 0;
    client.say(to, `🏅 امتیاز شما ${from}: ${score}`);
  }

  // 🔹 چالش دونفره
  else if (lower.startsWith("!challenge ")) {
    const opponent = msg.split(" ")[1];
    if (!opponent)
      return client.say(to, "⚠️ لطفا نام کاربر را بنویس!");
    client.say(to, `⚔️ ${from} ${opponent} را به چالش دعوت کرد!`);
    client.say(to, "برای شروع هر دو بنویسید !ready");
    client.challenge = { p1: from, p2: opponent, ready: [] };
  }

  // 🔹 تایید شروع چالش
  else if (lower === "!ready" && client.challenge) {
    const ch = client.challenge;
    if (ch.ready.includes(from)) return;
    ch.ready.push(from);
    if (ch.ready.length === 2) {
      client.say(to, "🔥 چالش شروع شد! اولین کسی که جواب درست بده برنده است!");
      const r = riddles[Math.floor(Math.random() * riddles.length)];
      ch.riddle = r;
      client.say(to, `🧠 سوال: ${r.q}`);
    }
  }

  // 🔹 پاسخ به چالش
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

// --- نگه داشتن ربات آنلاین در Render ---
const app = express();
app.get("/", (req, res) => {
  res.send("🤖 BOTING is alive and running!");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

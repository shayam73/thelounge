const IRCFramework = require("irc-framework");
const fs = require("fs");

// ========== تنظیمات ==========
const IRC_HOST = "irc.mahdkoosh.com";
const IRC_PORT = 6667;
const BOT_NICK = "MySmartBot";
const BOT_VERSION = "4.0";
const DATA_FILE = "./data.json";

// ---------- داده‌ها ----------
let data = {
  seen: {},
  iq: {},
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    console.error("⚠️ خطا در خواندن فایل data.json");
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- اتصال IRC ----------
const client = new IRCFramework.Client();
client.connect({
  host: IRC_HOST,
  port: IRC_PORT,
  nick: BOT_NICK,
  username: BOT_NICK,
  gecos: `BOT v${BOT_VERSION}`,
  auto_reconnect: true,
});

// ---------- وضعیت‌ها ----------
let welcomeEnabled = true;
let startTime = new Date();
let chistanActive = false;
let chistanTimer = null;
let currentQuestion = null;
let chistanScores = {};

const welcomedUsers = new Set();

// ---------- چیستان‌ها ----------
const chistanList = [
  { q: "چی همیشه بالا میره ولی هیچ‌وقت پایین نمیاد؟", a: "سن" },
  { q: "اون چیه که می‌شکنه ولی صدایی نداره؟", a: "دل" },
  { q: "چی پر از سوراخه ولی آب نگه می‌داره؟", a: "اسفنج" },
  { q: "چه چیزی مال توئه ولی دیگران بیشتر از تو استفاده می‌کنن؟", a: "اسم" },
  { q: "چی زبون داره ولی حرف نمی‌زنه؟", a: "کفش" },
  { q: "اون چیه که هر چی ازش برمی‌داری، بزرگ‌تر میشه؟", a: "چاله" },
  { q: "چی چیزی داره که همیشه در حال حرکت است ولی هیچ وقت نمی‌دود؟", a: "ساعت" },
  { q: "اون چیه که وقتی خشک میشه، خیس‌تر میشه؟", a: "حوله" },
  { q: "چی چیزی است که همواره در جیب داری ولی استفاده نمی‌کنی؟", a: "سوراخ جیب" },
];

// ---------- وقتی ربات وصل شد ----------
client.on("registered", () => {
  console.log(`🤖 ${BOT_NICK} به ${IRC_HOST} وصل شد.`);
  client.join("#gap"); // کانال پیش‌فرض
});

// ---------- خوش‌آمدگویی ----------
client.on("join", (event) => {
  const nick = event.nick;
  const channel = event.channel;
  if (nick === BOT_NICK) return;

  data.seen[nick] = new Date().toISOString();
  saveData();

  if (!welcomeEnabled || welcomedUsers.has(nick)) return;

  welcomedUsers.add(nick);
  client.say(channel, `🎉 خوش اومدی ${nick}! امیدوارم لحظات خوبی توی ${channel} داشته باشی 😊`);
});

// ---------- پیام‌ها ----------
client.on("message", (event) => {
  const msg = event.message.trim();
  const nick = event.nick;
  const channel = event.target;

  // ثبت آخرین فعالیت
  data.seen[nick] = new Date().toISOString();
  saveData();

  // ===== HELP =====
  if (msg === "help") {
    client.say(channel, `📜 دستورات:
help → لیست دستورات
info → اطلاعات ربات
time → ساعت فعلی
ontime → مدت زمان روشن بودن ربات
welcome on/off → روشن/خاموش خوش‌آمدگویی
seen <نام‌کاربر> → آخرین حضور کاربر
chistan → شروع بازی چیستان
`);
  }

  // ===== INFO =====
  else if (msg === "info") {
    client.say(channel, `🤖 ${BOT_NICK} | نسخه ${BOT_VERSION} | ساخته‌شده با ❤️ توسط تو 😄`);
  }

  // ===== TIME =====
  else if (msg === "time") {
    const now = new Date();
    client.say(channel, `🕒 ساعت فعلی: ${now.toLocaleTimeString("fa-IR")}`);
  }

  // ===== ONTIME =====
  else if (msg === "ontime") {
    const diff = Math.floor((new Date() - startTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    client.say(channel, `⏱ مدت روشن بودن ربات: ${hours} ساعت ${mins} دقیقه ${secs} ثانیه`);
  }

  // ===== WELCOME =====
  else if (msg === "welcome on") {
    welcomeEnabled = true;
    client.say(channel, "✅ خوش‌آمدگویی فعال شد.");
  } else if (msg === "welcome off") {
    welcomeEnabled = false;
    client.say(channel, "❌ خوش‌آمدگویی غیرفعال شد.");
  }

  // ===== SEEN =====
  else if (msg.startsWith("seen ")) {
    const target = msg.split(" ")[1];
    if (!target) return client.say(channel, "📍 لطفاً نام کاربر رو بنویس.");

    if (data.seen[target]) {
      const lastSeen = new Date(data.seen[target]).toLocaleString("fa-IR");
      client.say(channel, `👀 ${target} آخرین بار در ${lastSeen} دیده شده.`);
    } else {
      client.say(channel, `❌ کاربر ${target} هنوز دیده نشده.`);
    }
  }

  // ===== CHISTAN =====
  else if (msg === "chistan" && !chistanActive) {
    chistanActive = true;
    currentQuestion = chistanList[Math.floor(Math.random() * chistanList.length)];

    client.say(channel, `🧠 بازی چیستان شروع شد!
سؤال: ${currentQuestion.q}
⏳ شما ۴ دقیقه وقت دارید جواب بدید (به فارسی بنویسید).`);

    // راهنمایی بعد از ۲ دقیقه
    setTimeout(() => {
      if (chistanActive) {
        const hint = currentQuestion.a[0] + "...";
        client.say(channel, `💡 راهنمایی: جواب با "${hint}" شروع میشه.`);
      }
    }, 2 * 60 * 1000);

    // پایان بازی بعد از ۴ دقیقه
    chistanTimer = setTimeout(() => {
      if (chistanActive) {
        chistanActive = false;
        client.say(channel, `⏰ وقت تموم شد! جواب درست: ${currentQuestion.a}`);
        currentQuestion = null;
      }
    }, 4 * 60 * 1000);
  }

  // ===== پاسخ چیستان =====
  else if (chistanActive && currentQuestion) {
    if (msg === currentQuestion.a) {
      chistanActive = false;
      clearTimeout(chistanTimer);
      data.iq[nick] = (data.iq[nick] || 0) + 1;
      saveData();

      client.say(channel, `🎯 آفرین ${nick}! جواب درست بود 👏`);
      client.say(channel, `🏆 امتیاز ${nick}: ${data.iq[nick]} iQ`);
      currentQuestion = null;
    } else {
      client.say(channel, `❌ اشتباهه ${nick}! دوباره امتحان کن.`);
    }
  }
});

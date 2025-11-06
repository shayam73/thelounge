// server.js (CommonJS)
const IRC = require("irc-framework");
const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const translate = require("translate-google"); // v1.5.0
const chalk = require("chalk")
const welcome = require("./commands/welcome");  // ایمپورت دستور خوش‌آمدگویی

// سایر کدها و تنظیمات...

client.on("join", (ev) => {
  const nick = ev.nick;
  const channel = ev.channel;
  if (!nick) return;
  
  ensureChannel(channel); // بررسی کانال
  updateSeen(nick, channel, "<joined>");

  // برای ارسال پیام خوش‌آمدگویی
  welcome.handleJoin(client, nick, channel, data);  // فراخوانی تابع خوش‌آمدگویی
});

// ---------- Config ----------
const IRC_HOST = process.env.IRC_HOST || "irc.mahdkoosh.com";
const IRC_PORT = Number(process.env.IRC_PORT || 6667);
const BOT_NICK = process.env.BOT_NICK || "BOTING";
const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), "data.json");
const PORT = Number(process.env.PORT || 10000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ""; // optional for HTTP admin
const BOT_VERSION = process.env.BOT_VERSION || "3.0";
const IRC = require("irc-framework");
  auto_reconnect: true
});

// رویداد join برای زمانی که یک کاربر وارد کانال می‌شود
client.on("join", (ev) => {
  const nick = ev.nick;
  const channel = ev.channel;
  if (!nick) return;
  // کدهای خوشامدگویی و پردازش‌های دیگر
});

// ---------- Data persistence ----------
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const defaultData = {
      owners: ["Artesh"],
      scores: {},
      seen: {},
      channelSettings: {
        "#iran": { welcome: true, active: true },
        "#gap": { welcome: true, active: true },
        "#BOTING": { welcome: true, active: true }
      },
      welcomeCounter: 0,
      usedResponses: { greetings: [], arteshReplies: [], riddlesUsed: [] },
      currentRiddles: {}, // per-channel
      games: {} // per-channel game state
    };
    fs.writeJsonSync(DATA_FILE, defaultData, { spaces: 2 });
    return defaultData;
  } else {
    return fs.readJsonSync(DATA_FILE);
  }
}

let data = ensureDataFile();

function saveData() {
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

// helpers
function ensureChannel(ch) {
  if (!data.channelSettings[ch]) data.channelSettings[ch] = { welcome: true, active: true };
}
function addScore(nick, pts = 1) {
  if (!nick) return;
  if (!data.scores[nick]) data.scores[nick] = 0;
  data.scores[nick] += pts;
  saveData();
}
function updateSeen(nick, channel, text) {
  if (!nick) return;
  data.seen[nick.toLowerCase()] = { when: Date.now(), channel, text };
  saveData();
}
function pickUnique(pool, key) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const used = data.usedResponses[key] || [];
  for (const item of pool) {
    if (!used.includes(item)) {
      used.push(item);
      data.usedResponses[key] = used;
      saveData();
      return item;
    }
  }
  // all used -> clear and return first
  data.usedResponses[key] = [];
  saveData();
  data.usedResponses[key].push(pool[0]);
  saveData();
  return pool[0];
}

// ---------- Message pools (finglish) ----------
const GREETINGS_POOL = [
  "salam! khosh omadi! 🎉",
  "chetori? omidvaram khoobi!",
  "salam dostam, be channel khosh amadid!",
  "salam! khoshbakhti didamet 😄",
  "salam bar to! be donyaye khosh omadi!"
];
const ARTESH_REPLIES_POOL = [
  "injuries negah 😎",
  "merci az arteshe ghadimi! 🙏",
  "artesh hamishe behtar mikone!",
  "dastet dard nakone arteshe aziz! 💪",
  "artesh joon, merci baraye hemayat!"
];
const RIDDLES_POOL = [
  { q: "chi chizi ast ke ba hame mibarad vali hich vaght kam nemishe?", a: "sen" },
  { q: "chi chizi har che bishtar barid, kamtar mibini?", a: "tari" },
  { q: "chi hargez khaste nemishe?", a: "ab" }
];

// ---------- simple finglish translit (basic) ----------
function toFinglish(farsi) {
  if (!farsi) return "";
  const map = {
    "ا":"a","ب":"b","پ":"p","ت":"t","ث":"s","ج":"j","چ":"ch","ح":"h","خ":"kh",
    "د":"d","ذ":"z","ر":"r","ز":"z","ژ":"zh","س":"s","ش":"sh","ص":"s","ض":"z",
    "ط":"t","ظ":"z","ع":"a","غ":"gh","ف":"f","ق":"gh","ک":"k","گ":"g","ل":"l",
    "م":"m","ن":"n","و":"v","ه":"h","ی":"y","ئ":"y","ء":"a","أ":"a","ؤ":"v"
  };
  let out = "";
  for (const ch of farsi) {
    if (map[ch]) out += map[ch];
    else out += ch;
  }
  return out.replace(/\s+/g," ").trim();
}

// ---------- IRC client ----------
const client = new IRC.Client();

client.connect({
  host: IRC_HOST,
  port: IRC_PORT,
  nick: BOT_NICK,
  username: BOT_NICK,
  gecos: `BOTING v${BOT_VERSION}`,
  auto_reconnect: true
});

// on registered -> join channels from data or defaults
client.on("registered", () => {
  console.log(chalk.green(`✅ Connected to ${IRC_HOST} as ${BOT_NICK}`));
  const channels = Object.keys(data.channelSettings);
  if (channels.length === 0) {
    ["#iran","#gap","#BOTING"].forEach(ch => { ensureChannel(ch); client.join(ch); });
  } else {
    channels.forEach(ch => client.join(ch));
  }
});

// when someone joins
client.on("join", (ev) => {
  const nick = ev.nick;
  const channel = ev.channel;
  if (!nick) return;
  ensureChannel(channel);
  updateSeen(nick, channel, "<joined>");
  if (!client.nick || !nick) return;
if (nick.toLowerCase() === client.nick.toLowerCase()) return; // ignore bot itself

  // check active flag for channel
  const chSet = data.channelSettings[channel] || { welcome: true, active: true };
  if (!chSet.active) return;

  if (chSet.welcome) {
    const greeting = pickUnique(GREETINGS_POOL, "greetings") || GREETINGS_POOL[0];
    client.say(channel, `${greeting} ${nick}!`);
  }

  // if joined nick is an owner, special reply
  if (data.owners.includes(nick)) {
    const ar = pickUnique(ARTESH_REPLIES_POOL, "arteshReplies") || ARTESH_REPLIES_POOL[0];
    client.say(channel, ar);
  }
});

// parse command-like message (no !)
function parseCommand(message) {
  if (!message || typeof message !== "string") return { cmd:null, args:[], raw:"" };
  const tokens = message.trim().split(/\s+/);
  return { cmd: tokens[0].toLowerCase(), args: tokens.slice(1), raw: message.trim() };
}

// message handler
client.on("message", async (ev) => {
  const from = ev.nick;
  const target = ev.target; // channel or bot nick
  const raw = (ev.message || "").trim();
  if (!raw) return;

  // replyTarget: channel if public, else from (PM)
  const replyTarget = (target && target.startsWith("#")) ? target : from;

  // update seen and give small point for activity
  updateSeen(from, replyTarget, raw);
  addScore(from, 1);

  // mention of owner -> special reply (non-repeating)
  if (raw.toLowerCase().includes("artesh")) {
    const arReply = pickUnique(ARTESH_REPLIES_POOL, "arteshReplies") || ARTESH_REPLIES_POOL[0];
    client.say(replyTarget, arReply);
    return;
  }

  // ping
  if (/^ping\b/i.test(raw)) {
    const ms = Math.floor(20 + Math.random() * 160);
    client.say(replyTarget, `${from}: pong (${ms}ms)`);
    return;
  }

  // parse command
  const { cmd, args } = parseCommand(raw);

  // ---------- Owner-only commands ----------
  if (data.owners.includes(from)) {
    // addowner <nick>
    if (cmd === "addowner" && args[0]) {
      const n = args[0];
      if (!data.owners.includes(n)) {
        data.owners.push(n); saveData();
        client.say(replyTarget, `${n} owner shod ✅`);
      } else client.say(replyTarget, `${n} ghablan owner bud`);
      return;
    }
    // removeowner <nick>
    if (cmd === "removeowner" && args[0]) {
      const n = args[0];
      data.owners = data.owners.filter(x=>x!==n); saveData();
      client.say(replyTarget, `${n} az owners hazf shod ✅`);
      return;
    }
    // owners
    if (cmd === "owners") {
      client.say(replyTarget, `Owners: ${data.owners.join(", ")}`);
      return;
    }
    // join #channel
    if (cmd === "join" && args[0]) {
      const ch = args[0];
      ensureChannel(ch); client.join(ch); client.say(replyTarget, `Joining ${ch} ...`);
      return;
    }
    // part #channel
    if (cmd === "part" && args[0]) {
      const ch = args[0];
      client.part(ch, `Requested by ${from}`); client.say(replyTarget, `Parted ${ch}`);
      return;
    }
    // welcome on/off (per-channel) - must be in channel context
    if (cmd === "welcome" && args[0]) {
      if (!replyTarget.startsWith("#")) { client.say(replyTarget, "Use this inside a channel."); return; }
      const sub = args[0].toLowerCase();
      ensureChannel(replyTarget);
      data.channelSettings[replyTarget].welcome = (sub === "on");
      saveData();
      client.say(replyTarget, `Welcome for ${replyTarget} is ${data.channelSettings[replyTarget].welcome ? "ON" : "OFF"}`);
      return;
    }
    // on/off per-channel (disable/enable bot responses)
    if (cmd === "off") {
      if (!replyTarget.startsWith("#")) { client.say(replyTarget, "Use 'off' in a channel to disable bot there."); return; }
      ensureChannel(replyTarget);
      data.channelSettings[replyTarget].active = false; saveData();
      client.say(replyTarget, `BOTING disabled in ${replyTarget}`);
      return;
    }
    if (cmd === "on") {
      if (!replyTarget.startsWith("#")) { client.say(replyTarget, "Use 'on' in a channel to enable bot there."); return; }
      ensureChannel(replyTarget);
      data.channelSettings[replyTarget].active = true; saveData();
      client.say(replyTarget, `BOTING enabled in ${replyTarget}`);
      return;
    }
    // change-nick newNick
    if (cmd === "change-nick" && args[0]) {
      const newNick = args[0];
      try { client.raw(`NICK ${newNick}`); client.say(replyTarget, `Nick change requested: ${newNick}`); } 
      catch(e){ client.say(replyTarget, `Nick change failed: ${String(e)}`); }
      return;
    }
  } // end owner-only

  // ---------- User commands (available to all) ----------
  if (cmd === "help") {
    const lines = [
      `\x0303📜 BOTING v${BOT_VERSION} - dastorat:`,
      `\x0309help\x03 - namayesh in help`,
      `\x0309ping\x03 - test (pong)`,
      `\x0309riddle\x03 - riddle bepors`,
      `\x0309answer <javab>\x03 - javabe riddle`,
      `\x0309game\x03 - bazie guess-number`,
      `\x0309guess <num>\x03 - javabe game`,
      `\x0309score <nick>\x03 - add point ya namayesh top scores`,
      `\x0309seen <nick>\x03 - akharin zaman va channel`,
      `Owner-only: addowner/removeowner/join/part/welcome/on/off/change-nick`
    ];
    lines.forEach(l => client.say(replyTarget, l));
    return;
  }

  // seen <nick>
  if (cmd === "seen" && args[0]) {
    const who = args[0].toLowerCase();
    const s = data.seen[who];
    if (!s) client.say(replyTarget, `${args[0]} ra nadidam`);
    else {
      const when = new Date(s.when).toLocaleString();
      client.say(replyTarget, `${args[0]} akharin bar dar ${s.channel} dar ${when} gofte: "${s.text}"`);
    }
    return;
  }

  // score [nick]
  if (cmd === "score") {
    if (args[0]) {
      const who = args[0];
      if (!data.scores[who]) data.scores[who] = 0;
      data.scores[who] += 1;
      saveData();
      client.say(replyTarget, `${who} +1 point (total: ${data.scores[who]})`);
    } else {
      // show top 10
      const arr = Object.entries(data.scores).sort((a,b)=>b[1]-a[1]).slice(0,10);
      if (arr.length === 0) client.say(replyTarget, "Hich scorei mojood nist");
      else client.say(replyTarget, "Top scores: " + arr.map(x=>`${x[0]}:${x[1]}`).join(", "));
    }
    return;
  }

  // riddle
  if (cmd === "riddle") {
    // choose unique riddle index not used recently
    let idx = Math.floor(Math.random()*RIDDLES_POOL.length);
    // store current riddle per channel
    ensureChannel(replyTarget);
    data.currentRiddles[replyTarget] = RIDDLES_POOL[idx];
    saveData();
    client.say(replyTarget, `🧩 riddle: ${data.currentRiddles[replyTarget].q}`);
    return;
  }
  // answer <text>
  if (cmd === "answer" && args.length>0) {
    ensureChannel(replyTarget);
    const r = data.currentRiddles[replyTarget];
    if (!r) { client.say(replyTarget, "Hich riddle faal nist."); return; }
    const given = args.join(" ").toLowerCase();
    if (given === r.a.toLowerCase()) {
      addScore(from,5);
      delete data.currentRiddles[replyTarget];
      saveData();
      client.say(replyTarget, `${from}: dorost! +5 points 🎉`);
    } else client.say(replyTarget, `${from}: na, in javab dorost nist.`);
    return;
  }

  // game (guess number)
  if (cmd === "game") {
    ensureChannel(replyTarget);
    const secret = Math.floor(1 + Math.random()*20);
    data.games[replyTarget] = { gameActive: true, secret };
    saveData();
    client.say(replyTarget, `${from}: guess a number between 1 and 20`);
    return;
  }
  if (cmd === "guess" && args[0]) {
    ensureChannel(replyTarget);
    const g = data.games[replyTarget];
    if (!g || !g.gameActive) { client.say(replyTarget, "No game active"); return; }
    const guess = Number(args[0]);
    if (guess === g.secret) {
      addScore(from,5);
      data.games[replyTarget].gameActive = false; saveData();
      client.say(replyTarget, `${from}: correct! +5 points 🎉 The number was ${g.secret}`);
    } else client.say(replyTarget, `${from}: wrong — try again`);
    return;
  }

  // translate <text> -> translate to fa then finglish
  if (cmd === "translate" && args.length>0) {
    const text = args.join(" ");
    try {
      const farsi = await translate(text, { to: "fa" });
      const fing = toFinglish(farsi);
      client.say(replyTarget, `${from}: ${fing}`);
    } catch (e) {
      client.say(replyTarget, `${from}: nemitunam tarjome konam`);
    }
    return;
  }

  // mention bot name -> greet (unique)
  if (raw.toLowerCase().includes(BOT_NICK.toLowerCase())) {
    ensureChannel(replyTarget);
    const chSet = data.channelSettings[replyTarget] || { active:true };
    if (!chSet.active) return;
    const greet = pickUnique(GREETINGS_POOL, "greetings") || GREETINGS_POOL[0];
    client.say(replyTarget, `${greet}`);
    return;
  }

  // fallback: occasional friendly reply (very low probability)
  if (Math.random() < 0.01 && replyTarget.startsWith("#")) {
    const small = ["salam!", "chetorid?", "khobid?"];
    client.say(replyTarget, small[Math.floor(Math.random()*small.length)]);
  }
}); // end message handler

// nick change
client.on("nick", (ev) => {
  try {
    const oldn = ev.nick, newn = ev.new_nick;
    if (data.seen[oldn.toLowerCase()]) {
      data.seen[newn.toLowerCase()] = data.seen[oldn.toLowerCase()];
      delete data.seen[oldn.toLowerCase()];
      saveData();
    }
  } catch(e){}
});

// errors
client.on("error", (err) => {
  console.error("IRC error:", err);
});

// ---------- HTTP admin / health endpoints ----------
const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send(`BOTING v${BOT_VERSION} is alive`));

// secure admin: change-nick
app.post("/admin/change-nick", (req, res) => {
  const auth = (req.headers.authorization || "");
  if (!ADMIN_TOKEN || !auth.startsWith("Bearer ") || auth.slice(7) !== ADMIN_TOKEN) return res.status(403).json({ error: "forbidden" });
  const newNick = req.body && req.body.newNick;
  if (!newNick) return res.status(400).json({ error: "newNick required" });
  client.raw(`NICK ${newNick}`);
  return res.json({ ok: true, newNick });
});

// admin status
app.get("/admin/status", (req, res) => {
  const auth = (req.headers.authorization || "");
  if (!ADMIN_TOKEN || !auth.startsWith("Bearer ") || auth.slice(7) !== ADMIN_TOKEN) return res.status(403).json({ error: "forbidden" });
  res.json({
    connected: !!client.socket,
    nick: client.nick,
    owners: data.owners,
    channelSettings: data.channelSettings,
    scores: data.scores
  });
});

app.listen(PORT, () => console.log(chalk.green(`🌐 HTTP server listening on port ${PORT}`)));

//

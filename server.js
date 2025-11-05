// server.js (CommonJS style expected; package.json set to "type": "commonjs")
const IRC = require("irc-framework");
const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const translate = require("translate-google");
const chalk = require("chalk");

// -------------- Config (ENV overrides)
const IRC_HOST = process.env.IRC_HOST || "irc.mahdkoosh.com";
const IRC_PORT = Number(process.env.IRC_PORT || 6667);
const BOT_NICK = process.env.BOT_NICK || "BOTING";
const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), "data.json");
const PORT = Number(process.env.PORT || 10000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ""; // برای HTTP admin endpoint امن
const BOT_VERSION = process.env.BOT_VERSION || "3.0";

// -------------- Utility (data persistence)
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    // اگر فایل نیست، یک فایل با محتویات پیش‌فرض می‌سازیم (این همان data.json بالا)
    const defaultData = {
      owners: ["Artesh"],
      scores: {},
      seen: {},
      channelSettings: {},
      welcomeCounter: 0,
      usedResponses: { greetings: [], arteshReplies: [], riddlesUsed: [] }
    };
    fs.writeJsonSync(DATA_FILE, defaultData, { spaces: 2 });
    return defaultData;
  }
  return fs.readJsonSync(DATA_FILE);
}
function saveData() {
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

let data = loadData();

// helper: ensure channel settings exist
function ensureChannel(channel) {
  if (!data.channelSettings[channel]) data.channelSettings[channel] = { welcome: true };
}

// helper: add score
function addScore(nick, points = 1) {
  const k = nick;
  if (!data.scores[k]) data.scores[k] = 0;
  data.scores[k] += points;
  saveData();
}

// helper: update seen
function updateSeen(nick, channel, msg) {
  if (!nick) return;
  data.seen[nick.toLowerCase()] = { when: Date.now(), channel, text: msg };
  saveData();
}

// -------------- Non-repeating selection helpers
function pickUnique(list, usedKey) {
  // باز می‌گرداند اولین عنصر که استفاده نشده؛ اگر همه استفاده شده باشند، clear می‌کند و شروع دوباره
  if (!Array.isArray(list) || list.length === 0) return null;
  const used = data.usedResponses[usedKey] || [];
  for (const item of list) {
    if (!used.includes(item)) {
      used.push(item);
      data.usedResponses[usedKey] = used;
      saveData();
      return item;
    }
  }
  // همه استفاده شده -> پاک کن و استفاده کن اولین
  data.usedResponses[usedKey] = [];
  saveData();
  // دوباره بازگردان اولین
  data.usedResponses[usedKey].push(list[0]);
  saveData();
  return list[0];
}

// -------------- Predefined message pools (finglish)
const GREETINGS_POOL = [
  "salam! khosh omadi! 🎉",
  "chetori? omidvaram khoobi!",
  "salam dostam, be channel khosh amadid!",
  "salam! khoshbakhti didamet 😄",
  "salam bar to! boro be donyaye khosh"
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

// -------------- Simple finglish transliterator (basic)
/**
 * این تابع متن فارسی را به یک فینگلیش خیلی ساده تبدیل می‌کند.
 * توجه: این یک transliteration ساده است، نه یک کتابخانه کامل.
 */
function toFinglish(farsi) {
  if (!farsi || typeof farsi !== "string") return "";
  const map = [
    ["ا", "a"], ["ب", "b"], ["پ", "p"], ["ت", "t"], ["ث", "s"], ["ج", "j"],
    ["چ", "ch"], ["ح", "h"], ["خ", "kh"], ["د", "d"], ["ذ", "z"], ["ر", "r"],
    ["ز", "z"], ["ژ", "zh"], ["س", "s"], ["ش", "sh"], ["ص", "s"], ["ض", "z"],
    ["ط", "t"], ["ظ", "z"], ["ع", "a"], ["غ", "gh"], ["ف", "f"], ["ق", "gh"],
    ["ک", "k"], ["گ", "g"], ["ل", "l"], ["م", "m"], ["ن", "n"], ["و", "v"],
    ["ه", "h"], ["ی", "y"], ["ئ", "y"], ["ء", "a"], ["أ","a"], ["ؤ","v"]
  ];
  let out = "";
  for (const ch of farsi) {
    const entry = map.find(m => m[0] === ch);
    if (entry) out += entry[1];
    else out += ch;
  }
  // cleanup: replace multiple spaces
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

// -------------- IRC client setup
const client = new IRC.Client();

client.connect({
  host: IRC_HOST,
  port: IRC_PORT,
  nick: BOT_NICK,
  username: BOT_NICK,
  gecos: `BOTING v${BOT_VERSION}`,
  auto_reconnect: true
});

// on connect
client.on("registered", () => {
  console.log(chalk.green(`✅ Connected to ${IRC_HOST} as ${BOT_NICK}`));
  // join channels from channelSettings keys (or default three if empty)
  const channels = Object.keys(data.channelSettings);
  if (channels.length === 0) {
    // default channels if none
    ["#iran", "#gap", "#BOTING"].forEach(ch => {
      ensureChannel(ch);
      client.join(ch);
    });
  } else {
    channels.forEach(ch => client.join(ch));
  }
});

// when someone joins channel
client.on("join", (ev) => {
  const nick = ev.nick;
  const channel = ev.channel;
  if (!nick) return;
  ensureChannel(channel);
  // update seen
  updateSeen(nick, channel, "<joined>");
  // don't greet the bot itself
  if (nick.toLowerCase() === client.nick.toLowerCase()) return;
  // check per-channel welcome
  const chSet = data.channelSettings[channel] || { welcome: true };
  if (chSet.welcome) {
    const greeting = pickUnique(GREETINGS_POOL, "greetings") || GREETINGS_POOL[0];
    // personalize and finglish (already finglish)
    const msg = `${greeting} ${nick}!`;
    client.say(channel, msg);
  }
  // if owner joined, send a special thanks to channel BOTING also
  if (data.owners.includes(nick)) {
    const ar = pickUnique(ARTESH_REPLIES_POOL, "arteshReplies") || ARTESH_REPLIES_POOL[0];
    client.say(channel, `${ar}`);
  }
});

// helper to check command (no '!' prefix); command is first token
function parseCommand(message) {
  if (!message || typeof message !== "string") return { cmd: null, args: [] };
  const tokens = message.trim().split(/\s+/);
  const cmd = tokens[0].toLowerCase();
  const args = tokens.slice(1);
  return { cmd, args, raw: message.trim() };
}

// message handler
client.on("message", async (ev) => {
  const from = ev.nick;
  const target = ev.target; // channel or bot nick (private)
  const raw = (ev.message || "").trim();
  if (!raw) return;

  // if target is not channel (i.e., private), treat target as from (reply in private)
  const replyTarget = (target && target.startsWith("#")) ? target : from;

  // update seen and give 1 point per message (optional small reward)
  updateSeen(from, replyTarget, raw);
  addScore(from, 1);

  // when user mentions owner name anywhere -> reply with an artemish reply (finglish)
  if (raw.toLowerCase().includes("artesh")) {
    const arReply = pickUnique(ARTESH_REPLIES_POOL, "arteshReplies") || ARTESH_REPLIES_POOL[0];
    client.say(replyTarget, arReply);
    return;
  }

  // if message exactly 'ping' or starts with 'ping'
  if (/^ping\b/i.test(raw)) {
    // approximate latency: random 20-180 ms (can't measure real roundtrip easily)
    const ms = Math.floor(20 + Math.random() * 160);
    client.say(replyTarget, `${from}: pong (${ms}ms)`);
    return;
  }

  // parse command-like words (no '!' required)
  const { cmd, args, raw: full } = parseCommand(raw);

  // ---------- Owner-only commands ----------
  if (data.owners.includes(from)) {
    if (cmd === "addowner" && args[0]) {
      const newOwner = args[0];
      if (!data.owners.includes(newOwner)) {
        data.owners.push(newOwner);
        saveData();
        client.say(replyTarget, `${newOwner} owner shod ✅`);
      } else client.say(replyTarget, `${newOwner} ghablan owner bud`);
      return;
    }
    if (cmd === "removeowner" && args[0]) {
      const rm = args[0];
      data.owners = data.owners.filter(x => x !== rm);
      saveData();
      client.say(replyTarget, `${rm} az list owner-ha hazf shod ✅`);
      return;
    }
    if (cmd === "owners") {
      client.say(replyTarget, `Owners: ${data.owners.join(", ")}`);
      return;
    }
    if (cmd === "join" && args[0]) {
      const ch = args[0];
      ensureChannel(ch);
      client.join(ch);
      client.say(replyTarget, `Joining ${ch} ...`);
      return;
    }
    if (cmd === "part" && args[0]) {
      const ch = args[0];
      client.part(ch, `Requested by ${from}`);
      client.say(replyTarget, `Parted ${ch}`);
      return;
    }
    if (cmd === "welcome" && args[0]) {
      // welcome on/off for current channel (if message sent in channel)
      const sub = args[0].toLowerCase();
      if (!replyTarget.startsWith("#")) {
        client.say(replyTarget, "Welcome setting must be set from a channel message");
        return;
      }
      ensureChannel(replyTarget);
      data.channelSettings[replyTarget].welcome = (sub === "on");
      saveData();
      client.say(replyTarget, `Welcome for ${replyTarget} is now ${data.channelSettings[replyTarget].welcome ? "ON" : "OFF"}`);
      return;
    }
    if (cmd === "change-nick" && args[0]) {
      const newNick = args[0];
      try {
        client.raw(`NICK ${newNick}`);
        client.say(replyTarget, `Nick change requested: ${newNick}`);
      } catch (e) {
        client.say(replyTarget, `Nick change failed: ${String(e)}`);
      }
      return;
    }
    if (cmd === "off") {
      // owner can stop bot responses in a channel (per-channel)
      if (!replyTarget.startsWith("#")) {
        client.say(replyTarget, "Use 'off' inside a channel to silence bot in that channel");
        return;
      }
      ensureChannel(replyTarget);
      data.channelSettings[replyTarget].active = false;
      saveData();
      client.say(replyTarget, `BOTING disabled in ${replyTarget}`);
      return;
    }
    if (cmd === "on") {
      if (!replyTarget.startsWith("#")) {
        client.say(replyTarget, "Use 'on' inside a channel to enable bot in that channel");
        return;
      }
      ensureChannel(replyTarget);
      data.channelSettings[replyTarget].active = true;
      saveData();
      client.say(replyTarget, `BOTING enabled in ${replyTarget}`);
      return;
    }
  } // end owner commands

  // ---------- Normal user commands ----------
  // help
  if (cmd === "help") {
    // colored help lines (IRC color codes)
    const lines = [
      `\x0303📜 BOTING v${BOT_VERSION} - dastorat:`,
      `\x0309help \x03 - namayesh in help`,
      `\x0309ping \x03 - test (pong)`,
      `\x0309riddle \x03 - ye chiistan bepors`,
      `\x0309answer <javab> \x03 - javabe chiistan`,
      `\x0309game \x03 - bazie simple (guess number)`,
      `\x0309score <nick> \x03 - namayesh score ya add point`,
      `\x0309seen <nick> \x03 - akharin zamani ke didasham`,
      `Owner-only: addowner/removeowner/join/part/welcome/on/off/change-nick`
    ];
    lines.forEach(l => client.say(replyTarget, l));
    return;
  }

  // seen
  if (cmd === "seen" && args[0]) {
    const q = args[0].toLowerCase();
    const s = data.seen[q];
    if (!s) client.say(replyTarget, `${args[0]} ra nadidam`);
    else {
      const when = new Date(s.when);
      client.say(replyTarget, `${args[0]} akharin bar dar ${s.channel} dar ${when.toLocaleString()} gofte: "${s.text}"`);
    }
    return;
  }

  // score: "score" alone shows top scores; "score nick" adds point
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
      else {
        client.say(replyTarget, `Top scores: ${arr.map(x=>`${x[0]}:${x[1]}`).join(" , ")}`);
      }
    }
    return;
  }

  // riddle (game)
  if (cmd === "riddle") {
    // pick unique riddle index
    const idx = Math.floor(Math.random() * RIDDLES_POOL.length);
    const r = RIDDLES_POOL[idx];
    // mark used
    data.usedResponses.riddlesUsed.push(idx);
    // store current riddle for channel
    ensureChannel(replyTarget);
    data.channelSettings[replyTarget].currentRiddle = r;
    saveData();
    client.say(replyTarget, `🧩 riddle: ${r.q}`);
    return;
  }
  if (cmd === "answer" && args.length > 0) {
    ensureChannel(replyTarget);
    const r = data.channelSettings[replyTarget] && data.channelSettings[replyTarget].currentRiddle;
    if (!r) { client.say(replyTarget, "No riddle is active right now."); return; }
    const given = args.join(" ").toLowerCase();
    if (given === r.a.toLowerCase()) {
      addScore(from, 5);
      delete data.channelSettings[replyTarget].currentRiddle;
      saveData();
      client.say(replyTarget, `${from}: dorost! +5 points 🎉`);
    } else {
      client.say(replyTarget, `${from}: na, in javab sahih nist.`);
    }
    return;
  }

  // game: simple guess number
  if (cmd === "game") {
    ensureChannel(replyTarget);
    const secret = Math.floor(1 + Math.random() * 20);
    data.channelSettings[replyTarget].secretNumber = secret;
    data.channelSettings[replyTarget].gameActive = true;
    saveData();
    client.say(replyTarget, `${from}: guess a number between 1 and 20`);
    return;
  }
  if (cmd === "guess" && args[0]) {
    ensureChannel(replyTarget);
    if (!data.channelSettings[replyTarget].gameActive) { client.say(replyTarget, "No game active"); return; }
    const guess = Number(args[0]);
    const secret = data.channelSettings[replyTarget].secretNumber;
    if (guess === secret) {
      addScore(from, 5);
      data.channelSettings[replyTarget].gameActive = false;
      saveData();
      client.say(replyTarget, `${from}: correct! +5 points 🎉 The number was ${secret}`);
    } else {
      client.say(replyTarget, `${from}: wrong — try again`);
    }
    return;
  }

  // translate request: "translate <text>" -> translate to Persian then finglish
  if (cmd === "translate" && args.length > 0) {
    const text = args.join(" ");
    try {
      // translate to Persian
      const farsi = await translate(text, { to: "fa" });
      // transliterate farsi to finglish
      const fing = toFinglish(farsi);
      client.say(replyTarget, `${from}: ${fing}`);
    } catch (e) {
      client.say(replyTarget, `${from}: translation failed`);
    }
    return;
  }

  // simple automatic replies (bot name mention)
  if ((raw.toLowerCase().includes(BOT_NICK.toLowerCase()))) {
    // pick unique greeting
    const greet = pickUnique(GREETINGS_POOL, "greetings") || GREETINGS_POOL[0];
    client.say(replyTarget, `${greet}`);
    return;
  }

  // fallback: if no command matched, optionally do nothing or small reply chance
  // small random friendly reply with very low probability to avoid spam
  if (Math.random() < 0.02) {
    const smallReplies = ["salam!", "chetorid?", "khobid?"];
    const rr = smallReplies[Math.floor(Math.random()*smallReplies.length)];
    client.say(replyTarget, rr);
  }
});

// nick change event -> update seen mapping
client.on("nick", (ev) => {
  try {
    const oldn = ev.nick;
    const newn = ev.new_nick;
    if (data.seen[oldn.toLowerCase()]) {
      data.seen[newn.toLowerCase()] = data.seen[oldn.toLowerCase()];
      delete data.seen[oldn.toLowerCase()];
      saveData();
    }
  } catch (e) {}
});

// error
client.on("error", (err) => {
  console.error("IRC error:", err);
});

// -------------- Minimal HTTP admin endpoints (optional) --------------
const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send(`BOTING v${BOT_VERSION} is alive`));

// secure admin change nick (Bearer ADMIN_TOKEN)
app.post("/admin/change-nick", (req, res) => {
  const auth = (req.headers.authorization || "");
  if (!ADMIN_TOKEN || !auth.startsWith("Bearer ") || auth.slice(7) !== ADMIN_TOKEN) return res.status(403).json({ error: "forbidden" });
  const newNick = req.body && req.body.newNick;
  if (!newNick) return res.status(400).json({ error: "newNick required" });
  client.raw(`NICK ${newNick}`);
  return res.json({ ok: true, newNick });
});

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

app.listen(PORT, () => {
  console.log(chalk.green(`🌐 HTTP server listening on port ${PORT}`));
});

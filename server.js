// ===== BOTING IRC BOT - v5.0 =====
// سرور: irc.mahdkoosh.com
// نیک: BOTING
// نویسنده اصلی: Artesh

const IRC = require("irc-framework");
const fs = require("fs");
const path = require("path");

const BOT_NICK = "BOTING";
const IRC_HOST = "irc.mahdkoosh.com";
const IRC_PORT = 6667;
const CHANNELS = ["#gap", "#iran", "#BOTING"];
const START_TIME = Date.now();
const DATA_FILE = path.join(__dirname, "data.json");

// ---- بارگذاری داده ----
let data = { owners: ["Artesh"], scores: {}, seen: {}, riddles: {}, channel: {} };
if (fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE));
function save() { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

// ---- ربات IRC ----
const client = new IRC.Client();
client.connect({ host: IRC_HOST, port: IRC_PORT, nick: BOT_NICK, auto_reconnect: true });

client.on("registered", () => {
  console.log("✅ BOTING connected to IRC!");
  CHANNELS.forEach(ch => client.join(ch));
});

function toFinglish(fa) {
  const map = {"ا":"a","ب":"b","پ":"p","ت":"t","ث":"s","ج":"j","چ":"ch","ح":"h","خ":"kh","د":"d","ذ":"z","ر":"r","ز":"z","ژ":"zh","س":"s","ش":"sh","ص":"s","ض":"z","ط":"t","ظ":"z","ع":"a","غ":"gh","ف":"f","ق":"gh","ک":"k","گ":"g","ل":"l","م":"m","ن":"n","و":"v","ه":"h","ی":"y"};
  return fa.split("").map(c => map[c] || c).join("");
}

// ---- خوش آمد گویی ----
const welcomes = [
  "salam! khosh omadi 🎉",
  "khosh omadi doste aziz 😄",
  "salam, khoshbakhtam didamet!",
  "be donyaye gap khosh omadi!",
  "salam bar to! omidvaram khosh begzare 😎"
];

// ---- چیستان‌ها ----
const riddles = [
  { q: "chi chizi hast ke ba hame mibarad vali kam nemishe?", a: "sen" },
  { q: "chi chizi har che bishtar barid kamtar mibini?", a: "tari" },
  { q: "chi chizi hargez khaste nemishe?", a: "ab" },
  { q: "chi chizi mikhore vali hich vaght nemikhore?", a: "atash" },
  { q: "chi chizi be cheshm nemiad vali hame ja hast?", a: "hava" },
  { q: "chi chizi vasate ab oftade vali nemishe tar?", a: "saaye" },
  { q: "chi chizi sib ast vali sabz nist?", a: "sib ghermez" },
  { q: "chi chizi bishtar az khoda hast?", a: "hichchi" },
  { q: "chi chizi har ruz bala miravad vali hich vaght paeen nemiad?", a: "sen" },
  { q: "chi chizi az to hast vali to az o nisti?", a: "saaye" }
];

const activeRiddles = {}; // per channel: {q, a, players, startTime, hints}

// ---- رویداد ورود ----
client.on("join", ev => {
  if (ev.nick === BOT_NICK) return;
  const msg = welcomes[Math.floor(Math.random() * welcomes.length)];
  client.say(ev.channel, `${msg} ${ev.nick}!`);
  if (ev.nick === "Artesh") client.say(ev.channel, "Sepas az Artesh baraye sakhtan man 🤖💙");
  data.seen[ev.nick.toLowerCase()] = { channel: ev.channel, time: Date.now(), msg: "<joined>" };
  save();
});

// ---- پیام‌ها ----
client.on("message", ev => {
  const nick = ev.nick;
  const ch = ev.target;
  const msg = ev.message.trim();
  data.seen[nick.toLowerCase()] = { channel: ch, time: Date.now(), msg };
  save();

  const args = msg.split(/\s+/);
  const cmd = args[0].toLowerCase();

  // ---------- دستورات عمومی ----------
  if (cmd === "help") {
    client.say(ch, "📜 Dastorat BOTING:");
    client.say(ch, "help | ping | time | ontime | seen <nick> | chistan | answer <javab> | score | join/part <#channel>");
    client.say(ch, "Owner: addowner/removeowner <nick> | on/off | change-nick <newNick>");
  }

  else if (cmd === "ping") {
    const delay = Math.floor(Math.random() * 100) + 50;
    client.say(ch, `${nick}: pong (${delay}ms)`);
  }

  else if (cmd === "time") {
    client.say(ch, `🕒 ${new Date().toLocaleString()}`);
  }

  else if (cmd === "ontime") {
    const diff = Date.now() - START_TIME;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    client.say(ch, `🤖 BOTING online for ${hrs}h ${mins % 60}m`);
  }

  else if (cmd === "seen" && args[1]) {
    const user = args[1].toLowerCase();
    if (data.seen[user]) {
      const t = new Date(data.seen[user].time).toLocaleString();
      client.say(ch, `${args[1]} akharin bar dar ${data.seen[user].channel} bood (${t})`);
    } else client.say(ch, `${args[1]} ra ta alan nadidam`);
  }

  // ---------- چیستان ----------
  else if (cmd === "chistan") {
    if (activeRiddles[ch]) return client.say(ch, "Yek chistan dar hale ejrast!");
    const r = riddles[Math.floor(Math.random() * riddles.length)];
    activeRiddles[ch] = { ...r, players: [], start: Date.now() };
    client.say(ch, `🧠 Chistan: ${toFinglish(r.q)}`);
    setTimeout(() => {
      if (!activeRiddles[ch]) return;
      client.say(ch, `⏳ 2 daghighe gozasht! Rahnema: javab ${r.a[0].toUpperCase()}...`);
    }, 120000);
    setTimeout(() => {
      if (activeRiddles[ch]) {
        client.say(ch, `⌛ Vaghte chistan tamoom shod! Javab dorost: ${toFinglish(r.a)}`);
        delete activeRiddles[ch];
      }
    }, 240000);
  }

  else if (cmd === "answer" && args[1]) {
    if (!activeRiddles[ch]) return client.say(ch, "Chistani faal nist!");
    const given = args.slice(1).join(" ").toLowerCase();
    const correct = activeRiddles[ch].a.toLowerCase();
    const finglish = toFinglish(correct);
    if (given === correct || given === finglish) {
      client.say(ch, `${nick}: javab dorost! 🎉 +5 point`);
      data.scores[nick] = (data.scores[nick] || 0) + 5;
      save();
      delete activeRiddles[ch];
    } else {
      client.say(ch, `${nick}: ghalat gofti 😅`);
    }
  }

  else if (cmd === "score") {
    const top = Object.entries(data.scores).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if (top.length === 0) client.say(ch, "Hich emtiazi sabt nashode");
    else client.say(ch, "🏆 Top players: " + top.map(x=>`${x[0]}:${x[1]}`).join(", "));
  }

  // ---------- owner ----------
  if (data.owners.includes(nick)) {
    if (cmd === "join" && args[1]) client.join(args[1]);
    if (cmd === "part" && args[1]) client.part(args[1], "requested by owner");
    if (cmd === "addowner" && args[1]) { 
      if (!data.owners.includes(args[1])) data.owners.push(args[1]); 
      client.say(ch, `${args[1]} be owners ezafe shod ✅`); save(); 
    }
    if (cmd === "removeowner" && args[1]) {
      data.owners = data.owners.filter(o=>o!==args[1]); save();
      client.say(ch, `${args[1]} az owners hazf shod ❌`);
    }
    if (cmd === "owners") client.say(ch, `Owners: ${data.owners.join(", ")}`);
    if (cmd === "off") data.channel[ch] = false;
    if (cmd === "on") data.channel[ch] = true;
  }
});

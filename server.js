// server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import IRC from "irc-framework";
import fs from "fs";
import path from "path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// ---------- Config (from env or defaults) ----------
const BOT_NICK = process.env.BOT_NICK || "aMIR";
const NICKSERV_PASS = process.env.NICKSERV_PASS || ""; // اگر رجیستر نیست خالی بذار
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ""; // برای محافظت endpoint تغییر نیک
const IRC_HOST = process.env.IRC_HOST || "irc.mahdkoosh.com";
const IRC_PORT = Number(process.env.IRC_PORT || 6667);
const JOIN_CHANNELS = (process.env.JOIN_CHANNELS || "#iran,#gap,#BOTING").split(",").map(s => s.trim()).filter(Boolean);

// فایل شمارنده خوش‌آمد
const COUNTER_FILE = path.join(process.cwd(), "welcome-counter.json");
const MAX_UNIQUE = 100000;

// ---------- Persistent welcome counter ----------
let welcomeCounter = 1;
try {
  if (fs.existsSync(COUNTER_FILE)) {
    const raw = fs.readFileSync(COUNTER_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Number.isInteger(parsed.counter)) {
      welcomeCounter = parsed.counter;
    }
  }
} catch (err) {
  console.error("Could not read welcome-counter file:", err);
}
function saveCounter() {
  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ counter: welcomeCounter }, null, 2), "utf8");
  } catch (err) {
    console.error("Could not write welcome-counter file:", err);
  }
}
// save on exit
process.on("exit", saveCounter);
process.on("SIGINT", () => { saveCounter(); process.exit(0); });
process.on("SIGTERM", () => { saveCounter(); process.exit(0); });

// ---------- Colorful unique welcome system ----------
const greetings = [
  "Welcome", "Hello", "Salutations", "Greetings", "Glad to see you",
  "Hey there", "Good to have you", "Nice to meet you", "Hiya", "Howdy"
];
const adjectives = [
  "stalwart","brave","curious","swift","cheerful","clever","kind","bold","bright","friendly",
  "sparkling","mighty","gentle","witty","lively","sincere","happy","solid","stellar","zesty",
  "radiant","serene","nimble","eager","groovy","jazzy","vivid","proud","nifty","merry","sunny",
  "dreamy","plucky","dandy","peppy","breezy","cool","hip","neat","brisk","mellow","rustic","sublime",
  "epic","prime","supreme","charming","magnetic","valiant","fearless","honest","loyal","steady"
];
const emojis = ["🙂","😄","🤖","✨","🌟","🔥","💫","🎉","👏","🥳","😎","🤩","👍","💥","🚀","🌈","🎈","🧩","🕶️"];
const IRC_COLOR_CODES = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];

function padNum(n, len = 6) {
  return String(n).padStart(len, "0");
}
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function generateUniqueWelcome(nick) {
  const id = welcomeCounter;
  welcomeCounter = welcomeCounter + 1;
  if (welcomeCounter > MAX_UNIQUE) welcomeCounter = 1; // یا تغییر دهید طبق نیاز
  saveCounter();

  const greet = getRandom(greetings);
  const adj = getRandom(adjectives);
  const emoji = getRandom(emojis);
  const color = getRandom(IRC_COLOR_CODES);

  const colorPrefix = `\x03${String(color).padStart(2, "0")}`;
  const reset = `\x0f`;
  const uniqueTag = `#${padNum(id, 6)}`;
  const text = `${greet} ${nick}, ${adj} ${emoji} — ${uniqueTag}`;
  return `${colorPrefix}${text}${reset}`;
}

// ---------- IRC client ----------
const irc = new IRC.Client();

// current nick in memory (starts from env)
let currentNick = BOT_NICK;

irc.connect({
  host: IRC_HOST,
  port: IRC_PORT,
  nick: currentNick,
  username: currentNick,
  gecos: `${currentNick} IRC Bot`
});

// after registration, identify (if pass) and join channels
irc.on("registered", () => {
  console.log("✅ Connected to IRC server:", IRC_HOST);
  if (NICKSERV_PASS) {
    irc.say("NickServ", `IDENTIFY ${NICKSERV_PASS}`);
    console.log("🔐 Sent NickServ IDENTIFY");
  }
  // join channels after a short delay
  setTimeout(() => {
    for (const ch of JOIN_CHANNELS) {
      try {
        irc.join(ch);
        console.log("➡ Joined", ch);
      } catch (e) {
        console.error("Join error for", ch, e);
      }
    }
  }, 2000);
});

// ---------- Welcome message on join ----------
irc.on("join", (event) => {
  try {
    const joinedNick = event.nick;
    const channel = event.channel;
    if (!joinedNick) return;
    if (joinedNick.toLowerCase() === currentNick.toLowerCase()) return; // نخود: نپاسخ به خود ربات
    const welcomeMsg = generateUniqueWelcome(joinedNick);
    irc.say(channel, welcomeMsg);
    console.log(`Sent welcome to ${joinedNick} in ${channel}`);
  } catch (err) {
    console.error("Error sending welcome:", err);
  }
});

// ---------- Relay IRC messages to web clients ----------
irc.on("message", (event) => {
  // event: {nick, message, target, ...}
  io.emit("irc-message", { nick: event.nick, message: event.message, channel: event.target });
  console.log(`[IRC] ${event.target} <${event.nick}>: ${event.message}`);
});

// ---------- Simple Express routes ----------
app.use(express.json());

// health
app.get("/health", (req, res) => res.json({ ok: true }));

// secure admin endpoint to change nick at runtime
// Authorization: Bearer <ADMIN_TOKEN>
app.post("/admin/change-nick", (req, res) => {
  if (!ADMIN_TOKEN) return res.status(403).json({ error: "Admin token not configured" });
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Bearer token" });
  const token = auth.slice("Bearer ".length).trim();
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: "Invalid token" });

  const { newNick } = req.body || {};
  if (!newNick || typeof newNick !== "string" || !newNick.match(/^[A-Za-z0-9_\-\[\]\\`^{}|]+$/)) {
    return res.status(400).json({ error: "Invalid newNick (must be IRC-safe characters)" });
  }

  try {
    // request nick change
    irc.raw(`NICK ${newNick}`);
    console.log(`🔁 Requested nick change: ${currentNick} -> ${newNick}`);
    currentNick = newNick;
    return res.json({ ok: true, newNick });
  } catch (err) {
    console.error("Nick change error:", err);
    return res.status(500).json({ error: "Nick change failed", details: String(err) });
  }
});

// optional: endpoint to read current nick (public)
app.get("/admin/current-nick", (req, res) => {
  res.json({ nick: currentNick });
});

// ---------- Socket.io for web UIs ----------
io.on("connection", (socket) => {
  console.log("🌐 Web client connected:", socket.id);
  socket.on("send-message", (data) => {
    // data = { channel: "#iran", message: "hello" }
    if (data && data.channel && data.message) {
      irc.say(data.channel, String(data.message));
    }
  });
});

// ---------- Start HTTP server ----------
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

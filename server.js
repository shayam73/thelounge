import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import IRC from "irc-framework";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// ✅ وب‌سرور ساده برای تست
app.get("/", (req, res) => {
  res.send("🚀 TheLounge Express Server connected to IRC!");
});

// ✅ اتصال به سرور IRC
const client = new IRC.Client();

client.connect({
  host: "irc.mahdkoosh.com",
  port: 6667, // اگر SSL داری، پورت 6697 بذار و tls: true اضافه کن
  nick: "TheLoungeBot",
  username: "thelounge",
  gecos: "Web IRC Bot"
});

client.on("registered", () => {
  console.log("✅ Connected to IRC server irc.mahdkoosh.com");
  client.join("#general"); // کانال پیش‌فرض، می‌تونی عوضش کنی
});

client.on("message", (event) => {
  console.log(`[${event.target}] <${event.nick}> ${event.message}`);
  io.emit("irc-message", {
    channel: event.target,
    nick: event.nick,
    message: event.message
  });
});

client.on("error", (err) => {
  console.error("❌ IRC Error:", err);
});

// ✅ ارتباط Socket.io برای کاربران وب
io.on("connection", (socket) => {
  console.log("🟢 Web client connected:", socket.id);

  socket.on("send-message", (data) => {
    client.say(data.channel, data.message);
  });
});

// ✅ شروع سرور HTTP
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import IRC from "irc-framework";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// ✅ وب‌سرور ساده
app.get("/", (req, res) => {
  res.send("🚀 TheLounge Custom Express + IRC Server is running!");
});

// ✅ اتصال به IRC
const irc = new IRC.Client();

irc.connect({
  host: "irc.mahdkoosh.com", // ← آدرس سرور IRC
  port: 6667,                // پورت پیش‌فرض IRC (اگه SSL هست: 6697)
  nick: "RenderBot",         // نیک مورد نظر
  username: "RenderBot",
  gecos: "Render IRC Bot"
});

// ✅ وقتی وصل شد
irc.on("registered", () => {
  console.log("✅ Connected to IRC server!");
  irc.join("#iran"); // ← کانال مورد نظر رو اینجا بزن
});

// ✅ وقتی پیامی در IRC دریافت شد
irc.on("message", (event) => {
  console.log(`[IRC] <${event.nick}> ${event.message}`);
  io.emit("irc-message", { nick: event.nick, message: event.message });
});

// ✅ وقتی کاربر جدید در وب‌سوکت وصل شد
io.on("connection", (socket) => {
  console.log("🌐 WebSocket user connected:", socket.id);

  socket.on("send-message", (msg) => {
    irc.say("#test", msg); // ← پیام رو به کانال IRC بفرست
  });
});

// ✅ اجرای سرور HTTP (برای Render)
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

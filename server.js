// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import chalk from "chalk";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.send("✅ The Lounge custom server is running successfully!");
});

io.on("connection", (socket) => {
  console.log(chalk.green("🟢 A user connected"));
  socket.on("disconnect", () => {
    console.log(chalk.yellow("🔴 A user disconnected"));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(chalk.blue(`🚀 Server running on port ${PORT}`));
});

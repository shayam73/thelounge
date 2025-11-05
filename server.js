import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.get("/", (req, res) => {
  res.send("🚀 TheLounge Express Server is running!");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

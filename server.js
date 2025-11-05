// server.js
import("./server").then(({ default: startServer }) => {
  startServer();
}).catch((err) => {
  console.error("Error starting The Lounge server:", err);
  process.exit(1);
});

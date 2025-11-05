// server.js
import("./server/index.js")
  .then(({ default: startServer }) => {
    startServer();
  })
  .catch((err) => {
    console.error("❌ Error starting The Lounge server:", err);
    process.exit(1);
  });

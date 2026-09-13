import { io } from "socket.io-client";

const targetUrl = process.env.UPTIME_KUMA_BACKEND_URL || "http://localhost:3001";
const socket = io(targetUrl, { transports: ["websocket"] });

socket.on("connect", () => {
  socket.emit("subscribeStatusPage", "default");
});

socket.onAny((event, ...args) => {
  console.log(`[Event] ${event}`, JSON.stringify(args).substring(0, 500));
});

setTimeout(() => {
  process.exit(0);
}, 3000);

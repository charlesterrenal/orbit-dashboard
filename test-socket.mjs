import { io } from "socket.io-client";

const socket = io("http://192.168.254.204:3001", { transports: ["websocket"] });

socket.on("connect", () => {
  socket.emit("subscribeStatusPage", "default");
});

socket.onAny((event, ...args) => {
  console.log(`[Event] ${event}`, JSON.stringify(args).substring(0, 500));
});

setTimeout(() => {
  process.exit(0);
}, 3000);

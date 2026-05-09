import { io } from "socket.io-client";
import { getOrigin } from "./config.js";

let socketRef = /** @type {import("socket.io-client").Socket | null} */ (null);

export function getIncidentSocket() {
  if (!socketRef) {
    socketRef = io(getOrigin(), {
      transports: ["websocket"],
      autoConnect: false,
    });
  }
  return socketRef;
}

export function disconnectIncidentSocket() {
  if (socketRef?.connected) socketRef.disconnect();
}

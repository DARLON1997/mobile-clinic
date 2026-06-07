import PusherJS from "pusher-js"

let _client: PusherJS | null = null

export function getPusherClient(): PusherJS | null {
  if (typeof window === "undefined") return null
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  if (!key) return null
  if (!_client) {
    _client = new PusherJS(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      enabledTransports: ["ws", "wss"],
      disableStats: true,
    })
  }
  return _client
}

export function nanoid(size = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  const arr = new Uint8Array(size)
  crypto.getRandomValues(arr)
  for (const byte of arr) result += chars[byte % chars.length]
  return result
}
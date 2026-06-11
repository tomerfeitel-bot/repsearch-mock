import * as Crypto from 'expo-crypto';

// Port of src/lib/nanoid.js — Hermes has no global crypto, so expo-crypto
// provides getRandomValues. Used for local set ids only.
export function nanoid(size = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const arr = Crypto.getRandomValues(new Uint8Array(size));
  for (const byte of arr) result += chars[byte % chars.length];
  return result;
}

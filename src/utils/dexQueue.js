// src/utils/dexQueue.js
let lastCallTime = 0;
const MIN_DELAY = 1500; // 1.2s giữa 2 lần gọi

export const enqueueDexFetch = async (fn) => {
  const now = Date.now();
  const delay = Math.max(MIN_DELAY - (now - lastCallTime), 0);

  return new Promise((resolve) => {
    setTimeout(async () => {
      lastCallTime = Date.now();
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        resolve(null);
      }
    }, delay);
  });
};

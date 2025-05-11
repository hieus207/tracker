// hooks/getDexQuote.js (đổi tên cho đúng logic)
export async function getDexQuote({ chainId, fromTokenAddress, toTokenAddress, amount }) {
  const apiKey = process.env.REACT_APP_OKX_API_KEY;
  const secretKey = process.env.REACT_APP_OKX_SECRET_KEY;
  const passphrase = process.env.REACT_APP_OKX_PASSPHRASE;


  const method = "GET";
  const requestPath = "/api/v5/dex/aggregator/quote";
  const queryString = `?chainId=${chainId}&fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}`;
  const timestamp = new Date().toISOString().slice(0, -5) + "Z";
  const prehash = timestamp + method + requestPath + queryString;

  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(prehash)
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  const res = await fetch(`https://web3.okx.com${requestPath}${queryString}`, {
    method: "GET",
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("Failed to fetch DEX quote");

  const data = await res.json();
  return data;
}

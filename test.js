const symbol = 'BTC'; // thay bằng symbol bạn cần, ví dụ BTC, ETH, v.v.
const provider = 'Bitget';

const url = 'wss://ws.bitget.com/v2/ws/public';
const ws = new WebSocket(url);

ws.onopen = () => {
  const subscribeMsg = {
    op: 'subscribe',
    args: [
      {
        instType: 'USDT-FUTURES',
        channel: 'ticker',
        instId: `${symbol}USDT`
      }
    ]
  };

  ws.send(JSON.stringify(subscribeMsg));
  console.log('WebSocket connected and subscribed to Bitget ticker.');
};

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);

  if (provider === 'Bitget') {
    const d = msg.data?.[0];
    if (!d || !d.lastPr || !d.open24h || !d.high24h) return;

    const lastPrice = parseFloat(d.lastPr);
    const openPrice = parseFloat(d.open24h);
    const highPrice = parseFloat(d.high24h);
    const lowPrice = parseFloat(d.low24h);
    const changePercent = ((lastPrice - openPrice) / openPrice) * 100;

    console.log('Bitget:', {
      lastPrice,
      openPrice,
      highPrice,
      lowPrice,
      changePercent: changePercent.toFixed(2) + '%'
    });
  }
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err);
};

ws.onclose = () => {
  console.warn('WebSocket closed. Attempting reconnect...');
  // Optional: implement reconnect logic here
};

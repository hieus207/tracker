import React, { useState, useEffect, useRef } from "react";
import InputPanel from "./components/InputPanel";
import PriceDisplay from "./components/PriceDisplay";
// import { retrieveLaunchParams,init } from '@telegram-apps/sdk';


function App() {
	const [formData, setFormData] = useState({
		cex: "",
		tokenCex: "",
		chain: "",
		tokenDex: "",
		tokenDecimal: "",
		sideDiff: "",
		targetDiff: "", // Đổi từ diff thành targetDiff
		dexAmount: "",
		dexSide: "",
	});

  // init()
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();

      const payload = tg.initDataUnsafe?.start_param || "";
      console.log("Payload from Telegram:", payload);

      const [
        cex,
        tokenCex,
        chain,
        tokenDex,
        tokenDecimal,
        dexSide,
        dexAmount,
        sideDiff,
        targetDiff
      ] = payload.split("_");

      setFormData((prev) => ({
        cex: cex || "",
        tokenCex: tokenCex || "",
        chain: chain || "",
        tokenDex: tokenDex || "",
        dexAmount: dexAmount || "",
        tokenDecimal: tokenDecimal || "",
        targetDiff: targetDiff || "",
        sideDiff: sideDiff=="1"?">":"<" || "",
        dexSide: dexSide || "",
      }));
    }
  }, []);

  const [results, setResults] = useState([]);
  const [priceMap, setPriceMap] = useState(new Map());
  const wsRef = useRef(null);
  const subscribedSymbols = useRef(new Set());

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleTargetDiffChange = (e) => { // Đổi từ handleDiffChange thành handleTargetDiffChange
    setFormData((prevData) => ({
      ...prevData,
      targetDiff: e.target.value, // Thay đổi từ diff thành targetDiff
    }));
  };

  const handleGo = () => {
    const symbol = `${formData.tokenCex.toUpperCase()}USDT`;

    if (!subscribedSymbols.current.has(symbol)) {
      wsRef.current?.send(
        JSON.stringify({
          op: "subscribe",
          args: [`tickers.${symbol}`],
        })
      );
      subscribedSymbols.current.add(symbol);
    }

    setResults((prev) => [
      ...prev,
      {
        id: Date.now(),
        symbol,
        cexInfo: {
          name: formData.cex,
          token: formData.tokenCex,
        },
        dexInfo: {
          chain: formData.chain,
          token: formData.tokenDex,
          decimal: formData.tokenDecimal,
          price: "0",
        },
        targetDiff: formData.targetDiff, // Đổi từ diff thành targetDiff
        sideDiff: formData.sideDiff,
        amount: formData.dexAmount,
        side: formData.dexSide,
      },
    ]);
  };

  const handleRemove = (id) => {
    setResults((prev) => {
      const updatedResults = prev.filter((result) => result.id !== id);
      const removedSymbol = prev.find((result) => result.id === id)?.symbol;
      const remainingSymbols = updatedResults.filter(
        (result) => result.symbol === removedSymbol
      );

      if (remainingSymbols.length === 0 && removedSymbol) {
        wsRef.current?.send(
          JSON.stringify({
            op: "unsubscribe",
            args: [`tickers.${removedSymbol}`],
          })
        );
        subscribedSymbols.current.delete(removedSymbol);
      }

      return updatedResults;
    });
  };

  useEffect(() => {
    const socket = new WebSocket("wss://stream.bybit.com/v5/public/linear");
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.topic?.startsWith("tickers.") && msg.data?.lastPrice) {
        const symbol = msg.data.symbol;
        const price = parseFloat(msg.data.lastPrice);
        setPriceMap((prevMap) => new Map(prevMap.set(symbol, price)));
      }
    };

    socket.onerror = (err) => console.error("WebSocket error:", err);
    socket.onclose = () => console.log("🔌 WebSocket closed");

    return () => socket.close();
  }, []);

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-6 space-y-8">
      <div className="w-full max-w-4xl">
        <InputPanel
          onGo={handleGo}
          formData={formData}
          onSelectChange={handleSelectChange}
          onTargetDiffChange={handleTargetDiffChange} // Đổi từ onDiffChange thành onTargetDiffChange
        />
      </div>

      <div className="space-y-6 w-full max-w-4xl">
        {results.map((entry) => {
          const symbol = entry.symbol;
          const livePrice = priceMap.get(symbol) ?? "-";

          return (
            <PriceDisplay
              key={entry.id}
              id={entry.id}
              cexInfo={{ ...entry.cexInfo, price: livePrice }}
              dexInfo={entry.dexInfo}
              targetDiff={entry.targetDiff} // Đổi từ diff thành targetDiff
              sideDiff={entry.sideDiff}
              amount={entry.amount}
              side={entry.side}
              onRemove={handleRemove}
            />
          );
        })}
      </div>


    </div>
  );
}

export default App;

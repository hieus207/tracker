import React, { useState, useEffect, useRef } from "react";
import InputPanel from "./components/InputPanel";
import PriceDisplay from "./components/PriceDisplay";
// import { retrieveLaunchParams,init } from '@telegram-apps/sdk';
import { Dialog, Transition } from "@headlessui/react";
import SettingsDialog from "./components/SettingsDialog";

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
  const [results, setResults] = useState([]);
  const [priceMap, setPriceMap] = useState(new Map());
  const wsRef = useRef(null);
  const subscribedSymbols = useRef(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const importInputRef = useRef(null);
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
        sideDiff: sideDiff == "1" ? ">" : "<" || "",
        dexSide: dexSide || "",
      }));
    }
  }, []);


  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleImport = () => {
    try {
      let input = importText.trim();

      // 👉 Nếu người dùng paste cả link Telegram thì lấy phần sau 'startapp='
      if (input.includes("startapp=")) {
        const parts = input.split("startapp=");
        input = parts[1].split("&")[0]; // đề phòng có thêm query khác
      }

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
      ] = input.split("_");

      setFormData({
        cex: cex || "",
        tokenCex: tokenCex || "",
        chain: chain || "",
        tokenDex: tokenDex || "",
        tokenDecimal: tokenDecimal || "",
        dexSide: dexSide || "",
        dexAmount: dexAmount || "",
        sideDiff: sideDiff == "1" ? ">" : "<" || "",
        targetDiff: targetDiff || "",
      });
    } catch (e) {
      alert("Import thất bại. Kiểm tra định dạng.");
    }
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
        let symbol = msg.data.symbol;
        let price = parseFloat(msg.data.lastPrice);

        // 👉 Kiểm tra nếu symbol bắt đầu bằng số và là bội số của 10
        const match = symbol.match(/^(\d+)([A-Z]+)/); // Tách số đầu và phần tên coin
        if (match) {
          const prefixNumber = parseInt(match[1], 10);
          if (prefixNumber >= 10 && prefixNumber % 10 === 0) {
            price = price / prefixNumber;
          }
        }

        setPriceMap((prevMap) => new Map(prevMap.set(symbol, price)));
      }
    };

    socket.onerror = (err) => console.error("WebSocket error:", err);
    socket.onclose = () => console.log("🔌 WebSocket closed");

    return () => socket.close();
  }, []);

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-6 space-y-8">
      <div className="flex justify-between items-center w-full max-w-4xl space-x-2">
        <div className="flex items-center w-full max-w-4xl space-x-2">
          <input
            ref={importInputRef}
            type="text"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            onClick={() => {
              if (importText) importInputRef.current.select();
            }}
            placeholder="Paste import string or URL"
            className="flex-grow px-3 py-2 border border-gray-300 rounded bg-white text-black"
          />

          <button
            onClick={handleImport}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center space-x-2"
          >
            <span>Import</span>
          </button>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          ⚙️
        </button>
      </div>

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <div className="w-full max-w-4xl">
        <InputPanel
          onGo={handleGo}
          formData={formData}
          onSelectChange={handleSelectChange}
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

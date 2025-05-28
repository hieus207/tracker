import React, { useState, useEffect, useRef } from "react";
import InputPanel from "./components/InputPanel";
import PriceDisplay from "./components/PriceDisplay";
import { Dialog, Transition } from "@headlessui/react";
import SettingsDialog from "./components/SettingsDialog";

function MainApp() {
  const [formData, setFormData] = useState({
    cex: "",
    tokenCex: "",
    chain: "",
    tokenDex: "",
    tokenDecimal: "",
    sideDiff: "",
    targetDiff: "",
    dexAmount: "",
    dexSide: "",
  });
  const [results, setResults] = useState([]);
  const [priceMap, setPriceMap] = useState(new Map());
  const wsRef = useRef(null); // Bybit
  const bitgetWsRef = useRef(null); // Bitget
  const subscribedSymbols = useRef(new Set()); // Bybit
  const bitgetSubscribedSymbols = useRef(new Set()); // Bitget
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const importInputRef = useRef(null);

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
        targetDiff,
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
      if (input.includes("startapp=")) {
        const parts = input.split("startapp=");
        input = parts[1].split("&")[0];
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
        targetDiff,
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

    if (formData.cex === "bybit") {
      if (!subscribedSymbols.current.has(symbol)) {
        wsRef.current?.send(
          JSON.stringify({
            op: "subscribe",
            args: [`tickers.${symbol}`],
          })
        );
        subscribedSymbols.current.add(symbol);
      }
    } else if (formData.cex === "bitget") {
      if (!bitgetSubscribedSymbols.current.has(symbol)) {
        bitgetWsRef.current?.send(
          JSON.stringify({
            op: "subscribe",
            args: [
              {
                instType: "USDT-FUTURES",
                channel: "ticker",
                instId: symbol,
              },
            ],
          })
        );
        bitgetSubscribedSymbols.current.add(symbol);
      }
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
        targetDiff: formData.targetDiff,
        sideDiff: formData.sideDiff,
        amount: formData.dexAmount,
        side: formData.dexSide,
      },
    ]);
  };

  const handleRemove = (id) => {
    setResults((prev) => {
      const updatedResults = prev.filter((result) => result.id !== id);
      const removedItem = prev.find((result) => result.id === id);
      const removedSymbol = removedItem?.symbol;
      const cex = removedItem?.cexInfo?.name;

      const remainingSymbols = updatedResults.filter(
        (result) => result.symbol === removedSymbol
      );

      if (remainingSymbols.length === 0 && removedSymbol) {
        if (cex === "bybit") {
          wsRef.current?.send(
            JSON.stringify({
              op: "unsubscribe",
              args: [`tickers.${removedSymbol}`],
            })
          );
          subscribedSymbols.current.delete(removedSymbol);
        } else if (cex === "bitget") {
          bitgetWsRef.current?.send(
            JSON.stringify({
              op: "unsubscribe",
              args: [
                {
                  instType: "USDT-FUTURES",
                  channel: "ticker",
                  instId: removedSymbol,
                },
              ],
            })
          );
          bitgetSubscribedSymbols.current.delete(removedSymbol);
        }
      }

      return updatedResults;
    });
  };

  useEffect(() => {
    let socket;
    let reconnectTimer;

    const connectBybit = () => {
      socket = new WebSocket("wss://stream.bybit.com/v5/public/linear");
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("✅ Bybit WebSocket connected");

        // Re-subscribe toàn bộ symbol còn lại
        subscribedSymbols.current.forEach((symbol) => {
          socket.send(JSON.stringify({
            op: "subscribe",
            args: [`tickers.${symbol}`],
          }));
        });
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.topic?.startsWith("tickers.") && msg.data?.lastPrice) {
          let symbol = msg.data.symbol;
          let price = parseFloat(msg.data.lastPrice);

          // ✅ Nếu symbol bắt đầu bằng số (ví dụ 10NXPCUSDT), chia giá
          const match = symbol.match(/^(\d+)([A-Z]+)/);
          if (match) {
            const prefixNumber = parseInt(match[1], 10);
            if (prefixNumber >= 10 && prefixNumber % 10 === 0) {
              price = price / prefixNumber;
            }
          }

          setPriceMap((prevMap) => {
            const newMap = new Map(prevMap);
            newMap.set(symbol, price);
            return newMap;
          });
        }
      };


      socket.onclose = () => {
        console.log("🔌 Bybit WebSocket closed. Reconnecting in 3s...");
        reconnectTimer = setTimeout(connectBybit, 3000);
      };

      socket.onerror = (err) => {
        console.error("Bybit WebSocket error:", err);
        socket.close();
      };
    };

    connectBybit();

    return () => {
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  useEffect(() => {
    let socket;
    let reconnectTimer;

    const connectBitget = () => {
      socket = new WebSocket("wss://ws.bitget.com/v2/ws/public");
      bitgetWsRef.current = socket;

      socket.onopen = () => {
        console.log("✅ Bitget WebSocket connected");

        // Re-subscribe toàn bộ symbol còn lại
        bitgetSubscribedSymbols.current.forEach((symbol) => {
          socket.send(JSON.stringify({
            op: "subscribe",
            args: [{
              instType: "USDT-FUTURES",
              channel: "ticker",
              instId: symbol,
            }],
          }));
        });
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const d = msg.data?.[0];
        const symbol = d?.instId;
        let lastPr = d?.lastPr;

        if (!symbol || !lastPr) return;

        let price = parseFloat(lastPr);

        // ✅ Nếu symbol bắt đầu bằng số (ví dụ 10NXPCUSDT), chia giá
        const match = symbol.match(/^(\d+)([A-Z]+)/);
        if (match) {
          const prefixNumber = parseInt(match[1], 10);
          if (prefixNumber >= 10 && prefixNumber % 10 === 0) {
            price = price / prefixNumber;
          }
        }

        setPriceMap((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(symbol, price);
          return newMap;
        });

      };

      socket.onclose = () => {
        console.log("🔌 Bitget WebSocket closed. Reconnecting in 3s...");
        reconnectTimer = setTimeout(connectBitget, 3000);
      };

      socket.onerror = (err) => {
        console.error("Bitget WebSocket error:", err);
        socket.close();
      };
    };

    connectBitget();

    return () => {
      clearTimeout(reconnectTimer);
      socket?.close();
    };
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
              targetDiff={entry.targetDiff}
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

export default MainApp;

import React, { useEffect, useState } from "react";
import ExchangeInfo from "./ExchangeInfo";
import DiffInfo from "./DiffInfo";
import { getDexQuote } from "../hooks/useDexQuote";
import { useRef } from "react";

const PriceDisplay = ({
  id,
  cexInfo,
  dexInfo,
  targetDiff,
  sideDiff,
  amount,
  side,
  onRemove,
}) => {
  const [dexPrice, setDexPrice] = useState("0");
  const [calculatedDiff, setCalculatedDiff] = useState(null); // State để lưu diff tính toán
  const [highlight, setHighlight] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState("");


  const audioRef = useRef(null);

  function appendZeros(amountStr, decimal) {
    const [intPart, fracPart = ""] = amountStr.split(".");
    const cleanAmount = intPart + fracPart;
    const zerosToAdd = decimal - fracPart.length;
    return cleanAmount + "0".repeat(Math.max(0, zerosToAdd));
  }

  useEffect(() => {
    audioRef.current = new Audio("https://tiengdong.com/wp-content/uploads/Am-thanh-tra-loi-dung-chinh-xac-www_tiengdong_com.mp3?_=1");
  }, []);

  // Effect để lấy giá DEX
  useEffect(() => {
    let stopped = false;

    const USDC = {
      "1": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "56": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchLoop = async () => {
      while (!stopped) {
        if (!dexInfo.token || !amount || !side || !dexInfo.chain || !dexInfo.decimal) {
          await sleep(2000); // ngủ để tránh spam khi thiếu dữ liệu
          continue;
        }

        const chainId = dexInfo.chain;
        const fromTokenAddress = side === "buy" ? USDC[chainId] : dexInfo.token;
        const toTokenAddress = side === "buy" ? dexInfo.token : USDC[chainId];
        const new_amount = appendZeros(amount.toString(), parseInt(dexInfo.decimal));

        try {
          const priceData = await getDexQuote({
            chainId,
            fromTokenAddress,
            toTokenAddress,
            amount: new_amount,
          });

          if (!priceData?.data?.[0]) {
            if (priceData?.msg) setError(priceData.msg);
            setDexPrice("0");
          } else {
            const fromDecimals = priceData.data[0].fromToken.decimal;
            const toDecimals = priceData.data[0].toToken.decimal;

            const price =
              side === "buy"
                ? (priceData.data[0].fromTokenAmount / 10 ** fromDecimals) /
                (priceData.data[0].toTokenAmount / 10 ** toDecimals)
                : (priceData.data[0].toTokenAmount / 10 ** toDecimals) /
                (priceData.data[0].fromTokenAmount / 10 ** fromDecimals);

            setDexPrice(price ?? "0");
            setError("");
          }

          await sleep(6000); // ngủ 6s nếu thành công
        } catch (error) {
          console.error("Error fetching DEX price:", error);
          setDexPrice("-1");

          // Kiểm tra HTTP status nếu có
          if (error.response?.status === 429) {
            console.warn("Hit rate limit, waiting 2s...");
            await sleep(2000); // ngủ 2s nếu bị rate limit
          } else {
            setError("Error fetching DEX price");
            await sleep(6000); // lỗi khác thì vẫn giữ khoảng cách
          }
        }
      }
    };

    fetchLoop();

    return () => {
      stopped = true;
    };
  }, [dexInfo, amount, side]);
  // Effect để tính toán diff khi dexPrice hoặc cexInfo.price thay đổi
  useEffect(() => {
    if (cexInfo.price && dexPrice !== "0") {
      const diff = Math.abs(((parseFloat(dexPrice) - parseFloat(cexInfo.price)) / parseFloat(cexInfo.price)) * 100);

      if (side === "buy") {
        if (sideDiff === ">" && diff > parseFloat(targetDiff) && dexPrice < cexInfo.price) {
          setHighlight(true);
          if (!isMuted) {
            audioRef.current?.play();
          }
        } else if (sideDiff === "<" && (diff < parseFloat(targetDiff) || dexPrice < cexInfo.price)) {
          setHighlight(true);
          if (!isMuted) {
            audioRef.current?.play();
          }
        } else {
          setHighlight(false);
        }
      } else if (side === "sell") {
        if (sideDiff === ">" && diff > parseFloat(targetDiff) && dexPrice > cexInfo.price) {
          setHighlight(true);
          if (!isMuted) {
            audioRef.current?.play();
          }
        } else if (sideDiff === "<" && (diff < parseFloat(targetDiff) || dexPrice > cexInfo.price)) {
          setHighlight(true);
          if (!isMuted) {
            audioRef.current?.play();
          }
        } else {
          setHighlight(false);
        }
      }
      // if (sideDiff === ">" && diff > parseFloat(targetDiff)) {
      //   setHighlight(true);
      //   if (!isMuted) {
      //     audioRef.current?.play();
      //   }
      // } else if (sideDiff === "<" && diff < parseFloat(targetDiff)) {
      //   setHighlight(true);
      //   if (!isMuted) {
      //     audioRef.current?.play();
      //   }
      // } else {
      //   setHighlight(false);
      // }

      setCalculatedDiff(diff.toFixed(2)); // Lưu diff vào state với 2 chữ số thập phân
    }
  }, [dexPrice, cexInfo.price, isMuted, sideDiff, targetDiff, side]); // Dependency là dexPrice và cexInfo.price

  return (
    // <div className="mt-8 p-6 rounded-xl border bg-white shadow-md flex items-center justify-center gap-16 relative">
    <div
      className={`mt-8 p-6 rounded-xl border bg-white shadow-md flex items-center justify-center gap-16 relative transition-all duration-100 ${highlight ? "border-red-300 animate-pulse" : "border-gray-200"
        }`}
    >
      <ExchangeInfo {...cexInfo} />
      <DiffInfo diff={calculatedDiff} sideDiff={sideDiff} targetDiff={targetDiff} error={error} /> {/* Truyền diff đã tính toán */}
      <ExchangeInfo name={"Dex"} price={dexPrice} token={side} />
      <button
        onClick={() => onRemove(id)}
        className="absolute top-2 right-2 text-xl text-red-500"
      >
        ❌
      </button>
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-2 right-2 text-xl"
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
    </div>
  );
};

export default PriceDisplay;
// 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
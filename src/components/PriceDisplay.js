import React, { useEffect, useState } from "react";
import ExchangeInfo from "./ExchangeInfo";
import DiffInfo from "./DiffInfo";
import { getDexQuote } from "../hooks/useDexQuote";
import { useRef } from "react";
import { enqueueDexFetch } from "../utils/dexQueue";

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
  const [calculatedDiff, setCalculatedDiff] = useState(null);
  const [highlight, setHighlight] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState("");
  const [isClicked, setIsClicked] = useState(false); // New state for tracking the click status

  const audioRef = useRef(null);

  // Function to append zeros to the amount
  function appendZeros(amountStr, decimal) {
    const [intPart, fracPart = ""] = amountStr.split(".");
    const cleanAmount = intPart + fracPart;
    const zerosToAdd = decimal - fracPart.length;
    return cleanAmount + "0".repeat(Math.max(0, zerosToAdd));
  }

  const storedUrlAlert = localStorage.getItem("url_alert")?.trim();
  const urlAlert = storedUrlAlert && storedUrlAlert !== "" ? storedUrlAlert : "https://tiengdong.com/wp-content/uploads/Am-thanh-tra-loi-dung-chinh-xac-www_tiengdong_com.mp3?_=1";

  // Load audio for notifications
  useEffect(() => {
    audioRef.current = new Audio(urlAlert);
  }, []);

  // Fetch DEX price logic
  useEffect(() => {
    let stopped = false;

    const USDC = {
      "1": { "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "decimal": 6 },
      "8453": { "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "decimal": 6 },
      "56": { "address": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "decimal": 18 },
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const dex_fetch_interval = localStorage.getItem("dex_fetch_interval");
    const time_fetch_interval = dex_fetch_interval && dex_fetch_interval !== "" ? dex_fetch_interval : 6;

    const fetchLoop = async () => {
      while (!stopped) {
        if (!dexInfo.token || !amount || !side || !dexInfo.chain || !dexInfo.decimal) {
          await sleep(2000);
          continue;
        }

        const chainId = dexInfo.chain;
        const fromTokenAddress = side === "buy" ? USDC[chainId]["address"] : dexInfo.token;
        const toTokenAddress = side === "buy" ? dexInfo.token : USDC[chainId]["address"];
        const new_amount = side === "buy" ? appendZeros(Math.floor(amount).toString(), parseInt(USDC[chainId]["decimal"])) : appendZeros(Math.floor(amount).toString(), parseInt(dexInfo.decimal));

        try {
          const priceData = await enqueueDexFetch(() =>
            getDexQuote({
              chainId,
              fromTokenAddress,
              toTokenAddress,
              amount: new_amount,
            })
          );


          if (!priceData?.data?.[0]) {
            if (priceData?.msg) setError(priceData.msg);
            setDexPrice("0");
          } else {
            const fromDecimals = priceData.data[0].fromToken.decimal;
            const toDecimals = priceData.data[0].toToken.decimal;

            const price = side === "buy"
              ? (priceData.data[0].fromTokenAmount / 10 ** fromDecimals) / (priceData.data[0].toTokenAmount / 10 ** toDecimals)
              : (priceData.data[0].toTokenAmount / 10 ** toDecimals) / (priceData.data[0].fromTokenAmount / 10 ** fromDecimals);

            setDexPrice(price ?? "0");
            setError("");
          }

          await sleep(time_fetch_interval * 1000);
        } catch (error) {
          console.error("Error fetching DEX price:", error);
          setDexPrice("-1");

          if (error.response?.status === 429) {
            console.warn("Hit rate limit, waiting 2s...");
            await sleep(2000);
          } else {
            setError("Error fetching DEX price");
            await sleep(time_fetch_interval * 1000);
          }
        }
      }
    };

    fetchLoop();

    return () => {
      stopped = true;
    };
  }, [dexInfo, amount, side]);

  // Calculate the price difference
  useEffect(() => {
    if (cexInfo.price && dexPrice !== "0") {
      const diff = Math.abs(((parseFloat(dexPrice) - parseFloat(cexInfo.price)) / parseFloat(cexInfo.price)) * 100);

      if (side === "buy") {
        if (sideDiff === ">" && diff > parseFloat(targetDiff) && dexPrice < cexInfo.price && dexPrice !== "-1") {
          setHighlight(true);
          if (!isMuted) {
            audioRef.current?.play();
          }
        } else if (sideDiff === "<" && (diff < parseFloat(targetDiff) || dexPrice < cexInfo.price) && dexPrice !== "-1") {
          setHighlight(true);
          if (!isMuted) {
            audioRef.current?.play();
          }
        } else {
          setHighlight(false);
        }
      } else if (side === "sell") {
        if (sideDiff === ">" && diff > parseFloat(targetDiff) && dexPrice > cexInfo.price && dexPrice !== "-1") {
          setHighlight(true);
          if (!isMuted) {
            audioRef.current?.play();
          }
        } else if (sideDiff === "<" && (diff < parseFloat(targetDiff) || dexPrice > cexInfo.price) && dexPrice !== "-1") {
          setHighlight(true);
          if (!isMuted) {
            audioRef.current?.play();
          }
        } else {
          setHighlight(false);
        }
      }

      setCalculatedDiff(diff.toFixed(2));
    }
  }, [dexPrice, cexInfo.price, isMuted, sideDiff, targetDiff, side]);

  // Function to handle click and change icon to checkmark
  const handleClick = () => {
    navigator.clipboard.writeText(`https://t.me/hlt_tracker_bot/tracker?startapp=${cexInfo.name}_${cexInfo.token}_${dexInfo.chain}_${dexInfo.token}_${dexInfo.decimal}_${side}_${amount}_${sideDiff == ">" ? "1" : "2"}_${targetDiff}`); // <-- Copy vào clipboard
    setIsClicked(true);  // Set the click state to true
    setTimeout(() => setIsClicked(false), 500); // Reset after 2 seconds
  };

  return (
    <div
      className={`mt-8 p-6 rounded-xl border bg-white shadow-md flex items-center justify-center gap-6 relative transition-all duration-100 
        lg:gap-16 md:gap-12 sm:gap-6 ${highlight ? "border-red-300 animate-pulse" : "border-gray-200"}`}
    >
      <ExchangeInfo {...cexInfo} />
      <DiffInfo diff={calculatedDiff} sideDiff={sideDiff} targetDiff={targetDiff} error={error} />
      <ExchangeInfo name={"Dex"} price={dexPrice} token={side} />

      {/* Share button with checkmark when clicked */}
      <button
        onClick={handleClick}
        className="absolute bottom-2 right-12 text-xl"
      >
        {isClicked ? "✅" : "🔗"}  {/* Show ✅ when clicked, else show 🔗 */}
      </button>

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

import React from "react";

const InputPanel = ({
  onGo,
  formData,
  onSelectChange, // Hàm này sẽ xử lý cả amount và targetDiff
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-full flex flex-wrap justify-center items-center gap-4">
      {/* CEX */}
      <select name="cex" value={formData.cex} onChange={onSelectChange}>
        <option value="">Select CEX</option>
        <option value="binance">Binance</option>
        <option value="kucoin">KuCoin</option>
        <option value="coinbase">Coinbase</option>
        <option value="bybit">Bybit</option>
        <option value="okx">OKX</option>
      </select>

      <input
        name="tokenCex"
        type="text"
        placeholder="Token Symbol (e.g. BTC)"
        className="border p-2 rounded w-32"
        value={formData.tokenCex || ""}
        onChange={onSelectChange}
      />

      {/* Chain (DEX chain) */}
      <select
        name="chain"
        className="border p-2 rounded"
        value={formData.chain}
        onChange={onSelectChange}
      >
        <option value="">Select Chain</option>
        <option value="1">Ethereum</option>
        <option value="56">BNB</option>
        <option value="8453">BASE</option>
      </select>

      {/* Token Address */}
      <input
        name="tokenDex"
        type="text"
        placeholder="Token Address"
        className="border p-2 rounded w-64"
        value={formData.tokenDex || ""}
        onChange={onSelectChange}
      />

      {/* Token Decimal */}
      <input
        name="tokenDecimal"
        type="number"
        placeholder="Token Decimal"
        className="border p-2 rounded w-24"
        value={formData.tokenDecimal || ""}
        onChange={onSelectChange}
      />

      {/* DEX Side */}
      <select
        name="dexSide"
        className="border p-2 rounded"
        value={formData.dexSide}
        onChange={onSelectChange}
      >
        <option value="">Side</option>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>

      {/* DEX Amount */}
      <input
        name="dexAmount"
        type="number"
        placeholder="Amount"
        className="border p-2 rounded w-24"
        value={formData.dexAmount || ""}
        onChange={onSelectChange}
      />

      <select
        name="sideDiff"
        className="border p-2 rounded"
        value={formData.sideDiff}
        onChange={onSelectChange}
      >
        <option value="">Select Side Diff</option>
        <option value="<">&lt;</option>
        <option value=">">&gt;</option>
      </select>

      {/* Target Diff input */}
      <input
        name="targetDiff"
        type="text"
        placeholder="Input Target diff"
        className="border p-2 rounded w-32"
        value={formData.targetDiff || ""}
        onChange={onSelectChange}
      />

      {/* Go button */}
      <button
        onClick={onGo}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        GO
      </button>
    </div>
  );
};

export default InputPanel;

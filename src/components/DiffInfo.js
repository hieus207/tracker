import React from "react";

const DiffInfo = ({ diff, sideDiff, targetDiff, error }) => {
  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="font-semibold">DIFF</div>
      <div className="text-2xl font-bold text-green-600">{diff}%</div>
      <div className="text-sm font-bold text-black-500">Target: {sideDiff} {targetDiff}%</div>
      <div className="text-sm italic text-red-500">{error}</div>
    </div>
  );
};

export default DiffInfo;

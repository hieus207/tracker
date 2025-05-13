import React from "react";

const ExchangeInfo = ({ name, token, price }) => {
  return (
    <div className="flex flex-col items-center space-y-1 min-w-[80px]">
      <div className="font-semibold">{name} - {token}</div>
      <div className="text-xl font-bold">{price}</div>
    </div>
  );
};

export default ExchangeInfo;

import React from "react";

const ExchangeInfo = ({ name, token, price }) => {
  
function formatNumber(number) {
  const num = typeof number === 'string' ? parseFloat(number) : number;

  // Convert về chuỗi full số thập phân (không dùng toString)
  const numStr = num.toLocaleString('en-US', {
    useGrouping: false,
    maximumSignificantDigits: 18
  });

  const [integerPart, decimalPart = ''] = numStr.split('.');

  if (num >= 1) {
    const resultDecimal = decimalPart.slice(0, 2);
    return resultDecimal ? `${integerPart}.${resultDecimal}` : integerPart;
  }

  // Nếu < 1, lấy tối đa 3 chữ số đầu tiên khác 0 sau dấu phẩy
  let resultDecimal = '';
  let count = 0;
  for (let i = 0; i < decimalPart.length; i++) {
    resultDecimal += decimalPart[i];
    if (decimalPart[i] !== '0') count++;
    if (count === 3) break;
  }

  return resultDecimal ? `${integerPart}.${resultDecimal}` : integerPart;
}

  return (
    <div className="flex flex-col items-center space-y-1 min-w-[80px]">
      <div className="font-semibold">{name} - {token}</div>
      <div className="text-xl font-bold">{formatNumber(price)}</div>
    </div>
  );
};

export default ExchangeInfo;

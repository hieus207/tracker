import React from "react";

const ExchangeInfo = ({ name, token, price }) => {
  
  function formatNumber(number) {
    // Chuyển số thành chuỗi và tách phần nguyên và phần thập phân
    const numStr = number.toString();
    const [integerPart, decimalPart = ''] = numStr.split('.');

    // Nếu giá trị lớn hơn hoặc bằng 1, chỉ lấy 2 chữ số sau dấu phẩy
    if (number >= 1) {
      const resultDecimal = decimalPart.slice(0, 2);  // Lấy 2 chữ số sau dấu phẩy
      return resultDecimal ? `${integerPart}.${resultDecimal}` : integerPart;
    }

    // Nếu giá trị nhỏ hơn 1, lấy 3 chữ số đầu tiên khác 0 sau dấu phẩy
    let resultDecimal = '';
    let count = 0;

    for (let i = 0; i < decimalPart.length && count < 3; i++) {
      if (decimalPart[i] !== '0' || resultDecimal.length < 3) {
        resultDecimal += decimalPart[i];
        count++;
      }
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

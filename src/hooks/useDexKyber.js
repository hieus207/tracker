// hooks/getDexQuote.js (đổi tên cho đúng logic)
export async function getDexKyber({ chainId, fromTokenAddress, toTokenAddress, amount }) {

  const chainMap = {
    1: "ethereum",
    56: "bsc",
    42161: "arbitrum",
    8453: "base"
  };  
  const chainName = chainMap[chainId];
  // https://aggregator-api.kyberswap.com/{network.short_name.lower()}/api/v1/routes?tokenIn={src_token[network.name]}&tokenOut={dest_token}&amountIn={amount_in}&gasInclude=true
  const requestPath = `/${chainName}/api/v1/routes`;
  const queryString = `?tokenIn=${fromTokenAddress}&tokenOut=${toTokenAddress}&amountIn=${amount}&gasInclude=true`;
  const res = await fetch(`https://aggregator-api.kyberswap.com${requestPath}${queryString}`, {
    method: "GET",
    headers: {
      // "OK-ACCESS-KEY": apiKey,
      // "OK-ACCESS-SIGN": signature,
      // "OK-ACCESS-TIMESTAMP": timestamp,
      // "OK-ACCESS-PASSPHRASE": passphrase,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("Failed to fetch DEX quote");

  const data = await res.json();
  data.msg = data?.message || data?.msg || "No message";
  data.data = [{
    fromTokenAmount: data?.data?.routeSummary?.amountIn || 0,
    toTokenAmount: data?.data?.routeSummary?.amountOut || 0,
  }]
  return data;
}

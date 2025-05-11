import time
from requests import Session
import requests


from pybit.unified_trading import WebSocket
from time import sleep
import json
session = Session()
bybit_price = 0
ws = WebSocket(
    testnet=False,
    channel_type="linear",
)
def handle_message(message):
    global bybit_price
    try:
        data = message
        bybit_price = float(data['data']['lastPrice'])
    except Exception as e:
        print("Loi")
        print(e)

    
ws.ticker_stream(
    symbol="DOODUSDT",
    callback=handle_message
)


# {'topic': 'tickers.DEEPUSDT', 'type': 'snapshot', 'data': {'symbol': 'DEEPUSDT', 'tickDirection': 'ZeroPlusTick', 'price24hPcnt': '0.654724', 'lastPrice': '0.23972', 'prevPrice24h': '0.14487', 'highPrice24h': '0.25011', 'lowPrice24h': '0.12798', 'prevPrice1h': '0.22023', 'markPrice': '0.23972', 'indexPrice': '0.20502', 'openInterest': '2625150', 'openInterestValue': '629300.96', 'turnover24h': '359227.4861', 'volume24h': '1988320.0000', 'nextFundingTime': '1745424000000', 'fundingRate': '0.02', 'bid1Price': '0.23013', 'bid1Size': '28020', 'ask1Price': '0.25171', 'ask1Size': '4170', 'preOpenPrice': '', 'preQty': '', 'curPreListingPhase': ''}, 'cs': 1710211422, 'ts': 1745403887478}

# def fetch_bybit(symbol=""):
#     print("Goi fetch bybit ", symbol)
#     try:
#         timeout=5 if symbol!="" else 30
#         url = "https://api.bybit.com/v5/market/tickers?category=linear&symbol="+symbol
#         headers = {'Accept': 'application/json', 'Content-Type': 'application/json'}
#         r = session.get(url, headers=headers,timeout=timeout)
#         data = r.json()['result']['list'][0]
#         r.close()                
#         return {
#             'last': data['lastPrice'],
#             'volume': data['turnover24h']
#             }
#     except Exception as e:
#         print("Loi fetch bybit")
#         print(session.proxies)
#         print(e)

def fetch_price_cetus(contract="",side="buy",amount=1000):
    # print("Goi fetch cetus ", symbol)
    USDC = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
    if side == "buy":
        url = f"https://api-sui.cetus.zone/router_v2/find_routes?from={USDC}&target={contract}&amount=3000000000&by_amount_in=true&depth=3&providers=CETUS,KRIYA,FLOWX,STEAMM,BLUEMOVE,DEEPBOOKV3,METASTABLE,SPRINGSUI,AFTERMATH,FLOWXV3,VOLO,KRIYAV3,OBRIC,HAEDALPMM,SCALLOP,TURBOS,BLUEFIN,AFSUI,ALPHAFI,HAEDAL,STEAMM_OMM,MOMENTUM&v=1000800"
    else:
        url = f"https://api-sui.cetus.zone/router_v2/find_routes?from={contract}&target={USDC}&amount={amount}&by_amount_in=true&depth=3&providers=CETUS,KRIYA,FLOWX,STEAMM,BLUEMOVE,DEEPBOOKV3,METASTABLE,SPRINGSUI,AFTERMATH,FLOWXV3,VOLO,KRIYAV3,OBRIC,HAEDALPMM,SCALLOP,TURBOS,BLUEFIN,AFSUI,ALPHAFI,HAEDAL,STEAMM_OMM,MOMENTUM&v=1000800"
    
    headers = {'Accept': 'application/json', 'Content-Type': 'application/json','User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/'}
    r = session.get(url, headers=headers,timeout=5)
    try:
        data = r.json()['data']
    except:
        print("Loi fetch cetus")
        print(r.status_code)
        return 0
    print('fetch xong')
    r.close()
    if side == "buy":
        amount_in = data['amount_in']
        real_amount_in = amount_in/(10**6)
        estimate_real_amount_out = str(real_amount_in*float(data['routes'][0]['initial_price']))
        price = data['routes'][0]['initial_price']
        real_amount_out = format_amount(data['amount_out'],estimate_real_amount_out)
    else:
        amount_out = data['amount_out']
        real_amount_out = amount_out/(10**6)
        if real_amount_out < 2920:
            increase_amount_in = round(amount * (round(3000/real_amount_out)) * 1.1)
            time.sleep(1)
            return fetch_price_cetus(contract,side,increase_amount_in)
        price = data['routes'][0]['initial_price']
        estimate_real_amount_in = str(real_amount_out/float(price))
        real_amount_in = format_amount(data['amount_in'],estimate_real_amount_in)
        print(real_amount_in)
    price = real_amount_in/real_amount_out if side == "buy" else real_amount_out/real_amount_in
    return price

def format_amount(amount_out: int, initial_price: str) -> str:
    # B1: Xác định có bao nhiêu số nguyên trước dấu chấm trong initial_price
    integer_part = initial_price.split('.')[0]
    digits_before_dot = len(integer_part)

    # B2: Convert amount_out thành string để chèn dấu chấm
    amount_out_str = str(amount_out)

    # Nếu số lượng số nhỏ hơn digits_before_dot, thêm số 0 ở đầu
    if len(amount_out_str) <= digits_before_dot:
        amount_out_str = amount_out_str.zfill(digits_before_dot + 1)

    # B3: Chèn dấu chấm
    formatted = amount_out_str[:digits_before_dot] + '.' + amount_out_str[digits_before_dot:]

    return float(formatted)

    
def sendMsg(msg = None):
    try:
        bot_token = "7481523117:AAE4sfZLIiTCg7j6knIBrMUbgnmmucYARDg"
        if msg != None:
            obj = {"chat_id": 658169017,
                "text": msg,
                "parse_mode": "HTML",
                "disable_web_page_preview": True
                }
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage", json=obj,timeout=10
            )
    except:
        pass
    
DEEP = "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP"
VRA = "0xf411903cbc70a74d22900a5de66a2dda66507255"
DOOP = "0x722294f6c97102fb0ddb5b907c8d16bdeab3f6d9"
from recheck import JupyterApiPrice, get_network_by_name, get_price_kyber, fetch_price_cetus

dex_price = float(get_price_kyber(DOOP,"BNB Smart Chain (BEP20)","Buy",3000))
print("DEX price: ", dex_price)
while True:
    try:
        # dex_price = float(fetch_price_cetus(DEEP,"buy"))
        dex_price = float(get_price_kyber(DOOP,"BNB Smart Chain (BEP20)","Sell",200000))
        # if dex_price > bybit_price:
        real_diff = round(abs(1-(dex_price/bybit_price))*100,3)
        if real_diff <= 0.8 or dex_price > bybit_price:
            sendMsg(f"DOOP: {dex_price} > {bybit_price} | {real_diff}%")
        print(real_diff)
    except Exception as e:
        print("Loi")
        print(e)
        time.sleep(30)
        continue
    time.sleep(5)


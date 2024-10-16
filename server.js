const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const cors = require('cors');
const app = express();

/*

app.listen(10000, () => {
    console.log("listening on http://localhost:10000");
})
*/
function calculatePeriod(range) {
  const now = Math.floor(Date.now() / 1000); // 當前時間的 UNIX 時間戳
  let period1, period2;

  switch (range) {
      case '1d':
          period1 = now - 86400; // 1天前
          period2 = now; // 現在
          break;
      case '5d':
          period1 = now - 5 * 86400; // 5天前
          period2 = now; // 現在
          break;
      case '1mo':
          period1 = now - 30 * 86400; // 30天前
          period2 = now; // 現在
          break;
      case '3mo':
          period1 = now - 90 * 86400; // 90天前
          period2 = now; // 現在
          break;
      case '6mo':
          period1 = now - 180 * 86400; // 180天前
          period2 = now; // 現在
          break;
      case '1y':
          period1 = now - 365 * 86400; // 365天前
          period2 = now; // 現在
          break;
      case '2y':
          period1 = now - 730 * 86400; // 730天前
          period2 = now; // 現在
          break;
      case '5y':
          period1 = now - 5 * 365 * 86400; // 5年之前
          period2 = now; // 現在
          break;
      case '10y':
          period1 = now - 10 * 365 * 86400; // 10年之前
          period2 = now; // 現在
          break;
      case 'ytd':
          const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000; // 今年的第一天
          period1 = startOfYear;
          period2 = now; // 現在
          break;
      case 'max':
          period1 = 0; // 從 Unix 紀元開始
          period2 = now; // 現在
          break;
      default:
          period1 = now - 86400; // 預設為1天前
          period2 = now; // 現在
          break;
  }

  return { period1, period2 };
}

app.use(cors());

app.get('/autocomplete', async (req, res) => {
  const query = req.query.query;
  
  try {
    const suggestions = await yahooFinance.search(query);
    let rst = [];
    for(let i = 0; i < suggestions.quotes.length; i++){
        if(suggestions.quotes[i].isYahooFinance == true)
            rst.push({
                symbol: suggestions.quotes[i].symbol,
                name: suggestions.quotes[i].shortname
            });
    }
    res.json(rst);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching stock symbols' });
  }
});

app.get('/stock', async (req, res) => {
  const symbol = req.query.symbol;
  const range = req.query.timeperiod;
  const { period1, period2 } = calculatePeriod(range);

  try {
    const result = await yahooFinance.chart(symbol, {
      interval: '3mo',
      period1: period1,
      period2: period2
    });

    if (!result || !result.meta || !result.meta.regularMarketPrice) {
      return res.status(500).json({ error: 'Error fetching stock data' });
    }

    const stockData = {
        symbol: symbol,
        name: result.meta.shortName,
        start: result.meta.currentTradingPeriod.regular.start,
        end: result.meta.currentTradingPeriod.regular.end,
        current: result.meta.regularMarketPrice,
        preClose: result.meta.chartPreviousClose,
        increasing: result.meta.regularMarketPrice - result.meta.chartPreviousClose,
        rate: (result.meta.regularMarketPrice - result.meta.chartPreviousClose) / result.meta.chartPreviousClose,
        open: result.quotes[0].open,
        high: Math.max(...result.quotes.map(q => q.high)),
        low: Math.min(...result.quotes.map(q => q.low)),
        close: result.quotes[result.quotes.length - 1].close,
        volume: result.quotes.map(q => q.volume).reduce((a, b) => a + b, 0),
    };

    res.json(stockData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching stock data' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

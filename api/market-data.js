export default async function handler(req, res) {
  const { symbol = 'XAU/USD' } = req.query;
  
  try {
    // Map symbols to Yahoo Finance spot tickers
    const ticker = symbol === 'XAU/USD' ? 'XAUUSD=X' : 'EURUSD=X';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m`;
    
    // Fetch live data directly (no API key required)
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await response.json();
    
    const meta = data.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    
    if (price) {
      return res.status(200).json({
        symbol: symbol,
        price: price,
        high: meta.regularMarketDayHigh || price,
        low: meta.regularMarketDayLow || price,
        open: meta.regularMarketOpen || price,
        previousClose: meta.chartPreviousClose || price,
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({ error: 'Invalid data format received' });
  } catch (error) {
    return res.status(500).json({ error: 'Live feed connection failed' });
  }
}

export default async function handler(req, res) {
  const { symbol = 'XAU/USD' } = req.query;
  
  try {
    // Map to public Binance tickers (No API Key Required)
    // PAXGUSDT flawlessly tracks the XAU/USD Spot Price 1:1
    const binanceSymbol = symbol === 'XAU/USD' ? 'PAXGUSDT' : 'EURUSDT';
    
    // Fetch live tick data directly from the public exchange
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
    const data = await response.json();
    
    if (data && data.price) {
      return res.status(200).json({
        symbol: symbol,
        price: parseFloat(data.price),
        timestamp: new Date().toISOString()
      });
    }
    
    // Failsafe return so the UI never crashes
    return res.status(200).json({ symbol, price: 0.00, error: 'Data parsing error' });
    
  } catch (error) {
    return res.status(200).json({ symbol, price: 0.00, error: 'Feed connection failed' });
  }
}

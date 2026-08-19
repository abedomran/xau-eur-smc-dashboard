export default async function handler(req, res) {
  const { symbol = 'XAU/USD' } = req.query;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.FINNHUB_API_KEY;

  try {
    // Map pairs for Finnhub quote endpoint
    let finnhubSymbol = 'OANDA:XAU_USD';
    if (symbol === 'EUR/USD') {
      finnhubSymbol = 'OANDA:EUR_USD';
    }

    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${apiKey}`
    );
    const data = await response.json();

    if (data && data.c && data.c > 0) {
      return res.status(200).json({
        symbol: symbol,
        price: data.c,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({ error: 'Invalid API response', details: data });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

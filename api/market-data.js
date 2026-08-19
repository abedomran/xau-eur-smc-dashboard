import fetch from 'node-fetch';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol, timeframe, type } = req.query;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'ALPHA_VANTAGE_API_KEY environment variable is missing.' });
  }

  try {
    let url = '';
    
    if (type === 'quote') {
      if (symbol === 'XAU/USD') {
        url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=${apiKey}`;
      } else {
        const [from, to] = symbol.split('/');
        url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${apiKey}`;
      }
    } 
    else {
      const intervalMap = { '1M': '1min', '5M': '5min', '15M': '15min', '1H': '60min' };
      const interval = intervalMap[timeframe] || '15min';

      if (symbol === 'XAU/USD') {
        url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=XAUUSD&interval=${interval}&outputsize=compact&apikey=${apiKey}`;
      } else {
        const [from, to] = symbol.split('/');
        url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${from}&to_symbol=${to}&interval=${interval}&outputsize=compact&apikey=${apiKey}`;
      }
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data['Note'] || data['Information']) {
      return res.status(429).json({ error: 'API_RATE_LIMIT_EXCEEDED', details: data['Note'] || data['Information'] });
    }

    if (data['Error Message']) {
      return res.status(400).json({ error: 'INVALID_REQUEST', details: data['Error Message'] });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
}
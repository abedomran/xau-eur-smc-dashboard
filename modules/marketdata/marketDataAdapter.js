export class MarketDataAdapter {
  constructor() {
    this.cache = new Map();
    this.lastFetchTimestamp = new Map();
  }

  async fetchQuote(symbol) {
    try {
      const res = await fetch(`/api/market-data?type=quote&symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();

      if (res.status === 429) {
        return { status: 'RATE_LIMIT', price: null };
      }
      if (!res.ok || data.error) {
        return { status: 'OFFLINE', price: null };
      }

      const raw = data['Realtime Currency Exchange Rate'];
      if (!raw) return { status: 'OFFLINE', price: null };

      const price = parseFloat(raw['5. Exchange Rate']);
      const lastRefreshed = new Date(raw['6. Last Refreshed'] + ' UTC').getTime();
      const ageInSeconds = (Date.now() - lastRefreshed) / 1000;

      return {
        status: ageInSeconds > 120 ? 'DELAYED' : 'LIVE',
        price,
        timestamp: lastRefreshed,
        ageInSeconds,
        source: 'Alpha Vantage'
      };
    } catch (e) {
      return { status: 'OFFLINE', price: null, error: e.message };
    }
  }

  async fetchCandles(symbol, timeframe) {
    const cacheKey = `${symbol}_${timeframe}`;
    const now = Date.now();
    
    if (this.cache.has(cacheKey) && (now - (this.lastFetchTimestamp.get(cacheKey) || 0)) < 60000) {
      return this.cache.get(cacheKey);
    }

    try {
      const res = await fetch(`/api/market-data?type=candles&symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`);
      const data = await res.json();

      if (res.status === 429) {
        return { status: 'RATE_LIMIT', candles: [] };
      }

      const seriesKey = Object.keys(data).find(k => k.includes('Time Series'));
      if (!seriesKey || !data[seriesKey]) {
        return { status: 'TOO_SLOW', candles: [] };
      }

      const rawSeries = data[seriesKey];
      const candles = Object.keys(rawSeries).map(timeStr => {
        const item = rawSeries[timeStr];
        return {
          timestamp: new Date(timeStr + ' UTC').getTime(),
          timeStr,
          open: parseFloat(item['1. open']),
          high: parseFloat(item['2. high']),
          low: parseFloat(item['3. low']),
          close: parseFloat(item['4. close']),
          volume: parseFloat(item['5. volume'] || 0)
        };
      }).sort((a, b) => a.timestamp - b.timestamp);

      const result = {
        status: 'LIVE',
        timeframe,
        candles,
        lastUpdate: candles[candles.length - 1]?.timestamp || now
      };

      this.cache.set(cacheKey, result);
      this.lastFetchTimestamp.set(cacheKey, now);

      return result;
    } catch (e) {
      return { status: 'OFFLINE', candles: [] };
    }
  }
}
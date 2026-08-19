export class StructureAnalyzer {
  static analyze(candles) {
    if (!candles || candles.length < 20) {
      return { swings: [], fvgs: [], orderBlocks: [], pdh: null, pdl: null, trend: 'NEUTRAL' };
    }

    const swings = this.findSwings(candles);
    const fvgs = this.findFVGs(candles);
    const orderBlocks = this.findOrderBlocks(candles, swings);
    const { pdh, pdl } = this.calculatePDH_PDL(candles);
    const trend = this.determineTrend(swings);

    return { swings, fvgs, orderBlocks, pdh, pdl, trend };
  }

  static findSwings(candles, window = 2) {
    const swings = [];
    for (let i = window; i < candles.length - window; i++) {
      const current = candles[i];
      let isHigh = true;
      let isLow = true;

      for (let j = i - window; j <= i + window; j++) {
        if (i === j) continue;
        if (candles[j].high >= current.high) isHigh = false;
        if (candles[j].low <= current.low) isLow = false;
      }

      if (isHigh) swings.push({ type: 'HIGH', price: current.high, index: i, timestamp: current.timestamp });
      if (isLow) swings.push({ type: 'LOW', price: current.low, index: i, timestamp: current.timestamp });
    }
    return swings;
  }

  static findFVGs(candles) {
    const fvgs = [];
    for (let i = 2; i < candles.length; i++) {
      const c1 = candles[i - 2];
      const c2 = candles[i - 1];
      const c3 = candles[i];

      if (c3.low > c1.high) {
        fvgs.push({ type: 'BULLISH', top: c3.low, bottom: c1.high, index: i - 1, timestamp: c2.timestamp });
      }
      if (c3.high < c1.low) {
        fvgs.push({ type: 'BEARISH', top: c1.low, bottom: c3.high, index: i - 1, timestamp: c2.timestamp });
      }
    }
    return fvgs.slice(-5);
  }

  static findOrderBlocks(candles, swings) {
    const obs = [];
    for (let i = 2; i < candles.length - 1; i++) {
      const current = candles[i];
      const next = candles[i + 1];

      if (current.close < current.open && (next.close - next.open) > (current.high - current.low) * 1.2) {
        obs.push({ type: 'BULLISH', top: current.high, bottom: current.low, timestamp: current.timestamp });
      }
      if (current.close > current.open && (current.open - next.close) > (current.high - current.low) * 1.2) {
        obs.push({ type: 'BEARISH', top: current.high, bottom: current.low, timestamp: current.timestamp });
      }
    }
    return obs.slice(-3);
  }

  static calculatePDH_PDL(candles) {
    if (candles.length < 24) return { pdh: null, pdl: null };
    const slice = candles.slice(-48, -24);
    const highs = slice.map(c => c.high);
    const lows = slice.map(c => c.low);
    return {
      pdh: Math.max(...highs),
      pdl: Math.min(...lows)
    };
  }

  static determineTrend(swings) {
    const highs = swings.filter(s => s.type === 'HIGH').slice(-2);
    const lows = swings.filter(s => s.type === 'LOW').slice(-2);

    if (highs.length < 2 || lows.length < 2) return 'NEUTRAL';

    if (highs[1].price > highs[0].price && lows[1].price > lows[0].price) return 'BULLISH';
    if (highs[1].price < highs[0].price && lows[1].price < lows[0].price) return 'BEARISH';
    return 'NEUTRAL';
  }
}
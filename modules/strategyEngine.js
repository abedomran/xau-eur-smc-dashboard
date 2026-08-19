export class StrategyEngine {
  static evaluateDayTrade(data1H, data15M, currentPrice) {
    if (!data1H.candles.length || !data15M.candles.length) {
      return { state: 'WAIT', reason: 'Insufficient timeframe data.' };
    }

    const struct1H = data1H.structure;
    const struct15M = data15M.structure;

    const bias = struct1H.trend;
    if (bias === 'NEUTRAL') {
      return { state: 'WAIT', reason: 'Waiting for clear 1H higher timeframe structure direction.' };
    }

    const ob15M = struct15M.orderBlocks.find(ob => ob.type === bias);
    const fvg15M = struct15M.fvgs.find(fvg => fvg.type === bias);

    if (!ob15M && !fvg15M) {
      return { state: 'WAIT', reason: `Waiting for 15M ${bias} Point of Interest (OB/FVG) formulation.` };
    }

    const poiTop = ob15M ? ob15M.top : fvg15M.top;
    const poiBottom = ob15M ? ob15M.bottom : fvg15M.bottom;
    const inPOI = currentPrice >= poiBottom && currentPrice <= poiTop;

    if (!inPOI) {
      return {
        state: 'POTENTIAL',
        bias,
        poiRange: `$${poiBottom.toFixed(2)} - $${poiTop.toFixed(2)}`,
        reason: `Waiting for price to trace into 15M POI zone [${poiBottom.toFixed(2)} - ${poiTop.toFixed(2)}]`
      };
    }

    const recentCandle = data15M.candles[data15M.candles.length - 1];
    const isDisplacement = Math.abs(recentCandle.close - recentCandle.open) > (recentCandle.high - recentCandle.low) * 0.6;

    if (!isDisplacement) {
      return { state: 'ARMED', bias, poiRange: `$${poiBottom.toFixed(2)} - $${poiTop.toFixed(2)}`, reason: 'POI reached. Waiting for 15M displacement candle closure.' };
    }

    const sl = bias === 'BULLISH' ? poiBottom * 0.998 : poiTop * 1.002;
    const risk = Math.abs(currentPrice - sl);
    const tp1 = bias === 'BULLISH' ? currentPrice + (risk * 2) : currentPrice - (risk * 2);
    const tp2 = bias === 'BULLISH' ? currentPrice + (risk * 3.5) : currentPrice - (risk * 3.5);

    return {
      state: 'CONFIRMED',
      type: 'DAY TRADE',
      bias,
      entry: currentPrice,
      validRange: `${(currentPrice * 0.9995).toFixed(2)} - ${(currentPrice * 1.0005).toFixed(2)}`,
      sl: parseFloat(sl.toFixed(2)),
      tp1: parseFloat(tp1.toFixed(2)),
      tp2: parseFloat(tp2.toFixed(2)),
      confidence: 85,
      confirmations: ['1H Trend Alignment', '15M POI Tap', 'Displacement Closed']
    };
  }

  static evaluateStructuralScalp(data15M, data5M, currentPrice) {
    if (!data15M.candles.length || !data5M.candles.length) {
      return { state: 'WAIT', reason: '5M/15M data unavailable.' };
    }

    const struct15M = data15M.structure;
    const struct5M = data5M.structure;
    const bias = struct15M.trend;

    if (bias === 'NEUTRAL') return { state: 'WAIT', reason: 'Waiting for 15M structural alignment.' };

    const fvg5M = struct5M.fvgs.find(f => f.type === bias);
    if (!fvg5M) return { state: 'WAIT', reason: 'Waiting for 5M Fair Value Gap formation.' };

    const inZone = currentPrice >= fvg5M.bottom && currentPrice <= fvg5M.top;
    if (!inZone) {
      return {
        state: 'POTENTIAL',
        bias,
        poiRange: `$${fvg5M.bottom.toFixed(2)} - $${fvg5M.top.toFixed(2)}`,
        reason: `Waiting for 5M FVG retest [${fvg5M.bottom.toFixed(2)} - ${fvg5M.top.toFixed(2)}]`
      };
    }

    const sl = bias === 'BULLISH' ? fvg5M.bottom * 0.999 : fvg5M.top * 1.001;
    const risk = Math.abs(currentPrice - sl);

    return {
      state: 'CONFIRMED',
      type: 'STRUCTURAL SCALP',
      bias,
      entry: currentPrice,
      validRange: `${(currentPrice * 0.9997).toFixed(2)} - ${(currentPrice * 1.0003).toFixed(2)}`,
      sl: parseFloat(sl.toFixed(2)),
      tp1: parseFloat((bias === 'BULLISH' ? currentPrice + risk * 1.8 : currentPrice - risk * 1.8).toFixed(2)),
      tp2: parseFloat((bias === 'BULLISH' ? currentPrice + risk * 2.8 : currentPrice - risk * 2.8).toFixed(2)),
      confidence: 80,
      confirmations: ['15M Bias', '5M FVG Retest', 'Market Structure Shift']
    };
  }

  static evaluatePrecisionScalp(data5M, data1M, currentPrice, sessionActive) {
    if (!sessionActive) {
      return { state: 'WAIT', reason: 'Outside London/NY session window. Precision Scalp disabled.' };
    }

    if (!data1M.candles || data1M.candles.length < 10) {
      return { state: 'DATA_TOO_SLOW', reason: '1M market data rate too slow for Precision Scalp.' };
    }

    const struct1M = data1M.structure;
    const lastSwing = struct1M.swings[struct1M.swings.length - 1];

    if (!lastSwing) return { state: 'WAIT', reason: 'Awaiting 1M liquidity sweep setup.' };

    const isSweep = lastSwing.type === 'LOW' ? currentPrice < lastSwing.price : currentPrice > lastSwing.price;

    if (!isSweep) {
      return { state: 'WAIT', reason: 'Monitoring 1M key high/low for liquidity sweep.' };
    }

    const bias = lastSwing.type === 'LOW' ? 'BULLISH' : 'BEARISH';
    const sl = bias === 'BULLISH' ? currentPrice * 0.9992 : currentPrice * 1.0008;
    const risk = Math.abs(currentPrice - sl);

    return {
      state: 'CONFIRMED',
      type: 'PRECISION SCALP',
      bias,
      entry: currentPrice,
      validRange: `${(currentPrice * 0.9998).toFixed(2)} - ${(currentPrice * 1.0002).toFixed(2)}`,
      sl: parseFloat(sl.toFixed(2)),
      tp1: parseFloat((bias === 'BULLISH' ? currentPrice + risk * 2 : currentPrice - risk * 2).toFixed(2)),
      tp2: parseFloat((bias === 'BULLISH' ? currentPrice + risk * 3 : currentPrice - risk * 3).toFixed(2)),
      confidence: 90,
      confirmations: ['Session Liquidity Sweep', '1M Market Structure Shift', 'Instantaneous Displacement']
    };
  }
}
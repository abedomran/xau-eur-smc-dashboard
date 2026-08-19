// modules/metrics.js - Handles candle processing and market metrics
export function calculateMetrics(candles) {
    if (!candles || candles.length < 2) return null;
    const latest = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    
    return {
        price: latest.close,
        isBullishDisplacement: latest.close > previous.high,
        isBearishDisplacement: latest.close < previous.low,
        timestamp: Date.now()
    };
}

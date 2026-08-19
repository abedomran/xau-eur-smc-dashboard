import { MarketDataAdapter } from './modules/marketData/marketDataAdapter.js';
import { StructureAnalyzer } from './modules/structure.js';
import { StrategyEngine } from './modules/strategyEngine.js';
import { SignalEngine } from './modules/signalEngine.js';
import { SessionManager } from './modules/sessions.js';
import { PerformanceTracker } from './modules/performance.js';

let currentSymbol = 'XAU/USD';
const adapter = new MarketDataAdapter();
const signalEngine = new SignalEngine();
const perfTracker = new PerformanceTracker();

window.switchSymbol = (sym) => {
  currentSymbol = sym;
  document.getElementById('btn-xau').classList.toggle('active', sym === 'XAU/USD');
  document.getElementById('btn-eur').classList.toggle('active', sym === 'EUR/USD');
  initTradingViewWidget();
  runAnalysisCycle();
};

function initTradingViewWidget() {
  const container = document.getElementById('tradingview_chart');
  container.innerHTML = '';
  const tvSymbol = currentSymbol === 'XAU/USD' ? 'OANDA:XAUUSD' : 'FX:EURUSD';

  new TradingView.widget({
    "autosize": true,
    "symbol": tvSymbol,
    "interval": "15",
    "timezone": "Asia/Beirut",
    "theme": "dark",
    "style": "1",
    "locale": "en",
    "toolbar_bg": "#f1f3f6",
    "enable_publishing": false,
    "hide_side_toolbar": false,
    "container_id": "tradingview_chart"
  });
}

async function runAnalysisCycle() {
  const session = SessionManager.getSessionStatus();
  document.getElementById('beirut-clock').innerText = session.timeStr;
  document.getElementById('session-badge').innerText = session.activeSession;

  const quote = await adapter.fetchQuote(currentSymbol);
  const badgeEl = document.getElementById('data-status-badge');
  const priceEl = document.getElementById('live-price');

  if (quote.status === 'OFFLINE' || !quote.price) {
    badgeEl.className = 'badge offline';
    badgeEl.innerText = '?? DATA OFFLINE';
    priceEl.innerText = '0.00';
    renderHardLock('DATA OFFLINE');
    return;
  }

  if (quote.status === 'RATE_LIMIT') {
    badgeEl.className = 'badge offline';
    badgeEl.innerText = '?? API LIMIT REACHED';
    renderHardLock('API LIMIT REACHED');
    return;
  }

  badgeEl.className = 'badge';
  badgeEl.style.background = '#0a3822';
  badgeEl.style.color = '#0ecb81';
  badgeEl.innerText = `?? ${quote.status}`;
  priceEl.innerText = quote.price.toFixed(currentSymbol === 'XAU/USD' ? 2 : 4);

  const c1H = await adapter.fetchCandles(currentSymbol, '1H');
  const c15M = await adapter.fetchCandles(currentSymbol, '15M');
  const c5M = await adapter.fetchCandles(currentSymbol, '5M');
  const c1M = await adapter.fetchCandles(currentSymbol, '1M');

  const struct1H = StructureAnalyzer.analyze(c1H.candles);
  const struct15M = StructureAnalyzer.analyze(c15M.candles);
  const struct5M = StructureAnalyzer.analyze(c5M.candles);
  const struct1M = StructureAnalyzer.analyze(c1M.candles);

  const dayEval = StrategyEngine.evaluateDayTrade(
    { candles: c1H.candles, structure: struct1H },
    { candles: c15M.candles, structure: struct15M },
    quote.price
  );

  const structEval = StrategyEngine.evaluateStructuralScalp(
    { candles: c15M.candles, structure: struct15M },
    { candles: c5M.candles, structure: struct5M },
    quote.price
  );

  const precEval = StrategyEngine.evaluatePrecisionScalp(
    { candles: c5M.candles, structure: struct5M },
    { candles: c1M.candles, structure: struct1M },
    quote.price,
    session.isPrecisionEligible
  );

  updateStrategyCard('card-day-trade', 'DAY TRADE', dayEval);
  updateStrategyCard('card-structural-scalp', 'STRUCTURAL SCALP', structEval);
  updateStrategyCard('card-precision-scalp', 'PRECISION SCALP', precEval);

  signalEngine.processEvaluation(currentSymbol, 'DAY TRADE', dayEval, session.timeStr);
  signalEngine.processEvaluation(currentSymbol, 'STRUCTURAL SCALP', structEval, session.timeStr);
  signalEngine.processEvaluation(currentSymbol, 'PRECISION SCALP', precEval, session.timeStr);

  updateMetricsUI();
}

function updateStrategyCard(cardId, title, evalData) {
  const card = document.getElementById(cardId);
  const statusEl = card.querySelector('.status-indicator');
  const reasonEl = card.querySelector('.strategy-reason');

  statusEl.className = `status-indicator ${evalData.state.toLowerCase()}`;
  statusEl.innerText = evalData.state;
  reasonEl.innerText = evalData.reason || `${evalData.type} state active.`;

  if (evalData.state === 'CONFIRMED') {
    renderConfirmedCard(evalData);
  }
}

function renderConfirmedCard(setup) {
  const anchor = document.getElementById('confirmed-signal-anchor');
  anchor.innerHTML = `
    <div class="confirmed-card">
      <h3>?? CONFIRMED SIGNAL: ${setup.type}</h3>
      <p><strong>Action:</strong> ${setup.bias === 'BULLISH' ? '?? BUY NOW' : '?? SELL NOW'}</p>
      <p><strong>Entry:</strong> $${setup.entry}</p>
      <p><strong>SL:</strong> $${setup.sl} | <strong>TP1:</strong> $${setup.tp1} | <strong>TP2:</strong> $${setup.tp2}</p>
      <p><strong>Valid Range:</strong> $${setup.validRange}</p>
      <p><strong>Confidence:</strong> ${setup.confidence}/100</p>
    </div>
  `;
}

function renderHardLock(reason) {
  ['card-day-trade', 'card-structural-scalp', 'card-precision-scalp'].forEach(id => {
    const card = document.getElementById(id);
    const status = card.querySelector('.status-indicator');
    const reasonEl = card.querySelector('.strategy-reason');
    status.className = 'status-indicator wait';
    status.innerText = 'WAIT';
    reasonEl.innerText = `SIGNAL ENGINE LOCKED: ${reason}`;
  });
}

function updateMetricsUI() {
  const metrics = perfTracker.getMetrics();
  document.getElementById('m-total').innerText = metrics.totalSignals;
  document.getElementById('m-winrate').innerText = metrics.winRate;
  document.getElementById('m-xau').innerText = metrics.bySymbol['XAU/USD'];
  document.getElementById('m-eur').innerText = metrics.bySymbol['EUR/USD'];
}

window.addEventListener('DOMContentLoaded', () => {
  initTradingViewWidget();
  runAnalysisCycle();
  setInterval(runAnalysisCycle, 30000);
});
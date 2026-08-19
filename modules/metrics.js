export class PerformanceTracker {
  constructor() {
    this.journalKey = 'xau_eur_signal_journal';
  }

  getJournal() {
    return JSON.parse(localStorage.getItem(this.journalKey) || '[]');
  }

  recordSignal(setup) {
    const journal = this.getJournal();
    if (!journal.find(item => item.setupId === setup.setupId)) {
      journal.push({
        ...setup,
        status: 'OPEN',
        result: 'PENDING',
        rMultiple: 0
      });
      localStorage.setItem(this.journalKey, JSON.stringify(journal));
    }
  }

  getMetrics() {
    const journal = this.getJournal();
    const confirmed = journal.filter(j => j.state === 'CONFIRMED');

    const total = confirmed.length;
    const wins = confirmed.filter(j => j.result === 'TP1' || j.result === 'TP2').length;
    const losses = confirmed.filter(j => j.result === 'SL').length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

    return {
      totalSignals: total,
      wins,
      losses,
      winRate: `${winRate}%`,
      bySymbol: {
        'XAU/USD': confirmed.filter(j => j.symbol === 'XAU/USD').length,
        'EUR/USD': confirmed.filter(j => j.symbol === 'EUR/USD').length
      },
      byStrategy: {
        'DAY TRADE': confirmed.filter(j => j.strategyType === 'DAY TRADE').length,
        'STRUCTURAL SCALP': confirmed.filter(j => j.strategyType === 'STRUCTURAL SCALP').length,
        'PRECISION SCALP': confirmed.filter(j => j.strategyType === 'PRECISION SCALP').length
      }
    };
  }
}

export class SignalEngine {
  constructor() {
    this.activeSetups = new Map();
  }

  generateSetupId(symbol, strategyType) {
    const codeMap = { 'DAY TRADE': 'DT', 'STRUCTURAL SCALP': 'SS', 'PRECISION SCALP': 'PS' };
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanSym = symbol.replace('/', '');
    const code = codeMap[strategyType] || 'ST';
    return `${cleanSym}-${code}-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
  }

  processEvaluation(symbol, strategyType, evalResult, currentTimeStr) {
    const key = `${symbol}_${strategyType}`;
    const existing = this.activeSetups.get(key);

    if (evalResult.state === 'WAIT') {
      if (existing && existing.state === 'POTENTIAL') {
        const invSetup = { ...existing, state: 'INVALIDATED', invalidateReason: evalResult.reason };
        this.activeSetups.delete(key);
        this.dispatchTelegramNotification('INVALIDATED', invSetup, currentTimeStr);
        return { action: 'DISPATCH_INVALIDATED', setup: invSetup };
      }
      return { action: 'NONE', evalResult };
    }

    if (evalResult.state === 'POTENTIAL') {
      if (!existing) {
        const setupId = this.generateSetupId(symbol, strategyType);
        const setup = { ...evalResult, setupId, symbol, strategyType, createdAt: currentTimeStr };
        this.activeSetups.set(key, setup);
        this.dispatchTelegramNotification('POTENTIAL', setup, currentTimeStr);
        return { action: 'DISPATCH_POTENTIAL', setup };
      }
      return { action: 'UPDATED_POTENTIAL', setup: existing };
    }

    if (evalResult.state === 'CONFIRMED') {
      if (!existing || existing.state !== 'CONFIRMED') {
        const setupId = existing ? existing.setupId : this.generateSetupId(symbol, strategyType);
        const setup = { ...evalResult, setupId, symbol, strategyType, confirmedAt: currentTimeStr };
        this.activeSetups.set(key, setup);
        this.dispatchTelegramNotification('CONFIRMED', setup, currentTimeStr);
        return { action: 'DISPATCH_CONFIRMED', setup };
      }
    }

    return { action: 'NONE', evalResult };
  }

  async dispatchTelegramNotification(type, setup, timeStr) {
    let msg = '';

    if (type === 'POTENTIAL') {
      msg = `?? POTENTIAL\n\n${setup.symbol}\n\n? ${setup.strategyType}\n${setup.bias === 'BULLISH' ? '?? BUY BIAS' : '?? SELL BIAS'}\n\nWAITING FOR:\n${setup.poiRange}\n\nCONFIRMATION:\n${setup.reason}\n\nTIME:\n${timeStr}`;
    } else if (type === 'CONFIRMED') {
      msg = `?? CONFIRMED\n\n${setup.symbol}\n\n${setup.bias === 'BULLISH' ? '?? BUY NOW' : '?? SELL NOW'}\n\nENTRY:\n$${setup.entry}\n\nSL:\n$${setup.sl}\n\nTP1:\n$${setup.tp1}\n\nTP2:\n$${setup.tp2}\n\nTYPE:\n${setup.strategyType}\n\nSTRATEGY:\nSMC + ICT\n\nCONFIDENCE:\n${setup.confidence}/100\n\nCONFIRMATION:\n${setup.confirmations.map(c => `? ${c}`).join('\n')}\n\nVALID ENTRY RANGE:\n$${setup.validRange}\n\nTIME:\n${timeStr}`;
    } else if (type === 'INVALIDATED') {
      msg = `?? INVALIDATED\n\n${setup.symbol}\n\n? ${setup.strategyType}\n${setup.bias === 'BULLISH' ? '?? BUY BIAS' : '?? SELL BIAS'}\n\nREASON:\n${setup.invalidateReason}\n\nNO TRADE\n\nTIME:\n${timeStr}`;
    }

    if (!msg) return;

    try {
      await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
    } catch (e) {
      console.error('Telegram dispatch error:', e);
    }
  }
}
// app.js - Main Active Controller
import { calculateMetrics } from './modules/metrics.js';

const SCAN_INTERVAL = 30000; // Scan every 30 seconds

async function initActiveScanner() {
    console.log("[SYSTEM] Active SMC/ICT trading scanner started.");
    
    // Run an initial scan immediately
    runEngineScan();

    // Set up a continuous loop to keep it active
    setInterval(runEngineScan, SCAN_INTERVAL);
}

async function runEngineScan() {
    try {
        // Since you are using TradingView for charts, you can fetch live candle data 
        // or tie this into your serverless API routes if you have custom endpoints.
        console.log("[SCANNER] Evaluating market structure and liquidity pools...");

        // Example state transition for your Day Trade engine card
        updateEngineUI("card-day-trade", "WAIT", "Scanning 15M FVG zones...");
        
    } catch (error) {
        console.error("[SCANNER] Error during execution scan:", error);
    }
}

function updateEngineUI(cardId, state, reason) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    const badge = card.querySelector('.status-indicator') || card.querySelector('.badge');
    const reasonText = card.querySelector('.strategy-reason') || card.querySelector('p');
    
    if (badge) {
        badge.innerText = state;
        badge.className = `status-indicator ${state.toLowerCase()}`;
    }
    if (reasonText) {
        reasonText.innerText = reason;
    }
}

// Kick off the script when the DOM loads
window.addEventListener('DOMContentLoaded', initActiveScanner);

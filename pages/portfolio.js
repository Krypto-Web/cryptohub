/* ===== PORTFOLIO TRACKER — portfolio.js ===== */

// ---- CONFIG ----
const COINGECKO = 'https://api.coingecko.com/api/v3';
const COIN_IDS_PORT = 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot,chainlink,avalanche-2';
const REFRESH_MS = 30000;

// ---- COIN META ----
const META = {
  bitcoin:       { sym: 'BTC', color: '#f7931a', init: '₿' },
  ethereum:      { sym: 'ETH', color: '#627eea', init: 'Ξ' },
  solana:        { sym: 'SOL', color: '#9945ff', init: 'S' },
  binancecoin:   { sym: 'BNB', color: '#f0b429', init: 'B' },
  ripple:        { sym: 'XRP', color: '#00aae4', init: 'X' },
  cardano:       { sym: 'ADA', color: '#0033ad', init: 'A' },
  dogecoin:      { sym: 'DOGE', color: '#c2a633', init: 'D' },
  polkadot:      { sym: 'DOT', color: '#e6007a', init: 'P' },
  chainlink:     { sym: 'LINK', color: '#2a5ada', init: 'L' },
  'avalanche-2': { sym: 'AVAX', color: '#e84142', init: 'A' },
};

// ALLOC COLORS
const ALLOC_COLORS = ['#f0b429','#3b82f6','#22c55e','#9945ff','#ef4444','#00aae4','#c2a633','#e6007a','#2a5ada','#e84142'];

// ---- STATE ----
let livePrices = {}; // { coinId: { price, change24h } }
let portfolio = JSON.parse(localStorage.getItem('cryptohub_portfolio') || '[]');
// portfolio item: { id, name, amount, buyPrice, addedAt }
let coinToDelete = null;
let refreshTimer = REFRESH_MS / 1000;
let countdownInterval = null;

// ---- FETCH LIVE PRICES ----
async function fetchLivePrices() {
  try {
    const url = `${COINGECKO}/coins/markets?vs_currency=usd&ids=${COIN_IDS_PORT}&order=market_cap_desc&per_page=10&page=1&sparkline=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    data.forEach(c => {
      livePrices[c.id] = {
        price: c.current_price,
        change24h: c.price_change_percentage_24h,
        name: c.name,
      };
    });
  } catch {
    // fallback demo prices
    const demo = {
      bitcoin: { price: 96420, change24h: 2.4 },
      ethereum: { price: 3812, change24h: 3.1 },
      solana: { price: 184, change24h: -1.2 },
      binancecoin: { price: 612, change24h: 0.8 },
      ripple: { price: 2.41, change24h: 4.7 },
      cardano: { price: 0.72, change24h: 1.3 },
      dogecoin: { price: 0.183, change24h: -0.5 },
      polkadot: { price: 9.84, change24h: 2.1 },
      chainlink: { price: 14.62, change24h: 3.8 },
      'avalanche-2': { price: 38.4, change24h: -2.1 },
    };
    Object.assign(livePrices, demo);
  }

  renderAll();
  resetCountdown();
}

// ---- RENDER ALL ----
function renderAll() {
  renderSummary();
  renderHoldings();
  renderAllocation();
  updateTimestamp();
}

// ---- SUMMARY CARDS ----
function renderSummary() {
  let totalValue = 0, totalInvested = 0;
  let bestCoin = null, bestPct = -Infinity;

  portfolio.forEach(item => {
    const live = livePrices[item.id];
    if (!live) return;
    const value = item.amount * live.price;
    const invested = item.amount * item.buyPrice;
    totalValue += value;
    totalInvested += invested;
    const pct = ((value - invested) / invested) * 100;
    if (pct > bestPct) { bestPct = pct; bestCoin = item; }
  });

  const pnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
  const isPos = pnl >= 0;

  setText('total-value', '$' + fmt(totalValue));
  setText('total-invested', 'Invested: $' + fmt(totalInvested));
  const pnlEl = document.getElementById('total-pnl');
  pnlEl.textContent = (isPos ? '+' : '') + '$' + fmt(Math.abs(pnl));
  pnlEl.className = 'sc-val ' + (isPos ? 'positive' : 'negative');
  setText('total-pnl-pct', (isPos ? '+' : '') + pnlPct.toFixed(2) + '%');

  if (bestCoin && livePrices[bestCoin.id]) {
    const meta = META[bestCoin.id];
    setText('best-coin', meta ? meta.sym : bestCoin.id.toUpperCase());
    const bv = bestCoin.amount * livePrices[bestCoin.id].price;
    const bi = bestCoin.amount * bestCoin.buyPrice;
    const bp = ((bv - bi) / bi) * 100;
    setText('best-pct', (bp >= 0 ? '+' : '') + bp.toFixed(2) + '%');
    document.getElementById('best-pct').style.color = bp >= 0 ? 'var(--green)' : 'var(--red)';
  } else {
    setText('best-coin', '—');
    setText('best-pct', 'No holdings yet');
  }

  setText('holdings-count', portfolio.length + (portfolio.length === 1 ? ' coin' : ' coins'));
}

// ---- HOLDINGS TABLE ----
function renderHoldings() {
  const empty = document.getElementById('empty-state');
  const wrap = document.getElementById('holdings-table-wrap');
  const tbody = document.getElementById('holdings-tbody');

  if (portfolio.length === 0) {
    empty.style.display = 'flex';
    wrap.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  wrap.style.display = 'block';

  tbody.innerHTML = portfolio.map((item, idx) => {
    const meta = META[item.id] || { sym: item.id.toUpperCase(), color: '#888', init: '?' };
    const live = livePrices[item.id];
    const currentPrice = live ? live.price : item.buyPrice;
    const change24h = live ? live.change24h : 0;
    const currentValue = item.amount * currentPrice;
    const invested = item.amount * item.buyPrice;
    const pnl = currentValue - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    const isPos = pnl >= 0;
    const is24Up = change24h >= 0;

    return `<tr class="fade-in" style="animation-delay:${idx * 0.05}s">
      <td>
        <div class="coin-cell">
          <div class="coin-icon" style="background:${meta.color}22;color:${meta.color}">${meta.init}</div>
          <div>
            <div class="coin-name">${item.name}</div>
            <div class="coin-sym">${meta.sym}</div>
          </div>
        </div>
      </td>
      <td class="mono-val">${fmtAmount(item.amount)} <span style="color:var(--muted);font-size:11px">${meta.sym}</span></td>
      <td class="mono-val">$${fmt(item.buyPrice)}</td>
      <td class="mono-val">$${fmt(currentPrice)}</td>
      <td class="mono-val">$${fmt(currentValue)}</td>
      <td>
        <div class="${isPos ? 'pnl-positive' : 'pnl-negative'}">
          ${isPos ? '+' : ''}$${fmt(Math.abs(pnl))}
        </div>
        <div style="font-size:11px;color:${isPos ? 'var(--green)' : 'var(--red)'}">
          ${isPos ? '+' : ''}${pnlPct.toFixed(2)}%
        </div>
      </td>
      <td><span class="chg-pill ${is24Up ? 'up' : 'down'}">${is24Up ? '+' : ''}${change24h.toFixed(2)}%</span></td>
      <td>
        <button class="del-btn" onclick="openDeleteModal(${idx})" title="Remove">
          <i class="ti ti-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

// ---- ALLOCATION BAR ----
function renderAllocation() {
  const section = document.getElementById('alloc-section');
  const bar = document.getElementById('alloc-bar');
  const legend = document.getElementById('alloc-legend');

  if (portfolio.length === 0) { section.style.display = 'none'; return; }

  let totalValue = 0;
  const vals = portfolio.map(item => {
    const price = livePrices[item.id]?.price || item.buyPrice;
    const val = item.amount * price;
    totalValue += val;
    return { item, val };
  });

  if (totalValue === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  bar.innerHTML = vals.map((v, i) => {
    const pct = (v.val / totalValue) * 100;
    return `<div class="alloc-segment" style="width:${pct}%;background:${ALLOC_COLORS[i % ALLOC_COLORS.length]}" title="${META[v.item.id]?.sym || v.item.id}: ${pct.toFixed(1)}%"></div>`;
  }).join('');

  legend.innerHTML = vals.map((v, i) => {
    const pct = (v.val / totalValue) * 100;
    const sym = META[v.item.id]?.sym || v.item.id.toUpperCase();
    return `<div class="alloc-leg-item">
      <div class="alloc-dot" style="background:${ALLOC_COLORS[i % ALLOC_COLORS.length]}"></div>
      ${sym} <span style="color:var(--muted)">${pct.toFixed(1)}%</span>
    </div>`;
  }).join('');
}

// ---- ADD COIN MODAL ----
function openModal() {
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('coin-select').value = '';
  document.getElementById('coin-amount').value = '';
  document.getElementById('coin-buy-price').value = '';
  document.getElementById('modal-preview').style.display = 'none';
  document.getElementById('modal-error').textContent = '';
}
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function updatePreview() {
  const coinId = document.getElementById('coin-select').value;
  const amount = parseFloat(document.getElementById('coin-amount').value);
  const buyPrice = parseFloat(document.getElementById('coin-buy-price').value);
  const preview = document.getElementById('modal-preview');

  if (!coinId || !amount || !buyPrice || amount <= 0 || buyPrice <= 0) {
    preview.style.display = 'none';
    return;
  }

  const livePrice = livePrices[coinId]?.price || buyPrice;
  const invested = amount * buyPrice;
  const currentVal = amount * livePrice;
  const pnl = currentVal - invested;
  const isPos = pnl >= 0;

  preview.style.display = 'flex';
  setText('prev-invested', '$' + fmt(invested));
  setText('prev-value', '$' + fmt(currentVal));
  const pnlEl = document.getElementById('prev-pnl');
  pnlEl.textContent = (isPos ? '+' : '') + '$' + fmt(Math.abs(pnl)) + ' (' + (isPos ? '+' : '') + ((pnl / invested) * 100).toFixed(2) + '%)';
  pnlEl.style.color = isPos ? 'var(--green)' : 'var(--red)';
}

function confirmAdd() {
  const coinId = document.getElementById('coin-select').value;
  const amount = parseFloat(document.getElementById('coin-amount').value);
  const buyPrice = parseFloat(document.getElementById('coin-buy-price').value);
  const errEl = document.getElementById('modal-error');

  if (!coinId) { errEl.textContent = 'Please select a coin.'; return; }
  if (!amount || amount <= 0) { errEl.textContent = 'Enter a valid amount.'; return; }
  if (!buyPrice || buyPrice <= 0) { errEl.textContent = 'Enter a valid buy price.'; return; }

  errEl.textContent = '';

  // Check if already in portfolio — if so, merge
  const existing = portfolio.findIndex(p => p.id === coinId);
  if (existing >= 0) {
    const old = portfolio[existing];
    const totalCost = (old.amount * old.buyPrice) + (amount * buyPrice);
    const totalAmount = old.amount + amount;
    old.buyPrice = totalCost / totalAmount; // weighted avg
    old.amount = totalAmount;
  } else {
    const coinName = document.getElementById('coin-select').options[document.getElementById('coin-select').selectedIndex].text.split(' (')[0];
    portfolio.push({ id: coinId, name: coinName, amount, buyPrice, addedAt: Date.now() });
  }

  savePortfolio();
  renderAll();
  closeModal();
}

// ---- DELETE MODAL ----
function openDeleteModal(idx) {
  coinToDelete = idx;
  const item = portfolio[idx];
  const meta = META[item.id];
  document.getElementById('delete-coin-name').textContent = item.name + (meta ? ` (${meta.sym})` : '');
  document.getElementById('delete-overlay').style.display = 'flex';
}
function closeDeleteModal() {
  document.getElementById('delete-overlay').style.display = 'none';
  coinToDelete = null;
}
function confirmDelete() {
  if (coinToDelete === null) return;
  portfolio.splice(coinToDelete, 1);
  savePortfolio();
  renderAll();
  closeDeleteModal();
}

// ---- SAVE ----
function savePortfolio() {
  localStorage.setItem('cryptohub_portfolio', JSON.stringify(portfolio));
}

// ---- COUNTDOWN ----
function resetCountdown() {
  refreshTimer = REFRESH_MS / 1000;
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    refreshTimer--;
    const el = document.getElementById('refresh-countdown');
    if (el) el.textContent = `Next update in ${refreshTimer}s`;
    if (refreshTimer <= 0) clearInterval(countdownInterval);
  }, 1000);
}

// ---- UTILS ----
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function fmt(n) {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
function fmtAmount(n) {
  if (n >= 1) return parseFloat(n.toFixed(4)).toString();
  return n.toFixed(6);
}
function updateTimestamp() {
  const el = document.getElementById('last-updated-port');
  if (el) el.textContent = 'Updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ---- TICKER (reuse from parent app.js context if available, else basic) ----
function renderTickerPortfolio() {
  const track = document.getElementById('ticker');
  if (!track) return;
  const entries = Object.entries(livePrices);
  if (entries.length === 0) return;
  const doubled = [...entries, ...entries];
  track.innerHTML = doubled.map(([id, d]) => {
    const meta = META[id] || { sym: id.toUpperCase() };
    const up = d.change24h >= 0;
    return `<div class="ticker-item">
      <span class="ticker-sym">${meta.sym}</span>
      <span class="ticker-price">$${fmtPrice(d.price)}</span>
      <span class="ticker-chg ${up ? 'up' : 'down'}">${up ? '+' : ''}${d.change24h.toFixed(2)}%</span>
    </div>`;
  }).join('');
}
function fmtPrice(n) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {

  // Modal triggers
  document.getElementById('open-modal-btn').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmAdd);
  document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Live preview in modal
  ['coin-select', 'coin-amount', 'coin-buy-price'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });

  // Nav tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Initial load
  fetchLivePrices().then(() => renderTickerPortfolio());

  // Auto refresh
  setInterval(() => {
    fetchLivePrices().then(() => renderTickerPortfolio());
  }, REFRESH_MS);
});

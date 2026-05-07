/* ===== CRYPTOHUB — app.js ===== */

// ---- CONFIG ----
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const COIN_IDS = 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot,chainlink,avalanche-2';
const REFRESH_INTERVAL = 30000; // 30s

// ---- STATE ----
let coinsData = [];
let watchlist = JSON.parse(localStorage.getItem('cryptohub_watchlist') || '[]');
let currentFilter = 'all';
let chatMessages = [];
let onlineCount = 138 + Math.floor(Math.random() * 20);

// ---- COIN META (colors, symbols) ----
const coinMeta = {
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

// ---- CALENDAR DATA ----
const calendarEvents = [
  { impact: 'high', time: '09:30', coin: 'BTC', event: 'ETF Inflow Weekly Report', actual: '$620M', live: true },
  { impact: 'high', time: '14:00', coin: 'ETH', event: 'Pectra Upgrade Confirmation', actual: 'Confirmed', positive: true },
  { impact: 'med',  time: '16:30', coin: 'SOL', event: 'Network Upgrade Vote', actual: '—' },
  { impact: 'low',  time: '18:00', coin: 'ADA', event: 'Governance Vote Closes', actual: '—' },
  { impact: 'high', time: '20:00', coin: 'BTC', event: 'US CPI Data Release', actual: '—' },
  { impact: 'med',  time: '21:00', coin: 'LINK', event: 'Chainlink Oracle Report', actual: '—' },
];

// ---- SEED CHAT ----
const seedMessages = [
  { name: 'CryptoKemi', init: 'CK', color: '#f0b429', badge: 'pro', text: 'BTC looking strong above 96k — could test <span class="hl">$100k</span> this week 👀', time: '09:41' },
  { name: 'BlockBoy_NG', init: 'BB', color: '#3b82f6', badge: 'mod', text: 'ETH Pectra upgrade is huge for gas fees. Finally some good news for altcoin holders.', time: '09:38' },
  { name: 'SatoshiFan', init: 'SF', color: '#22c55e', badge: '', text: 'Anyone watching <span class="hl">XRP</span>? Up <span class="hl-green">+4.7%</span> today already. Feels bullish.', time: '09:35' },
  { name: 'NewbieNaira', init: 'NN', color: '#9945ff', badge: '', text: 'Quick question — is now a good time to buy BTC for a beginner? 🙏', time: '09:31' },
  { name: 'CryptoKemi', init: 'CK', color: '#f0b429', badge: 'pro', text: '@NewbieNaira DCA strategy is always smart. Never invest more than you can lose! Start small.', time: '09:33' },
  { name: 'BlockBoy_NG', init: 'BB', color: '#3b82f6', badge: 'mod', text: 'Reminder: This is not financial advice. Always DYOR before investing 🙏', time: '09:29' },
];

// ===============================
// FETCH PRICES FROM COINGECKO
// ===============================
async function fetchPrices() {
  try {
    const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${COIN_IDS}&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    coinsData = data;
    renderPriceTable(data);
    renderTicker(data);
    updateLastRefreshed();
  } catch (err) {
    console.warn('CoinGecko fetch failed, using demo data:', err.message);
    useDemoData();
  }
}

function useDemoData() {
  const demo = [
    { id: 'bitcoin',       name: 'Bitcoin',   symbol: 'btc',  current_price: 96420, price_change_percentage_24h: 2.4,  market_cap: 1910000000000, sparkline_in_7d: { price: [88000,90000,91000,92500,94000,95200,96420] } },
    { id: 'ethereum',      name: 'Ethereum',  symbol: 'eth',  current_price: 3812,  price_change_percentage_24h: 3.1,  market_cap: 458000000000,  sparkline_in_7d: { price: [3400,3500,3550,3620,3700,3750,3812] } },
    { id: 'solana',        name: 'Solana',    symbol: 'sol',  current_price: 184,   price_change_percentage_24h: -1.2, market_cap: 86000000000,   sparkline_in_7d: { price: [195,190,188,185,182,186,184] } },
    { id: 'binancecoin',   name: 'BNB',       symbol: 'bnb',  current_price: 612,   price_change_percentage_24h: 0.8,  market_cap: 89000000000,   sparkline_in_7d: { price: [598,602,605,608,610,611,612] } },
    { id: 'ripple',        name: 'XRP',       symbol: 'xrp',  current_price: 2.41,  price_change_percentage_24h: 4.7,  market_cap: 138000000000,  sparkline_in_7d: { price: [2.1,2.15,2.2,2.25,2.3,2.36,2.41] } },
    { id: 'cardano',       name: 'Cardano',   symbol: 'ada',  current_price: 0.72,  price_change_percentage_24h: 1.3,  market_cap: 25000000000,   sparkline_in_7d: { price: [0.67,0.68,0.69,0.70,0.71,0.715,0.72] } },
    { id: 'dogecoin',      name: 'Dogecoin',  symbol: 'doge', current_price: 0.183, price_change_percentage_24h: -0.5, market_cap: 26000000000,   sparkline_in_7d: { price: [0.19,0.188,0.186,0.185,0.184,0.183,0.183] } },
    { id: 'polkadot',      name: 'Polkadot',  symbol: 'dot',  current_price: 9.84,  price_change_percentage_24h: 2.1,  market_cap: 14000000000,   sparkline_in_7d: { price: [9.1,9.2,9.4,9.5,9.6,9.72,9.84] } },
    { id: 'chainlink',     name: 'Chainlink', symbol: 'link', current_price: 14.62, price_change_percentage_24h: 3.8,  market_cap: 9000000000,    sparkline_in_7d: { price: [13,13.5,13.8,14,14.2,14.4,14.62] } },
    { id: 'avalanche-2',   name: 'Avalanche', symbol: 'avax', current_price: 38.4,  price_change_percentage_24h: -2.1, market_cap: 16000000000,   sparkline_in_7d: { price: [41,40,39.5,39,38.8,38.5,38.4] } },
  ];
  coinsData = demo;
  renderPriceTable(demo);
  renderTicker(demo);
  updateLastRefreshed();
}

// ===============================
// RENDER PRICE TABLE
// ===============================
function renderPriceTable(coins) {
  const tbody = document.getElementById('price-tbody');
  let filtered = [...coins];

  if (currentFilter === 'gainers') filtered = filtered.filter(c => c.price_change_percentage_24h > 0).sort((a,b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  if (currentFilter === 'losers') filtered = filtered.filter(c => c.price_change_percentage_24h < 0).sort((a,b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
  if (currentFilter === 'defi') filtered = filtered.filter(c => ['chainlink','polkadot','avalanche-2'].includes(c.id));

  tbody.innerHTML = filtered.map((coin, idx) => {
    const meta = coinMeta[coin.id] || { sym: coin.symbol.toUpperCase(), color: '#888', init: coin.symbol[0].toUpperCase() };
    const up = coin.price_change_percentage_24h >= 0;
    const chg = coin.price_change_percentage_24h.toFixed(2);
    const price = formatPrice(coin.current_price);
    const mcap = formatMcap(coin.market_cap);
    const spark = buildSparkline(coin.sparkline_in_7d?.price || [], up);
    const isWatching = watchlist.includes(coin.id);

    return `<tr class="fade-in" style="animation-delay:${idx * 0.04}s">
      <td style="color:var(--muted);font-family:var(--mono);font-size:12px">${idx + 1}</td>
      <td>
        <div class="coin-cell">
          <div class="coin-icon" style="background:${meta.color}22;color:${meta.color}">${meta.init}</div>
          <div>
            <div class="coin-name">${coin.name}</div>
            <div class="coin-sym">${meta.sym}</div>
          </div>
        </div>
      </td>
      <td class="price-val">$${price}</td>
      <td style="text-align:right"><span class="chg-pill ${up ? 'up' : 'down'}">${up ? '+' : ''}${chg}%</span></td>
      <td>${spark}</td>
      <td style="font-family:var(--mono);font-size:12px;color:var(--muted);text-align:right">${mcap}</td>
      <td>
        <button class="watch-btn ${isWatching ? 'watching' : ''}" data-id="${coin.id}" onclick="toggleWatch('${coin.id}', this)">
          ${isWatching ? '★ Watching' : '☆ Watch'}
        </button>
      </td>
    </tr>`;
  }).join('');
}

function buildSparkline(prices, up) {
  if (!prices || prices.length === 0) return '<span style="color:var(--muted);font-size:11px">—</span>';
  // sample to 7 points
  const step = Math.max(1, Math.floor(prices.length / 7));
  const sample = prices.filter((_, i) => i % step === 0).slice(-7);
  const max = Math.max(...sample);
  const min = Math.min(...sample);
  const range = max - min || 1;
  return `<div class="spark">${sample.map(v => {
    const h = Math.max(3, Math.round(((v - min) / range) * 22));
    return `<div class="spark-bar ${up ? 'u' : 'd'}" style="height:${h}px"></div>`;
  }).join('')}</div>`;
}

function formatPrice(n) {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toFixed(4);
}

function formatMcap(n) {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toLocaleString();
}

// ===============================
// TICKER
// ===============================
function renderTicker(coins) {
  const track = document.getElementById('ticker');
  const items = [...coins, ...coins]; // duplicate for seamless loop
  track.innerHTML = items.map(coin => {
    const meta = coinMeta[coin.id] || { sym: coin.symbol.toUpperCase() };
    const up = coin.price_change_percentage_24h >= 0;
    const chg = coin.price_change_percentage_24h.toFixed(2);
    return `<div class="ticker-item">
      <span class="ticker-sym">${meta.sym}</span>
      <span class="ticker-price">$${formatPrice(coin.current_price)}</span>
      <span class="ticker-chg ${up ? 'up' : 'down'}">${up ? '+' : ''}${chg}%</span>
    </div>`;
  }).join('');
}

// ===============================
// CALENDAR
// ===============================
function renderCalendar() {
  const tbody = document.getElementById('cal-tbody');
  tbody.innerHTML = calendarEvents.map((e, i) => {
    const impClass = e.impact === 'high' ? 'imp-high' : e.impact === 'med' ? 'imp-med' : 'imp-low';
    const actualClass = e.actual === '—' ? 'neutral' : 'positive';
    const liveTag = e.live ? '<span class="live-pill">LIVE</span>' : '';
    return `<tr class="${e.live ? 'cal-row-live' : ''} fade-in" style="animation-delay:${i * 0.05}s">
      <td><span class="impact ${impClass}" title="${e.impact} impact"></span></td>
      <td class="cal-time">${e.time}</td>
      <td class="cal-coin">${e.coin}</td>
      <td class="cal-event">${e.event}${liveTag}</td>
      <td class="cal-actual ${actualClass}">${e.actual}</td>
    </tr>`;
  }).join('');
}

// ===============================
// CHAT
// ===============================
function renderSeedMessages() {
  const area = document.getElementById('chat-area');
  area.innerHTML = '';
  seedMessages.forEach(m => appendMessage(m, false));
  area.scrollTop = area.scrollHeight;
}

function appendMessage(msg, scroll = true) {
  const area = document.getElementById('chat-area');
  const badgeHTML = msg.badge === 'mod'
    ? '<span class="chat-badge badge-mod">MOD</span>'
    : msg.badge === 'pro'
    ? '<span class="chat-badge badge-pro">PRO</span>'
    : '';

  const div = document.createElement('div');
  div.className = `chat-msg ${msg.mine ? 'mine' : ''} fade-in`;
  div.innerHTML = `
    <div class="chat-avatar" style="background:${msg.color}22;color:${msg.color}">${msg.init}</div>
    <div class="chat-body">
      <div class="chat-header">
        <span class="chat-name">${msg.name}</span>
        ${badgeHTML}
        <span class="chat-time">${msg.time}</span>
      </div>
      <div class="chat-text">${msg.text}</div>
    </div>`;
  area.appendChild(div);
  if (scroll) area.scrollTop = area.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const val = input.value.trim();
  if (!val) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  appendMessage({ name: 'You', init: 'ME', color: '#f0b429', badge: '', text: val, time, mine: true });
  input.value = '';

  // Simulate a reply after a short delay
  setTimeout(() => {
    const replies = [
      { name: 'CryptoKemi', init: 'CK', color: '#f0b429', badge: 'pro', text: 'Great point! The market is definitely reacting to that 📈', time: getCurrentTime() },
      { name: 'BlockBoy_NG', init: 'BB', color: '#3b82f6', badge: 'mod', text: 'Thanks for sharing. Always good to hear different perspectives here.', time: getCurrentTime() },
      { name: 'SatoshiFan', init: 'SF', color: '#22c55e', badge: '', text: 'I agree! <span class="hl">HODL</span> strong everyone 💪', time: getCurrentTime() },
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    appendMessage(reply);
  }, 1200 + Math.random() * 1200);
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

// ===============================
// WATCHLIST
// ===============================
function toggleWatch(id, btn) {
  if (watchlist.includes(id)) {
    watchlist = watchlist.filter(w => w !== id);
    btn.classList.remove('watching');
    btn.textContent = '☆ Watch';
  } else {
    watchlist.push(id);
    btn.classList.add('watching');
    btn.textContent = '★ Watching';
  }
  localStorage.setItem('cryptohub_watchlist', JSON.stringify(watchlist));
}

// ===============================
// FEAR & GREED
// ===============================
function renderFearGreed(value) {
  const needle = document.getElementById('sent-needle');
  const num = document.getElementById('sent-num');
  const label = document.getElementById('sent-label');
  const pct = Math.min(Math.max(value, 0), 100);
  needle.style.left = pct + '%';
  num.textContent = value;
  if (value <= 25) { label.textContent = 'Extreme Fear'; label.style.color = 'var(--red)'; }
  else if (value <= 45) { label.textContent = 'Fear'; label.style.color = '#f59e0b'; }
  else if (value <= 55) { label.textContent = 'Neutral'; label.style.color = 'var(--text2)'; }
  else if (value <= 75) { label.textContent = 'Greed'; label.style.color = 'var(--green)'; }
  else { label.textContent = 'Extreme Greed'; label.style.color = 'var(--green)'; }
}

// ===============================
// UTILS
// ===============================
function updateLastRefreshed() {
  const el = document.getElementById('last-updated');
  if (el) el.textContent = 'Updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function updateOnlineCount() {
  onlineCount += Math.floor(Math.random() * 5) - 2;
  onlineCount = Math.max(100, Math.min(250, onlineCount));
  const el = document.getElementById('online-count');
  if (el) el.textContent = `${onlineCount} online now`;
}

// ===============================
// EVENT LISTENERS
// ===============================
document.addEventListener('DOMContentLoaded', () => {

  // Initial data load
  fetchPrices();
  renderCalendar();
  renderSeedMessages();
  renderFearGreed(62);

  // Auto-refresh prices
  setInterval(fetchPrices, REFRESH_INTERVAL);
  setInterval(updateOnlineCount, 8000);

  // Nav tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Sidebar filters
  document.querySelectorAll('.sb-item[data-filter]').forEach(item => {
    item.addEventListener('click', function () {
      document.querySelectorAll('.sb-item[data-filter]').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderPriceTable(coinsData);
    });
  });

  // Right panel tabs
  document.querySelectorAll('.rp-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.rp-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Chat send
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
  });

  // Mobile chat toggle
  const chatBtn = document.getElementById('mobile-chat-btn');
  const rightPanel = document.getElementById('right-panel');
  chatBtn.addEventListener('click', () => {
    rightPanel.classList.toggle('open');
    const badge = chatBtn.querySelector('.chat-notif-badge');
    if (badge) badge.style.display = 'none';
  });

  // Mobile menu
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('mobile-drawer').classList.toggle('open');
  });

  // Sidebar community chat link
  const openChatSb = document.getElementById('open-chat-sb');
  if (openChatSb) {
    openChatSb.addEventListener('click', () => {
      rightPanel.classList.add('open');
    });
  }
});

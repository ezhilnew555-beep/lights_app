// Shared mock data, navigation definitions, and SVG icons for all 5 concepts
const SCREENS = [
  { id: 'index', name: 'Auth & Onboarding', file: 'index.html', icon: 'auth' },
  { id: 'dashboard', name: 'Dashboard', file: 'dashboard.html', icon: 'dashboard' },
  { id: 'calendar', name: 'Calendar Tracking', file: 'calendar.html', icon: 'calendar' },
  { id: 'income', name: 'Income Streams', file: 'income.html', icon: 'income' },
  { id: 'expenses', name: 'Expenses & Budget', file: 'expenses.html', icon: 'expenses' },
  { id: 'investments', name: 'Investments', file: 'investments.html', icon: 'investments' },
  { id: 'stocks', name: 'Stocks & Equities', file: 'stocks.html', icon: 'stocks' },
  { id: 'mutualfunds', name: 'Mutual Funds & SIP', file: 'mutualfunds.html', icon: 'mutualfunds' },
  { id: 'fire', name: 'FIRE Calculator', file: 'fire.html', icon: 'fire' },
  { id: 'goals', name: 'Financial Goals', file: 'goals.html', icon: 'goals' },
  { id: 'ai-assistant', name: 'AI Voice Assistant', file: 'ai-assistant.html', icon: 'ai' },
  { id: 'ai-notes', name: 'AI Financial Notes', file: 'ai-notes.html', icon: 'notes' },
  { id: 'reports', name: 'Reports & Statements', file: 'reports.html', icon: 'reports' },
  { id: 'rewards', name: 'Coins & Rewards', file: 'rewards.html', icon: 'rewards' },
  { id: 'badges', name: 'Badges & Streaks', file: 'badges.html', icon: 'badges' },
  { id: 'notifications', name: 'Notifications', file: 'notifications.html', icon: 'bell' },
  { id: 'profile', name: 'Profile & KYC', file: 'profile.html', icon: 'profile' },
  { id: 'settings', name: 'Settings & Security', file: 'settings.html', icon: 'settings' },
  { id: 'design-system', name: 'Design System', file: 'design-system.html', icon: 'design' }
];

const CONCEPTS = [
  { id: 'Concept-1-Premium-Digital-Bank', name: 'Concept 1: Premium Digital Bank', shortName: '1. Premium Bank', theme: 'Warm Precision / Revolut', folder: 'Concept-1-Premium-Digital-Bank' },
  { id: 'Concept-2-Minimal-Neobank', name: 'Concept 2: Minimal NeoBank', shortName: '2. Minimal Neo', theme: 'Hyper-Minimal / Linear / Copilot', folder: 'Concept-2-Minimal-Neobank' },
  { id: 'Concept-3-Enterprise-Fintech', name: 'Concept 3: Enterprise Fintech', shortName: '3. Enterprise', theme: 'Institutional / Bloomberg / J.P. Morgan', folder: 'Concept-3-Enterprise-Fintech' },
  { id: 'Concept-4-AI-Powered-Finance', name: 'Concept 4: AI-Powered Finance', shortName: '4. AI Autonomous', theme: 'Conversational / Perplexity / Copilot', folder: 'Concept-4-AI-Powered-Finance' },
  { id: 'Concept-5-Luxury-Wealth', name: 'Concept 5: Luxury Wealth Platform', shortName: '5. Luxury Wealth', theme: 'Private Office / Amex Centurion', folder: 'Concept-5-Luxury-Wealth' }
];

const ICONS = {
  dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  calendar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`,
  income: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>`,
  expenses: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 4 4 4-4"/><path d="M12 8v8"/></svg>`,
  investments: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  stocks: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  mutualfunds: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
  fire: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  goals: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  ai: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
  notes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
  reports: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
  rewards: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  badges: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7.8A2.8 2.8 0 0 1 5 15.2V6h14v9.2a2.8 2.8 0 0 1-2.8 2.8H15c-.55 0-1-.45-1-1v-2.34"/><path d="M18 6H6"/></svg>`,
  bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  profile: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  design: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/></svg>`,
  auth: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" x2="12" y1="1" y2="3"/><line x1="12" x2="12" y1="21" y2="23"/><line x1="4.22" x2="5.64" y1="4.22" y2="5.64"/><line x1="18.36" x2="19.78" y1="18.36" y2="19.78"/><line x1="1" x2="3" y1="12" y2="12"/><line x1="21" x2="23" y1="12" y2="12"/><line x1="4.22" x2="5.64" y1="19.78" y2="18.36"/><line x1="18.36" x2="19.78" y1="5.64" y2="4.22"/></svg>`,
  moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  arrowUpRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" x2="17" y1="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`,
  arrowDownLeft: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" x2="7" y1="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`
};

const MOCK_DATA = {
  user: {
    name: 'Aditya Sharma',
    handle: '@adityasharma',
    email: 'aditya.sharma@example.com',
    phone: '+91 98765 43210',
    kycStatus: 'Verified (Tier 3)',
    cibilScore: 792,
    pan: 'ABCPS1234F',
    memberSince: 'March 2023',
    wealthTier: 'Sovereign Black',
    bankAccounts: [
      { name: 'HDFC Salary A/c', number: '•••• 4091', balance: '₹1,42,850' },
      { name: 'ICICI Savings A/c', number: '•••• 8821', balance: '₹84,200' },
      { name: 'Zerodha Demat', id: 'ZM9812', value: '₹27,30,000' }
    ]
  },
  metrics: {
    netWorth: '₹48,65,420',
    netWorthDelta: '+18.4% YoY',
    monthlyIncome: '₹2,45,000',
    monthlyExpense: '₹78,250',
    monthlySavings: '₹1,66,750',
    savingsRate: '68.1%',
    totalInvestments: '₹34,20,000',
    totalReturns: '+₹5,82,400 (+20.5%)',
    coins: 14850,
    savingsStreak: 48,
    fireTarget: '₹4,50,00,000',
    fireCurrent: '₹48,65,420',
    fireProgressPct: 10.8,
    projectedFireAge: 42
  },
  recentTransactions: [
    { title: 'Swiggy Gourmet', cat: 'Food & Dining', date: 'Today, 2:15 PM', amount: '-₹1,480', type: 'expense', icon: '🍽️' },
    { title: 'Tech Innovations Corp', cat: 'Monthly Salary', date: 'Yesterday', amount: '+₹1,85,000', type: 'income', icon: '💼' },
    { title: 'Amazon Prime & Retail', cat: 'Shopping', date: 'Sep 20', amount: '-₹4,299', type: 'expense', icon: '📦' },
    { title: 'Parag Parikh Flexi SIP', cat: 'Investment', date: 'Sep 19', amount: '-₹15,000', type: 'expense', icon: '📈' },
    { title: 'TCS Interim Dividend', cat: 'Passive Income', date: 'Sep 18', amount: '+₹2,400', type: 'income', icon: '💰' },
    { title: 'Tata Power Bill', cat: 'Utilities', date: 'Sep 16', amount: '-₹2,350', type: 'expense', icon: '⚡' },
    { title: 'Uber Premier', cat: 'Transport', date: 'Sep 15', amount: '-₹640', type: 'expense', icon: '🚗' },
    { title: 'Starbucks Reserve', cat: 'Dining', date: 'Sep 14', amount: '-₹450', type: 'expense', icon: '☕' }
  ],
  stocks: [
    { name: 'Reliance Industries', ticker: 'RELIANCE', shares: 45, avg: '₹2,740', cmp: '₹2,980', pnl: '+₹10,800 (+8.7%)', positive: true },
    { name: 'HDFC Bank Ltd', ticker: 'HDFCBANK', shares: 80, avg: '₹1,520', cmp: '₹1,640', pnl: '+₹9,600 (+7.8%)', positive: true },
    { name: 'Infosys Limited', ticker: 'INFY', shares: 60, avg: '₹1,480', cmp: '₹1,820', pnl: '+₹20,400 (+22.9%)', positive: true },
    { name: 'Tata Motors', ticker: 'TATAMOTORS', shares: 110, avg: '₹780', cmp: '₹995', pnl: '+₹23,650 (+27.5%)', positive: true },
    { name: 'ICICI Bank Ltd', ticker: 'ICICIBANK', shares: 95, avg: '₹1,040', cmp: '₹1,210', pnl: '+₹16,150 (+16.3%)', positive: true }
  ],
  mutualFunds: [
    { name: 'Parag Parikh Flexi Cap Fund', cat: 'Equity - Flexi Cap', sip: '₹15,000/mo', nav: '₹76.42', value: '₹4,80,000', returnPct: '+22.4%', rating: '5★' },
    { name: 'Mirae Asset Large Cap Fund', cat: 'Equity - Large Cap', sip: '₹10,000/mo', nav: '₹112.18', value: '₹3,50,000', returnPct: '+16.2%', rating: '4★' },
    { name: 'Quant Small Cap Fund', cat: 'Equity - Small Cap', sip: '₹5,000/mo', nav: '₹248.60', value: '₹2,50,000', returnPct: '+28.6%', rating: '5★' },
    { name: 'HDFC Balanced Advantage', cat: 'Hybrid Dynamic', sip: '₹5,000/mo', nav: '₹462.10', value: '₹2,00,000', returnPct: '+14.1%', rating: '4★' }
  ],
  goals: [
    { title: 'Emergency Liquid Reserve', current: '₹6,00,000', target: '₹6,00,000', pct: 100, status: 'Completed', tag: 'High Priority', color: '#059669' },
    { title: 'Dream Home Down Payment', current: '₹24,00,000', target: '₹40,00,000', pct: 60, status: 'On Track', tag: 'Target 2028', color: '#0D9488' },
    { title: 'Japan Autumn Journey', current: '₹3,50,000', target: '₹4,00,000', pct: 87.5, status: 'Almost There', tag: 'Oct 2026', color: '#EA580C' },
    { title: 'Electric Performance SUV', current: '₹8,00,000', target: '₹18,00,000', pct: 44.4, status: 'In Progress', tag: 'Target 2027', color: '#4F46E5' }
  ],
  incomeStreams: [
    { name: 'VP Engineering Salary', source: 'Tech Innovations Pvt Ltd', amount: '₹1,85,000', freq: 'Monthly (30th)', tag: 'Fixed' },
    { name: '2BHK Apartment Rent', source: 'Indiranagar Property', amount: '₹32,000', freq: 'Monthly (5th)', tag: 'Passive' },
    { name: 'Advisory & Consulting', source: 'Fintech Advisory', amount: '₹19,600', freq: 'Monthly (Bi-weekly)', tag: 'Variable' },
    { name: 'Equity & Mutual Fund Dividends', source: 'Listed Equities', amount: '₹8,400', freq: 'Quarterly run-rate', tag: 'Portfolio' }
  ],
  expenseCategories: [
    { name: 'Housing & Maintenance', amount: '₹30,000', pct: '38.3%', color: '#0D9488' },
    { name: 'Food, Groceries & Dining', amount: '₹16,450', pct: '21.0%', color: '#E11D48' },
    { name: 'Shopping & Electronics', amount: '₹12,100', pct: '15.5%', color: '#D97706' },
    { name: 'Utilities & Subscriptions', amount: '₹8,900', pct: '11.4%', color: '#4F46E5' },
    { name: 'Travel & Commute', amount: '₹6,800', pct: '8.7%', color: '#06B6D4' },
    { name: 'Health & Wellness', amount: '₹4,000', pct: '5.1%', color: '#10B981' }
  ],
  badges: [
    { name: 'FIRE Pioneer', desc: 'Crossed 10% of your 4.5 Cr retirement target', icon: '🔥', tier: 'Gold', earned: 'Aug 2026' },
    { name: 'Streak Titan', desc: 'Tracked daily cashflow for 45+ consecutive days', icon: '⚡', tier: 'Platinum', earned: 'Sep 2026' },
    { name: 'Savings Master', desc: 'Maintained >60% savings rate for 3 consecutive months', icon: '🛡️', tier: 'Gold', earned: 'Jul 2026' },
    { name: 'SIP Prodigy', desc: 'Never missed a monthly mutual fund SIP in 2 years', icon: '🌱', tier: 'Diamond', earned: 'May 2026' },
    { name: 'Debt Slayer', desc: 'Zero high-interest consumer debt or credit carryover', icon: '⚔️', tier: 'Silver', earned: 'Jan 2026' },
    { name: 'Tax Optimizer', desc: 'Maximized 80C, 80D and NPS deductions seamlessly', icon: '📑', tier: 'Gold', earned: 'Mar 2026' },
    { name: 'Alpha Investor', desc: 'Portfolio returns beat Nifty 50 benchmark by >4%', icon: '🚀', tier: 'Diamond', earned: 'Aug 2026' },
    { name: 'Emergency Fortress', desc: 'Completed 6 full months of liquid runway emergency fund', icon: '🏰', tier: 'Platinum', earned: 'Jun 2026' }
  ]
};

function renderGlobalHeader(conceptId, currentScreenId) {
  const currentConcept = CONCEPTS.find(c => c.id === conceptId);
  const currentScreen = SCREENS.find(s => s.id === currentScreenId) || SCREENS[0];

  const conceptOptions = CONCEPTS.map(c => `
    <option value="../${c.folder}/${currentScreen.file}" ${c.id === conceptId ? 'selected' : ''}>
      ${c.shortName}
    </option>
  `).join('');

  return `
    <header class="proto-topbar">
      <div class="proto-topbar-left">
        <a href="../index.html" class="proto-hub-link" title="Return to Prototype Master Hub">
          <span class="proto-hub-icon">⚡</span>
          <span class="proto-hub-text">LigthsON <strong>Hub</strong></span>
        </a>
        <div class="proto-divider"></div>
        <div class="proto-concept-badge">
          <span class="proto-concept-indicator"></span>
          <span class="proto-concept-name">${currentConcept.name}</span>
        </div>
      </div>

      <div class="proto-topbar-center">
        <div class="proto-switcher-wrap">
          <label for="protoConceptSelect" class="proto-switcher-label">Compare Concept:</label>
          <select id="protoConceptSelect" class="proto-select" onchange="if(this.value) window.location.href=this.value">
            ${conceptOptions}
          </select>
        </div>
      </div>

      <div class="proto-topbar-right">
        <button id="themeToggleBtn" class="proto-theme-btn" title="Toggle Light / Dark Mode" onclick="toggleProtoTheme()">
          <span class="theme-icon-light">${ICONS.sun}</span>
          <span class="theme-icon-dark">${ICONS.moon}</span>
          <span class="theme-btn-text">Theme</span>
        </button>
        <a href="design-system.html" class="proto-ds-btn ${currentScreenId === 'design-system' ? 'active' : ''}">
          ${ICONS.design}
          <span>Design Tokens</span>
        </a>
      </div>
    </header>
  `;
}

module.exports = {
  SCREENS,
  CONCEPTS,
  ICONS,
  MOCK_DATA,
  renderGlobalHeader
};

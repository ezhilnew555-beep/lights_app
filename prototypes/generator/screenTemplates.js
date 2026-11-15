const { MOCK_DATA, ICONS } = require('./shared');

function renderScreenContent(conceptId, screenId) {
  switch (screenId) {
    case 'index':
      return renderAuthOnboardingScreen(conceptId);
    case 'dashboard':
      return renderDashboardScreen(conceptId);
    case 'calendar':
      return renderCalendarScreen(conceptId);
    case 'income':
      return renderIncomeScreen(conceptId);
    case 'expenses':
      return renderExpensesScreen(conceptId);
    case 'investments':
      return renderInvestmentsScreen(conceptId);
    case 'stocks':
      return renderStocksScreen(conceptId);
    case 'mutualfunds':
      return renderMutualFundsScreen(conceptId);
    case 'fire':
      return renderFireScreen(conceptId);
    case 'goals':
      return renderGoalsScreen(conceptId);
    case 'ai-assistant':
      return renderAiAssistantScreen(conceptId);
    case 'ai-notes':
      return renderAiNotesScreen(conceptId);
    case 'reports':
      return renderReportsScreen(conceptId);
    case 'rewards':
      return renderRewardsScreen(conceptId);
    case 'badges':
      return renderBadgesScreen(conceptId);
    case 'notifications':
      return renderNotificationsScreen(conceptId);
    case 'profile':
      return renderProfileScreen(conceptId);
    case 'settings':
      return renderSettingsScreen(conceptId);
    case 'design-system':
      return renderDesignSystemScreen(conceptId);
    default:
      return `<div class="card"><h2>Screen Not Found</h2></div>`;
  }
}

// 1. Auth & Onboarding Screen
function renderAuthOnboardingScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Gateway & Security</span>
        <h1 class="screen-title">Authentication & Onboarding</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-secondary" onclick="alert('Switched to Demo Session')">Quick Guest Preview</button>
      </div>
    </div>

    <div class="card-grid-2">
      <!-- Onboarding Value Prop Card -->
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="badge badge-primary" style="margin-bottom: 16px;">Next-Gen Personal Finance</div>
          <h2 style="font-size: 28px; font-weight: 800; line-height: 1.25; margin-bottom: 14px;">
            Total Clarity Over Every Rupee, Investment & Retirement Goal.
          </h2>
          <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 15px;">
            Join over 120,000+ ambitious individuals mastering cashflow, tracking equity & mutual funds, and achieving early financial independence.
          </p>
          <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: var(--income);">${ICONS.check}</span>
              <span style="font-size: 14px; font-weight: 600;">Automated Multi-Bank Account Aggregator Integration</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: var(--income);">${ICONS.check}</span>
              <span style="font-size: 14px; font-weight: 600;">Intelligent Daily Calendar-Based Cash Flow Tracker</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: var(--income);">${ICONS.check}</span>
              <span style="font-size: 14px; font-weight: 600;">Autonomous FIRE Runway & Milestone Projections</span>
            </div>
          </div>
        </div>

        <div style="padding: 16px; border-radius: var(--radius-md); background: var(--bg-surface-muted); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 12px; color: var(--text-muted);">Security Standard</div>
            <div style="font-size: 14px; font-weight: 700;">256-Bit Bank Grade Encryption</div>
          </div>
          <span class="badge badge-income">SEBI & RBI Compliant</span>
        </div>
      </div>

      <!-- Interactive Login / Signup Form -->
      <div class="card">
        <div style="display: flex; border-bottom: 1px solid var(--border-subtle); margin-bottom: 20px;">
          <button id="authTabLogin" class="btn btn-sm btn-primary" style="flex: 1; border-radius: var(--radius-md) var(--radius-md) 0 0;" onclick="toggleAuthTab('login')">Sign In</button>
          <button id="authTabSignup" class="btn btn-sm btn-secondary" style="flex: 1; border-radius: var(--radius-md) var(--radius-md) 0 0;" onclick="toggleAuthTab('signup')">Create Account</button>
        </div>

        <form id="authForm" onsubmit="event.preventDefault(); window.location.href='dashboard.html';">
          <div class="form-group">
            <label class="form-label">Email or Mobile Number</label>
            <input type="text" class="form-input" placeholder="aditya.sharma@example.com" value="aditya.sharma@example.com" required />
          </div>
          <div class="form-group">
            <label class="form-label">Password or Passkey</label>
            <input type="password" class="form-input" placeholder="••••••••••••" value="LigthsON2026!#" required />
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 13px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" checked /> Remember this device
            </label>
            <a href="#" style="color: var(--primary); text-decoration: none; font-weight: 600;">Forgot Password?</a>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; margin-bottom: 14px;">
            Authenticate & Open Dashboard →
          </button>

          <div style="text-align: center; margin: 16px 0; color: var(--text-muted); font-size: 12px; position: relative;">
            <span style="background: var(--bg-surface); padding: 0 10px; position: relative; z-index: 1;">OR CONTINUE WITH</span>
            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--border-subtle);"></div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.location.href='dashboard.html'">
              Google One-Tap
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.location.href='dashboard.html'">
              Biometric Passkey
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// 2. Master Dashboard Screen
function renderDashboardScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Financial Overview</span>
        <h1 class="screen-title">Welcome Back, ${MOCK_DATA.user.name}</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-secondary btn-sm" onclick="alert('Downloading Financial Snapshot...')">
          ${ICONS.reports}
          <span>Export Summary</span>
        </button>
        <button class="btn btn-primary btn-sm" onclick="openModal('addTransactionModal')">
          ${ICONS.plus}
          <span>Add Transaction</span>
        </button>
      </div>
    </div>

    <!-- Top KPI Stat Cards -->
    <div class="card-grid-4">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Total Net Worth</span>
          <div class="stat-icon-wrap">${ICONS.investments}</div>
        </div>
        <div class="stat-val">${MOCK_DATA.metrics.netWorth}</div>
        <div class="stat-footer stat-delta-positive">
          <span>${ICONS.arrowUpRight}</span>
          <span>${MOCK_DATA.metrics.netWorthDelta}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Monthly Inflows</span>
          <div class="stat-icon-wrap" style="background: var(--income-soft); color: var(--income);">${ICONS.income}</div>
        </div>
        <div class="stat-val">${MOCK_DATA.metrics.monthlyIncome}</div>
        <div class="stat-footer stat-delta-positive">
          <span>4 Active Streams</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Monthly Outflows</span>
          <div class="stat-icon-wrap" style="background: var(--expense-soft); color: var(--expense);">${ICONS.expenses}</div>
        </div>
        <div class="stat-val">${MOCK_DATA.metrics.monthlyExpense}</div>
        <div class="stat-footer stat-delta-negative">
          <span>31.9% of Income</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Savings Rate</span>
          <div class="stat-icon-wrap" style="background: var(--primary-soft); color: var(--primary);">${ICONS.fire}</div>
        </div>
        <div class="stat-val">${MOCK_DATA.metrics.savingsRate}</div>
        <div class="stat-footer stat-delta-positive">
          <span>🔥 ${MOCK_DATA.metrics.savingsStreak} Day Streak</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions Bar -->
    <div class="quick-actions-bar">
      <a href="calendar.html" class="action-pill">
        <div class="action-icon-circle">${ICONS.calendar}</div>
        <span>Calendar View</span>
      </a>
      <a href="investments.html" class="action-pill">
        <div class="action-icon-circle">${ICONS.stocks}</div>
        <span>Investments</span>
      </a>
      <a href="fire.html" class="action-pill">
        <div class="action-icon-circle">${ICONS.fire}</div>
        <span>FIRE Tracker</span>
      </a>
      <a href="ai-assistant.html" class="action-pill">
        <div class="action-icon-circle">${ICONS.ai}</div>
        <span>Ask Lumina AI</span>
      </a>
      <a href="rewards.html" class="action-pill">
        <div class="action-icon-circle">${ICONS.rewards}</div>
        <span>14,850 Coins</span>
      </a>
    </div>

    <!-- Middle Section: Net Worth Curve & Category Donut -->
    <div class="card-grid-2-1">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Net Worth Trajectory (2026)</h3>
            <p class="card-desc">Compounded balance growth across accounts & investments</p>
          </div>
          <span class="badge badge-primary">YTD Growth +22.4%</span>
        </div>
        <div class="chart-container">
          <canvas id="netWorthGrowthCanvas" class="proto-canvas"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Monthly Expense Mix</h3>
            <p class="card-desc">September Category Breakdown</p>
          </div>
        </div>
        <div class="chart-container" style="height: 180px;">
          <canvas id="expenseDonutCanvas" class="proto-canvas"></canvas>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px;">
          ${MOCK_DATA.expenseCategories.slice(0, 4).map(c => `
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${c.color};"></span>
                <span style="color: var(--text-secondary);">${c.name.split(' ')[0]}</span>
              </span>
              <strong style="font-family: var(--font-mono);">${c.amount}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Bottom Section: Virtual Card + Recent Transactions -->
    <div class="card-grid-1-2">
      <!-- Virtual Card -->
      <div>
        <div class="virtual-debit-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <span style="font-weight: 800; font-size: 15px; letter-spacing: 0.05em;">LIGTHS VIP</span>
            <span class="badge" style="background: rgba(255,255,255,0.25); color: #fff;">RuPay Platinum</span>
          </div>
          <div class="card-chip"></div>
          <div class="card-num-preview">4520  ••••  ••••  9082</div>
          <div class="card-bottom-row">
            <div>
              <div style="font-size: 10px; opacity: 0.8; text-transform: uppercase;">Cardholder</div>
              <div class="card-holder-name">${MOCK_DATA.user.name}</div>
            </div>
            <div>
              <div style="font-size: 10px; opacity: 0.8; text-transform: uppercase;">Valid Thru</div>
              <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 700;">08/29</div>
            </div>
            <div class="card-network-logo">RuPay</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4 class="card-title">Cash Flow Run-Rate</h4>
          </div>
          <div class="chart-container" style="height: 120px;">
            <canvas id="cashflowBarCanvas" class="proto-canvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Recent Activity</h3>
            <p class="card-desc">Synchronized via automated bank feed & UPI</p>
          </div>
          <a href="expenses.html" class="btn btn-sm btn-secondary">View All</a>
        </div>
        <div class="txn-list">
          ${MOCK_DATA.recentTransactions.slice(0, 6).map(t => `
            <div class="txn-row">
              <div class="txn-left">
                <div class="txn-icon">${t.icon}</div>
                <div class="txn-info">
                  <span class="txn-title">${t.title}</span>
                  <span class="txn-meta">${t.cat} • ${t.date}</span>
                </div>
              </div>
              <div class="txn-amount ${t.type === 'income' ? 'txn-income' : 'txn-expense'}">
                ${t.amount}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// 3. Calendar Tracking Screen
function renderCalendarScreen(conceptId) {
  const days = [];
  for (let i = 1; i <= 30; i++) {
    const isSalary = i === 1;
    const isSip = i === 10 || i === 19;
    const isHeavy = i === 5 || i === 15 || i === 22;
    const expense = isHeavy ? 4250 : (isSip ? 15000 : (i % 2 === 0 ? 850 : 340));
    days.push({ day: i, salary: isSalary, sip: isSip, expense });
  }

  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Daily Cashflow Matrix</span>
        <h1 class="screen-title">September 2026 Calendar</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-secondary btn-sm" onclick="alert('Previous Month')">◀ August</button>
        <button class="btn btn-secondary btn-sm" onclick="alert('Next Month')">October ▶</button>
        <button class="btn btn-primary btn-sm" onclick="openModal('addTransactionModal')">+ Log Daily Entry</button>
      </div>
    </div>

    <div class="card-grid-2-1">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Daily Expenditure & Inflow Heatmap</h3>
          <div style="display: flex; gap: 12px; font-size: 12px;">
            <span style="display: flex; align-items: center; gap: 4px;">
              <span style="width: 10px; height: 10px; border-radius: 2px; background: var(--income);"></span> Inflow (+₹)
            </span>
            <span style="display: flex; align-items: center; gap: 4px;">
              <span style="width: 10px; height: 10px; border-radius: 2px; background: var(--expense);"></span> Outflow (-₹)
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 12px; text-align: center; font-size: 12px; font-weight: 700; color: var(--text-muted);">
          <div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div><div>SUN</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
          ${days.map(d => `
            <div style="padding: 10px 6px; border-radius: var(--radius-md); background: ${d.day === 22 ? 'var(--primary-soft)' : 'var(--bg-surface-muted)'}; border: 1px solid ${d.day === 22 ? 'var(--primary)' : 'var(--border-subtle)'}; cursor: pointer; transition: all 0.15s ease;" onclick="selectCalendarDate(${d.day})">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 700; font-size: 13px; ${d.day === 22 ? 'color: var(--primary);' : ''}">${d.day}</span>
                ${d.salary ? '<span style="font-size: 10px; background: var(--income); color: #fff; padding: 1px 4px; border-radius: 4px;">PAY</span>' : ''}
              </div>
              <div style="font-size: 11px; font-family: var(--font-mono); font-weight: 600; color: ${d.salary ? 'var(--income)' : 'var(--expense)'};">
                ${d.salary ? '+₹1.85L' : `-₹${d.expense}`}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Date Detail Inspector -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Day Detail: Sep 22, 2026</h3>
          <span class="badge badge-primary">Today</span>
        </div>
        <div style="padding: 14px; border-radius: var(--radius-md); background: var(--bg-surface-muted); margin-bottom: 16px;">
          <div style="font-size: 12px; color: var(--text-muted);">Total Spent Today</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--expense);">₹1,480</div>
          <div style="font-size: 12px; color: var(--income); font-weight: 600;">Within daily safety limit (₹2,500)</div>
        </div>

        <h4 style="font-size: 14px; margin-bottom: 10px;">Transactions on this date:</h4>
        <div class="txn-list">
          <div class="txn-row">
            <div class="txn-left">
              <div class="txn-icon">🍽️</div>
              <div class="txn-info">
                <span class="txn-title">Swiggy Gourmet Delivery</span>
                <span class="txn-meta">Food & Dining • 2:15 PM</span>
              </div>
            </div>
            <div class="txn-amount txn-expense">-₹1,480</div>
          </div>
        </div>

        <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 18px;" onclick="openModal('addTransactionModal')">
          + Add Entry for Sep 22
        </button>
      </div>
    </div>
  `;
}

// 4. Income Streams Screen
function renderIncomeScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Cash Inflow Architecture</span>
        <h1 class="screen-title">Income Management</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-primary btn-sm" onclick="alert('Add Income Stream')">+ Add Income Stream</button>
      </div>
    </div>

    <div class="card-grid-3">
      <div class="stat-card">
        <span class="stat-label">Total Monthly Inflows</span>
        <div class="stat-val" style="color: var(--income);">${MOCK_DATA.metrics.monthlyIncome}</div>
        <div class="stat-footer">Gross run-rate: ₹29.4L/yr</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Active vs Passive Ratio</span>
        <div class="stat-val">75% / 25%</div>
        <div class="stat-footer">Target: 50% Passive by 2028</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Next Anticipated Credit</span>
        <div class="stat-val">Sep 30</div>
        <div class="stat-footer">₹1,85,000 (Tech Innovations)</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Synchronized Income Channels</h3>
        <span class="badge badge-income">4 Active Sources</span>
      </div>
      <table class="proto-table">
        <thead>
          <tr>
            <th>Stream Name</th>
            <th>Source Entity</th>
            <th>Monthly Amount</th>
            <th>Frequency</th>
            <th>Tax Treatment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${MOCK_DATA.incomeStreams.map(s => `
            <tr>
              <td><strong>${s.name}</strong></td>
              <td>${s.source}</td>
              <td style="font-family: var(--font-mono); font-weight: 700; color: var(--income);">${s.amount}</td>
              <td>${s.freq}</td>
              <td><span class="badge badge-indigo">TDS Deducted</span></td>
              <td><span class="badge badge-income">Active</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 5. Expenses Screen
function renderExpensesScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Outflow Analysis & Budgets</span>
        <h1 class="screen-title">Expenses & Budget Control</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-secondary btn-sm" onclick="alert('Set Category Budget')">Edit Budgets</button>
        <button class="btn btn-primary btn-sm" onclick="openModal('addTransactionModal')">+ Log Expense</button>
      </div>
    </div>

    <div class="card-grid-3">
      <div class="stat-card">
        <span class="stat-label">Total Outflows (September)</span>
        <div class="stat-val" style="color: var(--expense);">${MOCK_DATA.metrics.monthlyExpense}</div>
        <div class="stat-footer">Budget: ₹90,000 (13% under budget)</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Daily Average Burn</span>
        <div class="stat-val">₹2,608 / day</div>
        <div class="stat-footer">Safe spending pace maintained</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Recurring Subscriptions</span>
        <div class="stat-val">₹8,900 / mo</div>
        <div class="stat-footer">8 active recurring mandates</div>
      </div>
    </div>

    <div class="card-grid-2">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Category Spending Limits</h3>
        </div>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${MOCK_DATA.expenseCategories.map(c => `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; margin-bottom: 6px;">
                <span>${c.name}</span>
                <span style="font-family: var(--font-mono);">${c.amount} (${c.pct})</span>
              </div>
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width: ${c.pct}; background: ${c.color};"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recurring Subscriptions Audit</h3>
          <span class="badge badge-warning">Auto-Debit Active</span>
        </div>
        <div class="txn-list">
          <div class="txn-row">
            <div class="txn-left">
              <div class="txn-icon">🎬</div>
              <div class="txn-info">
                <span class="txn-title">Netflix Premium 4K</span>
                <span class="txn-meta">Next due Oct 4 • HDFC Card</span>
              </div>
            </div>
            <div class="txn-amount txn-expense">₹649</div>
          </div>
          <div class="txn-row">
            <div class="txn-left">
              <div class="txn-icon">🎵</div>
              <div class="txn-info">
                <span class="txn-title">Spotify Family Plan</span>
                <span class="txn-meta">Next due Oct 12 • UPI AutoPay</span>
              </div>
            </div>
            <div class="txn-amount txn-expense">₹179</div>
          </div>
          <div class="txn-row">
            <div class="txn-left">
              <div class="txn-icon">☁️</div>
              <div class="txn-info">
                <span class="txn-title">Google One 2TB & Gemini</span>
                <span class="txn-meta">Next due Oct 18 • ICICI Card</span>
              </div>
            </div>
            <div class="txn-amount txn-expense">₹650</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 6. Investments Screen
function renderInvestmentsScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Portfolio Wealth Engine</span>
        <h1 class="screen-title">Investment Portfolio</h1>
      </div>
      <div class="screen-actions">
        <a href="stocks.html" class="btn btn-secondary btn-sm">Direct Equities</a>
        <a href="mutualfunds.html" class="btn btn-secondary btn-sm">Mutual Funds</a>
        <button class="btn btn-primary btn-sm" onclick="alert('Rebalance Portfolio')">Auto Rebalance</button>
      </div>
    </div>

    <div class="card-grid-4">
      <div class="stat-card">
        <span class="stat-label">Total Invested Value</span>
        <div class="stat-val">${MOCK_DATA.metrics.totalInvestments}</div>
        <div class="stat-footer stat-delta-positive">${MOCK_DATA.metrics.totalReturns}</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Indian Equities</span>
        <div class="stat-val">₹14,50,000</div>
        <div class="stat-footer stat-delta-positive">+21.4% Overall Return</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Mutual Funds & SIPs</span>
        <div class="stat-val">₹12,80,000</div>
        <div class="stat-footer stat-delta-positive">+16.8% XIRR</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Debt & Sovereign Gold</span>
        <div class="stat-val">₹6,90,000</div>
        <div class="stat-footer">Hedging & Capital Preservation</div>
      </div>
    </div>

    <div class="card-grid-2">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Portfolio Compounding Growth</h3>
          <span class="badge badge-indigo">18.4% CAGR</span>
        </div>
        <div class="chart-container">
          <canvas id="portfolioGrowthCanvas" class="proto-canvas"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Target Asset Allocation</h3>
          <span class="badge badge-primary">Within Tolerance</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 10px;">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
              <span>Large & Mid Cap Equities (Target: 40%)</span>
              <span>42.4% (₹14.5L)</span>
            </div>
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width: 42.4%; background: var(--primary);"></div></div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
              <span>Active Mutual Funds (Target: 35%)</span>
              <span>37.4% (₹12.8L)</span>
            </div>
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width: 37.4%; background: var(--accent-indigo);"></div></div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
              <span>Fixed Deposits & Debt (Target: 15%)</span>
              <span>13.2% (₹4.5L)</span>
            </div>
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width: 13.2%; background: var(--warning);"></div></div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
              <span>Sovereign Gold Bonds (Target: 10%)</span>
              <span>7.0% (₹2.4L)</span>
            </div>
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width: 7%; background: #F59E0B;"></div></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 7. Stocks Screen
function renderStocksScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Direct Equities</span>
        <h1 class="screen-title">Indian Equities Holdings</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-secondary btn-sm" onclick="alert('Add Stock to Watchlist')">+ Watchlist</button>
        <button class="btn btn-primary btn-sm" onclick="alert('Place Buy Order')">Buy Stock</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Live Holdings (Zerodha Broking Sync)</h3>
        <span class="badge badge-income">NIFTY 50 ▲ +0.58%</span>
      </div>
      <table class="proto-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Qty</th>
            <th>Avg Buy Price</th>
            <th>CMP (NSE)</th>
            <th>Current Value</th>
            <th>Unrealized P&L</th>
          </tr>
        </thead>
        <tbody>
          ${MOCK_DATA.stocks.map(s => `
            <tr>
              <td><strong>${s.name}</strong> <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${s.ticker}</span></td>
              <td>${s.shares}</td>
              <td style="font-family: var(--font-mono);">${s.avg}</td>
              <td style="font-family: var(--font-mono); font-weight: 700;">${s.cmp}</td>
              <td style="font-family: var(--font-mono); font-weight: 700;">₹${(parseInt(s.cmp.replace(/[^0-9]/g, '')) * s.shares).toLocaleString('en-IN')}</td>
              <td style="font-family: var(--font-mono); font-weight: 700; color: var(--income);">${s.pnl}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 8. Mutual Funds Screen
function renderMutualFundsScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Systematic Investment Plans</span>
        <h1 class="screen-title">Mutual Funds & SIPs</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-primary btn-sm" onclick="alert('Explore Top Ranked Funds')">Discover Funds</button>
      </div>
    </div>

    <div class="card-grid-3">
      <div class="stat-card">
        <span class="stat-label">Active Monthly SIP</span>
        <div class="stat-val" style="color: var(--primary);">₹35,000 / mo</div>
        <div class="stat-footer">Executing across 4 top funds</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total MF Valuation</span>
        <div class="stat-val">₹12,80,000</div>
        <div class="stat-footer stat-delta-positive">+22.4% Annualized Return</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Next SIP Execution</span>
        <div class="stat-val">October 10</div>
        <div class="stat-footer">Auto-debited from HDFC Salary A/c</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Portfolio Funds</h3>
        <span class="badge badge-primary">Direct Growth Plans</span>
      </div>
      <table class="proto-table">
        <thead>
          <tr>
            <th>Fund Name</th>
            <th>Category</th>
            <th>Monthly SIP</th>
            <th>Latest NAV</th>
            <th>Fund Value</th>
            <th>3Y Returns</th>
          </tr>
        </thead>
        <tbody>
          ${MOCK_DATA.mutualFunds.map(f => `
            <tr>
              <td><strong>${f.name}</strong> <span class="badge badge-warning" style="font-size: 10px;">${f.rating}</span></td>
              <td>${f.cat}</td>
              <td style="font-family: var(--font-mono); font-weight: 700;">${f.sip}</td>
              <td style="font-family: var(--font-mono);">${f.nav}</td>
              <td style="font-family: var(--font-mono); font-weight: 700;">${f.value}</td>
              <td style="font-family: var(--font-mono); font-weight: 700; color: var(--income);">${f.returnPct}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 9. FIRE Calculator Screen
function renderFireScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Financial Independence Retire Early</span>
        <h1 class="screen-title">FIRE Runway Simulator</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-primary btn-sm" onclick="alert('Simulation Recalculated')">Recalculate Model</button>
      </div>
    </div>

    <div class="card-grid-4">
      <div class="stat-card">
        <span class="stat-label">Target FIRE Number</span>
        <div class="stat-val" style="color: var(--accent-flame);">${MOCK_DATA.metrics.fireTarget}</div>
        <div class="stat-footer">Based on 30x annual expenses</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Current Corpus</span>
        <div class="stat-val">${MOCK_DATA.metrics.fireCurrent}</div>
        <div class="stat-footer stat-delta-positive">${MOCK_DATA.metrics.fireProgressPct}% Achieved</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Projected FIRE Age</span>
        <div class="stat-val">42 Years</div>
        <div class="stat-footer">12 years of runway remaining</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Safe Withdrawal Rate</span>
        <div class="stat-val">3.5% / yr</div>
        <div class="stat-footer">Inflation adjusted (6% p.a.)</div>
      </div>
    </div>

    <div class="card-grid-2-1">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Compound Corpus Trajectory vs Retirement Goal</h3>
          <span class="badge badge-warning">Target: 2038</span>
        </div>
        <div class="chart-container">
          <canvas id="fireProjectionCanvas" class="proto-canvas"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Scenario Levers</h3>
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Savings Commitment (₹)</label>
          <input type="range" min="50000" max="250000" step="5000" value="165000" style="width: 100%; accent-color: var(--primary);" oninput="document.getElementById('simSaveVal').innerText = '₹' + parseInt(this.value).toLocaleString('en-IN') + '/mo'" />
          <div id="simSaveVal" style="font-weight: 700; font-family: var(--font-mono); text-align: right;">₹1,65,000/mo</div>
        </div>
        <div class="form-group">
          <label class="form-label">Expected Portfolio Return</label>
          <input type="range" min="8" max="16" step="0.5" value="12" style="width: 100%; accent-color: var(--primary);" oninput="document.getElementById('simRetVal').innerText = this.value + '% p.a.'" />
          <div id="simRetVal" style="font-weight: 700; font-family: var(--font-mono); text-align: right;">12% p.a.</div>
        </div>
        <div style="padding: 12px; border-radius: var(--radius-md); background: var(--bg-surface-muted); margin-top: 16px;">
          <div style="font-size: 12px; color: var(--text-muted);">AI FIRE Insight:</div>
          <div style="font-size: 13px; font-weight: 600; margin-top: 4px;">
            Increasing monthly savings by ₹15,000 advances your target retirement age from 42 to 40.5!
          </div>
        </div>
      </div>
    </div>
  `;
}

// 10. Goals Screen
function renderGoalsScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Milestones & Targets</span>
        <h1 class="screen-title">Financial Life Goals</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-primary btn-sm" onclick="alert('Create New Milestone Goal')">+ Create Goal</button>
      </div>
    </div>

    <div class="card-grid-2">
      ${MOCK_DATA.goals.map(g => `
        <div class="card">
          <div class="card-header">
            <div>
              <span class="badge" style="background: ${g.color}22; color: ${g.color}; margin-bottom: 6px;">${g.tag}</span>
              <h3 class="card-title">${g.title}</h3>
            </div>
            <span class="badge badge-primary">${g.status}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin: 16px 0 8px 0;">
            <div>
              <div style="font-size: 12px; color: var(--text-muted);">Accumulated</div>
              <div style="font-size: 22px; font-weight: 800; font-family: var(--font-mono);">${g.current}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: var(--text-muted);">Target</div>
              <div style="font-size: 16px; font-weight: 700; color: var(--text-secondary); font-family: var(--font-mono);">${g.target}</div>
            </div>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${g.pct}%; background: ${g.color};"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 8px; color: var(--text-muted);">
            <span>${g.pct}% Completed</span>
            <a href="#" style="color: var(--primary); text-decoration: none; font-weight: 600;">Manage Allocations →</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 11. AI Assistant Screen
function renderAiAssistantScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Autonomous Financial Intelligence</span>
        <h1 class="screen-title">Lumina AI Copilot</h1>
      </div>
      <div class="screen-actions">
        <span class="badge badge-income">● Lumina Model v4.2 Active</span>
      </div>
    </div>

    <div class="card-grid-2-1">
      <div class="card" style="display: flex; flex-direction: column; height: 580px;">
        <div class="card-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #0D9488, #4F46E5); display: flex; align-items: center; justify-content: center; color: #fff;">⚡</div>
            <div>
              <div style="font-weight: 700; font-size: 14px;">Lumina Financial Copilot</div>
              <div style="font-size: 11px; color: var(--income);">Context: ₹48.65L Net Worth • 4 Bank Feeds</div>
            </div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="alert('Chat session cleared')">Clear Context</button>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 16px 0; display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">AI</div>
            <div style="background: var(--bg-surface-muted); padding: 12px 16px; border-radius: 14px 14px 14px 2px; max-width: 80%; font-size: 13.5px; border: 1px solid var(--border-subtle);">
              Hello Aditya! I've analyzed your September finances. Your savings rate is currently <strong>68.1%</strong>, which is 8% above your target. How can I assist you with your cashflow, mutual funds, or tax optimization today?
            </div>
          </div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <div style="background: var(--primary); color: #fff; padding: 12px 16px; border-radius: 14px 14px 2px 14px; max-width: 80%; font-size: 13.5px; box-shadow: var(--shadow-primary);">
              Can I afford to purchase an iPhone 16 Pro (₹1,20,000) this month without impacting my FIRE timeline?
            </div>
          </div>

          <div style="display: flex; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">AI</div>
            <div style="background: var(--bg-surface-muted); padding: 12px 16px; border-radius: 14px 14px 14px 2px; max-width: 85%; font-size: 13.5px; border: 1px solid var(--border-subtle);">
              <strong>Affordability Analysis: YES</strong><br><br>
              1. Your monthly surplus is <strong>₹1,66,750</strong>. An outflow of ₹1,20,000 still leaves ₹46,750 in uncommitted liquid savings.<br>
              2. Your Emergency Reserve (₹6.0L) remains 100% intact.<br>
              3. <strong>Recommendation:</strong> Use your HDFC Diners Black card to earn 3.3% reward points (worth ₹3,960) and clear the statement balance before Oct 15.
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px;">
          <div style="display: flex; gap: 8px;">
            <input type="text" class="form-input" placeholder="Ask Lumina anything about your finances..." style="flex: 1;" onkeypress="if(event.key==='Enter') alert('Lumina AI query submitted!')" />
            <button class="btn btn-primary" onclick="alert('Lumina AI query submitted!')">Ask AI</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Prompt Accelerators</h3>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start;" onclick="alert('Evaluating Mutual Fund Overlap...')">
            🔍 "Check portfolio overlap between Parag Parikh & Mirae Large Cap"
          </button>
          <button class="btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start;" onclick="alert('Calculating Tax Loss Harvesting...')">
            📑 "Calculate potential tax-loss harvesting before March 31"
          </button>
          <button class="btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start;" onclick="alert('Generating Weekend Safe Budget...')">
            ☕ "How much can I spend this weekend without exceeding dining budget?"
          </button>
          <button class="btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start;" onclick="alert('Auditing Subscriptions...')">
            💡 "Identify recurring subscriptions I haven't utilized in 30 days"
          </button>
        </div>

        <div style="margin-top: 24px; padding: 16px; border-radius: var(--radius-md); background: var(--bg-surface-muted); border: 1px solid var(--border-subtle);">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">Voice Assistant HUD</div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: var(--income); box-shadow: 0 0 8px var(--income);"></div>
            <span style="font-size: 12px; color: var(--text-secondary);">Microphone listening enabled</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 12. AI Notes Screen
function renderAiNotesScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Smart Journal & OCR</span>
        <h1 class="screen-title">AI Financial Notes & Receipts</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-primary btn-sm" onclick="alert('Upload Receipt for OCR parsing')">+ Scan Receipt</button>
      </div>
    </div>

    <div class="card-grid-3">
      <div class="card">
        <div class="card-header">
          <span class="badge badge-primary">Tax Deductions</span>
          <span style="font-size: 11px; color: var(--text-muted);">Sep 18</span>
        </div>
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">Health Insurance Premium 80D</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
          Receipt parsed: ₹24,800 paid to HDFC ERGO Optima Secure. Automatically tagged for Section 80D tax exemption deduction.
        </p>
        <span class="badge badge-indigo">Auto-Categorized</span>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="badge badge-warning">Investment Memo</span>
          <span style="font-size: 11px; color: var(--text-muted);">Sep 12</span>
        </div>
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">Tata Motors Q2 Earnings Note</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
          EBITDA margins expanded by 140 bps driven by JLR order book. Target price revised to ₹1,150. Maintain holding.
        </p>
        <span class="badge badge-primary">Equities Research</span>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="badge badge-income">Real Estate Note</span>
          <span style="font-size: 11px; color: var(--text-muted);">Sep 05</span>
        </div>
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">Indiranagar Rental Escalation</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
          Rental agreement renewal scheduled for December 2026. 5% standard escalation will increase rent to ₹33,600/mo.
        </p>
        <span class="badge badge-income">Rental Yield</span>
      </div>
    </div>
  `;
}

// 13. Reports Screen
function renderReportsScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Financial Statements</span>
        <h1 class="screen-title">Reports & Tax Summaries</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-secondary btn-sm" onclick="alert('Exporting CSV...')">Export CSV</button>
        <button class="btn btn-primary btn-sm" onclick="alert('Generating Comprehensive PDF Report...')">Download PDF Dossier</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title">Fiscal Year 2026-27 Cash Flow Statement</h3>
        <span class="badge badge-primary">Consolidated Net Worth</span>
      </div>
      <table class="proto-table">
        <thead>
          <tr>
            <th>Financial Metric</th>
            <th>Q1 (Apr - Jun)</th>
            <th>Q2 (Jul - Sep)</th>
            <th>YTD Total</th>
            <th>Annual Run-Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Gross Inflows</strong></td>
            <td>₹6,80,000</td>
            <td>₹7,35,000</td>
            <td style="font-weight: 700; color: var(--income);">₹14,15,000</td>
            <td>₹29,40,000</td>
          </tr>
          <tr>
            <td><strong>Operating Expenses</strong></td>
            <td>₹2,22,000</td>
            <td>₹2,34,750</td>
            <td style="font-weight: 700; color: var(--expense);">₹4,56,750</td>
            <td>₹9,38,000</td>
          </tr>
          <tr>
            <td><strong>Net Capital Invested</strong></td>
            <td>₹4,10,000</td>
            <td>₹4,45,000</td>
            <td style="font-weight: 700; color: var(--primary);">₹8,55,000</td>
            <td>₹17,80,000</td>
          </tr>
          <tr>
            <td><strong>Effective Savings Rate</strong></td>
            <td>67.3%</td>
            <td>68.1%</td>
            <td style="font-weight: 800; color: var(--income);">67.7%</td>
            <td>>65.0% Target</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// 14. Rewards Screen
function renderRewardsScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Gamified Perks & Incentives</span>
        <h1 class="screen-title">LigthsON Coins & Vouchers</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-primary btn-sm" onclick="alert('Redeeming Coins...')">Redeem Coins</button>
      </div>
    </div>

    <div class="card-grid-3">
      <div class="stat-card">
        <span class="stat-label">Available Coin Balance</span>
        <div class="stat-val" style="color: var(--accent-amber);">14,850 🪙</div>
        <div class="stat-footer">Worth ₹1,485 in partner vouchers</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Lifetime Coins Earned</span>
        <div class="stat-val">38,400</div>
        <div class="stat-footer">Top 5% of LigthsON savers</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Next Milestone Unlock</span>
        <div class="stat-val">15,000 Coins</div>
        <div class="stat-footer">150 coins away from ₹500 Amazon Gift Card</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Exclusive Partner Vouchers</h3>
      </div>
      <div class="card-grid-3">
        <div style="padding: 16px; border-radius: var(--radius-md); background: var(--bg-surface-muted); border: 1px solid var(--border-subtle);">
          <div style="font-size: 24px; margin-bottom: 8px;">🛒 Amazon India</div>
          <div style="font-weight: 700; font-size: 15px;">₹500 Gift Voucher</div>
          <div style="font-size: 12px; color: var(--text-muted); margin: 6px 0 14px 0;">Requires 5,000 Coins</div>
          <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="alert('Redeemed Amazon Voucher!')">Redeem for 5k Coins</button>
        </div>
        <div style="padding: 16px; border-radius: var(--radius-md); background: var(--bg-surface-muted); border: 1px solid var(--border-subtle);">
          <div style="font-size: 24px; margin-bottom: 8px;">☕ Starbucks Reserve</div>
          <div style="font-weight: 700; font-size: 15px;">Complimentary Beverage</div>
          <div style="font-size: 12px; color: var(--text-muted); margin: 6px 0 14px 0;">Requires 3,000 Coins</div>
          <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="alert('Redeemed Starbucks Voucher!')">Redeem for 3k Coins</button>
        </div>
        <div style="padding: 16px; border-radius: var(--radius-md); background: var(--bg-surface-muted); border: 1px solid var(--border-subtle);">
          <div style="font-size: 24px; margin-bottom: 8px;">✈️ MakeMyTrip Black</div>
          <div style="font-weight: 700; font-size: 15px;">₹1,500 Flight Discount</div>
          <div style="font-size: 12px; color: var(--text-muted); margin: 6px 0 14px 0;">Requires 10,000 Coins</div>
          <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="alert('Redeemed Flight Voucher!')">Redeem for 10k Coins</button>
        </div>
      </div>
    </div>
  `;
}

// 15. Badges Screen
function renderBadgesScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Financial Mastery Trophy Room</span>
        <h1 class="screen-title">Badges & Streaks</h1>
      </div>
      <div class="screen-actions">
        <span class="badge badge-primary">8 of 12 Unlocked</span>
      </div>
    </div>

    <div class="card-grid-4">
      ${MOCK_DATA.badges.map(b => `
        <div class="card" style="text-align: center; display: flex; flex-direction: column; align-items: center;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 12px; box-shadow: var(--shadow-sm);">
            ${b.icon}
          </div>
          <div style="font-weight: 800; font-size: 15px; margin-bottom: 4px;">${b.name}</div>
          <span class="badge badge-warning" style="margin-bottom: 8px;">${b.tier}</span>
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">${b.desc}</p>
          <span style="font-size: 11px; color: var(--text-muted); margin-top: auto;">Unlocked ${b.earned}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// 16. Notifications Screen
function renderNotificationsScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Intelligence Feed</span>
        <h1 class="screen-title">Notifications & Alerts</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-secondary btn-sm" onclick="alert('All marked as read')">Mark All Read</button>
      </div>
    </div>

    <div class="card">
      <div class="txn-list">
        <div class="txn-row" style="background: var(--primary-soft); border-left: 4px solid var(--primary);">
          <div class="txn-left">
            <div class="txn-icon" style="background: var(--primary); color: #fff;">💡</div>
            <div class="txn-info">
              <span class="txn-title">Monthly SIP Executing in 48 Hours</span>
              <span class="txn-meta">Auto-debit of ₹35,000 will be initiated on Sep 24. Ensure sufficient balance in HDFC A/c.</span>
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="alert('Balance Verified')">Verify Balance</button>
        </div>

        <div class="txn-row">
          <div class="txn-left">
            <div class="txn-icon">💰</div>
            <div class="txn-info">
              <span class="txn-title">Dividend Credited: TCS Interim</span>
              <span class="txn-meta">₹2,400 credited to Zerodha Primary Demat on Sep 18.</span>
            </div>
          </div>
          <span class="badge badge-income">+₹2,400</span>
        </div>

        <div class="txn-row">
          <div class="txn-left">
            <div class="txn-icon">⚡</div>
            <div class="txn-info">
              <span class="txn-title">Electricity Bill Due</span>
              <span class="txn-meta">Tata Power bill of ₹2,350 due on Sep 26. Instant UPI 1-Tap Pay ready.</span>
            </div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="alert('Paid Bill')">Pay ₹2,350</button>
        </div>
      </div>
    </div>
  `;
}

// 17. Profile Screen
function renderProfileScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Account & Credentials</span>
        <h1 class="screen-title">User Profile & KYC</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-secondary btn-sm" onclick="alert('KYC Documents Downloaded')">Download KYC Certificate</button>
      </div>
    </div>

    <div class="card-grid-3">
      <div class="card" style="text-align: center;">
        <div class="user-avatar" style="width: 72px; height: 72px; font-size: 26px; margin: 0 auto 14px auto;">AS</div>
        <h2 style="font-size: 20px; font-weight: 800;">${MOCK_DATA.user.name}</h2>
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">${MOCK_DATA.user.email}</div>
        <span class="badge badge-income">Verified Tier 3 Resident</span>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">CIBIL Credit Score</h3>
          <span class="badge badge-income">Excellent</span>
        </div>
        <div style="font-size: 38px; font-weight: 900; color: var(--income); margin: 10px 0;">${MOCK_DATA.user.cibilScore}</div>
        <p style="font-size: 12px; color: var(--text-muted);">Updated via Equifax / TransUnion on Sep 01, 2026. Zero late payments recorded.</p>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Regulatory Verification</h3>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">PAN Number</span>
            <strong>${MOCK_DATA.user.pan}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Aadhaar Linking</span>
            <strong style="color: var(--income);">Verified (UIDAI)</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">SEBI Demat KYC</span>
            <strong style="color: var(--income);">Active</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Linked Financial Institutions</h3>
      </div>
      <div class="card-grid-3">
        ${MOCK_DATA.user.bankAccounts.map(b => `
          <div style="padding: 16px; border-radius: var(--radius-md); background: var(--bg-surface-muted); border: 1px solid var(--border-subtle);">
            <div style="font-weight: 700; font-size: 14px;">${b.name}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin: 4px 0 10px 0;">${b.number || b.id}</div>
            <div style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); color: var(--primary);">${b.balance || b.value}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 18. Settings Screen
function renderSettingsScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Preferences & Security</span>
        <h1 class="screen-title">Application Settings</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-primary btn-sm" onclick="alert('Settings Saved')">Save Changes</button>
      </div>
    </div>

    <div class="card-grid-2">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Display & Appearance</h3>
        </div>
        <div class="form-group">
          <label class="form-label">Theme Mode</label>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-sm btn-secondary" style="flex: 1;" onclick="toggleProtoTheme()">Toggle Light / Dark</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Primary Currency Display</label>
          <select class="form-select">
            <option selected>Indian Rupee (₹ INR)</option>
            <option>US Dollar ($ USD)</option>
            <option>Euro (€ EUR)</option>
            <option>British Pound (£ GBP)</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Security & Encryption</h3>
        </div>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
            <span>Biometric Fingerprint / Face ID App Lock</span>
            <input type="checkbox" checked />
          </label>
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
            <span>Require Biometrics for Outflows > ₹10,000</span>
            <input type="checkbox" checked />
          </label>
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
            <span>Auto-Hide Sensitive Monetary Balances</span>
            <input type="checkbox" />
          </label>
        </div>
      </div>
    </div>
  `;
}

// 19. Complete Living Design System Screen
function renderDesignSystemScreen(conceptId) {
  return `
    <div class="screen-header">
      <div class="screen-title-wrap">
        <span class="screen-pretitle">Component Tokens & Specification</span>
        <h1 class="screen-title">Design System & Token Architecture</h1>
      </div>
      <div class="screen-actions">
        <button class="btn btn-primary btn-sm" onclick="window.print()">Print Specification</button>
      </div>
    </div>

    <!-- Color Palette Tokens -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title">Design System Palette Tokens</h3>
        <span class="badge badge-primary">Contrast Ratio AAA Compliant</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
        <div style="padding: 12px; border-radius: var(--radius-md); background: var(--primary); color: #fff;">
          <div style="font-weight: 700; font-size: 13px;">Primary</div>
          <div style="font-size: 11px; opacity: 0.9;">--primary</div>
        </div>
        <div style="padding: 12px; border-radius: var(--radius-md); background: var(--income); color: #fff;">
          <div style="font-weight: 700; font-size: 13px;">Income</div>
          <div style="font-size: 11px; opacity: 0.9;">--income</div>
        </div>
        <div style="padding: 12px; border-radius: var(--radius-md); background: var(--expense); color: #fff;">
          <div style="font-weight: 700; font-size: 13px;">Expense</div>
          <div style="font-size: 11px; opacity: 0.9;">--expense</div>
        </div>
        <div style="padding: 12px; border-radius: var(--radius-md); background: var(--warning); color: #fff;">
          <div style="font-weight: 700; font-size: 13px;">Warning</div>
          <div style="font-size: 11px; opacity: 0.9;">--warning</div>
        </div>
        <div style="padding: 12px; border-radius: var(--radius-md); background: var(--accent-indigo); color: #fff;">
          <div style="font-weight: 700; font-size: 13px;">Indigo</div>
          <div style="font-size: 11px; opacity: 0.9;">--accent-indigo</div>
        </div>
        <div style="padding: 12px; border-radius: var(--radius-md); background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-subtle);">
          <div style="font-weight: 700; font-size: 13px;">Surface</div>
          <div style="font-size: 11px; opacity: 0.7;">--bg-surface</div>
        </div>
      </div>
    </div>

    <!-- Typography Scale -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title">Typography Scale</h3>
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
          <span style="font-size: 32px; font-weight: 800;">Display Hero ₹48,65,420</span>
          <span style="font-size: 12px; color: var(--text-muted);">32px / Bold 800</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
          <span style="font-size: 22px; font-weight: 700;">Heading Title</span>
          <span style="font-size: 12px; color: var(--text-muted);">22px / Bold 700</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
          <span style="font-size: 16px; font-weight: 600;">Subheading & Card Titles</span>
          <span style="font-size: 12px; color: var(--text-muted);">16px / Semi 600</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
          <span style="font-size: 14px; font-family: var(--font-mono); font-weight: 700;">₹1,85,000.00 (Monospace Ledger)</span>
          <span style="font-size: 12px; color: var(--text-muted);">14px / Mono 700</span>
        </div>
      </div>
    </div>

    <!-- UI Button & Control Elements -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Interactive Buttons, Badges & Form Controls</h3>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 20px;">
        <button class="btn btn-primary">Primary Action</button>
        <button class="btn btn-secondary">Secondary Action</button>
        <button class="btn btn-soft">Soft Tint</button>
        <button class="btn btn-primary btn-sm">Small Button</button>
        <button class="btn btn-primary btn-lg">Large Hero Action</button>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
        <span class="badge badge-primary">Primary Tag</span>
        <span class="badge badge-income">Inflow Tag</span>
        <span class="badge badge-expense">Outflow Tag</span>
        <span class="badge badge-warning">Attention Tag</span>
        <span class="badge badge-indigo">Portfolio Tag</span>
      </div>
    </div>
  `;
}

module.exports = {
  renderScreenContent
};

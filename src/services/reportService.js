import * as FileSystem from "expo-file-system/legacy";
import { LOGO_DATA_URI } from "../components/brand/logoSvg";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { API_BASE_URL } from "../config/api";
import { getUserSession } from "../utils/secureStorage";

class ReportService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Fetch user transactions
  async fetchUserTransactions(username, startDate = null, endDate = null) {
    try {
      const response = await fetch(`${this.baseURL}/transactions/${username}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data = await response.json();
      let transactions = data.transactions || [];

      // Filter by date range if provided
      if (startDate && endDate) {
        transactions = transactions.filter((transaction) => {
          const transactionDate = new Date(
            this.normalizeDate(transaction.date)
          );
          return (
            transactionDate >= new Date(startDate) &&
            transactionDate <= new Date(endDate)
          );
        });
      }

      return transactions;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  // Normalize date format
  normalizeDate(dateString) {
    if (dateString && dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    return dateString;
  }

  // Calculate financial summary
  calculateFinancialSummary(transactions) {
    const summary = {
      totalIncome: 0,
      totalExpenses: 0,
      totalInvestments: 0,
      netSavings: 0,
      transactionCounts: {
        income: 0,
        expenses: 0,
        investments: 0,
      },
      categoryBreakdown: {
        income: {},
        expenses: {},
        investments: {},
      },
    };

    transactions.forEach((transaction) => {
      const amount = parseFloat(transaction.amount) || 0;
      const category = transaction.subType || "Other";

      switch (transaction.type) {
        case "Income":
          summary.totalIncome += amount;
          summary.transactionCounts.income++;
          summary.categoryBreakdown.income[category] =
            (summary.categoryBreakdown.income[category] || 0) + amount;
          break;
        case "Expense":
          summary.totalExpenses += amount;
          summary.transactionCounts.expenses++;
          summary.categoryBreakdown.expenses[category] =
            (summary.categoryBreakdown.expenses[category] || 0) + amount;
          break;
        case "Investment":
          summary.totalInvestments += amount;
          summary.transactionCounts.investments++;
          summary.categoryBreakdown.investments[category] =
            (summary.categoryBreakdown.investments[category] || 0) + amount;
          break;
      }
    });

    summary.netSavings =
      summary.totalIncome - summary.totalExpenses - summary.totalInvestments;
    return summary;
  }

  // Generate HTML for A4 PDF with Ligths logo
  generateReportHTML(reportData, reportType, userInfo) {
    const { transactions, summary, dateRange } = reportData;
    const currentDate = new Date().toLocaleDateString("en-IN");

    // Base64 encoded Ligths logo (you would replace this with actual base64 of your logo)
    const ligthsLogoBase64 = LOGO_DATA_URI;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportType} Report</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          line-height: 1.6;
          color: #1f2937;
          margin: 0;
          padding: 0;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
        }
        
        .logo {
          width: 120px;
          height: auto;
          margin-right: 20px;
        }
        
        .company-info h1 {
          margin: 0;
          font-size: 28px;
          color: #1f2937;
          font-weight: bold;
        }
        
        .company-info p {
          margin: 5px 0 0 0;
          color: #6b7280;
          font-size: 14px;
        }
        
        .report-info {
          text-align: right;
        }
        
        .report-info h2 {
          margin: 0;
          font-size: 20px;
          color: #3b82f6;
        }
        
        .report-info p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 12px;
        }
        
        .user-info {
          background-color: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        
        .user-info h3 {
          margin: 0 0 10px 0;
          color: #1f2937;
          font-size: 16px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .summary-card {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        
        .summary-card.income {
          border-left: 4px solid #10b981;
        }
        
        .summary-card.expense {
          border-left: 4px solid #ef4444;
        }
        
        .summary-card.investment {
          border-left: 4px solid #3b82f6;
        }
        
        .summary-card.savings {
          border-left: 4px solid #8b5cf6;
        }
        
        .summary-card h4 {
          margin: 0 0 8px 0;
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
          font-weight: 600;
        }
        
        .summary-card .amount {
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }
        
        .income .amount { color: #10b981; }
        .expense .amount { color: #ef4444; }
        .investment .amount { color: #3b82f6; }
        .savings .amount { color: #8b5cf6; }
        
        .section {
          margin-bottom: 25px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .transaction-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 12px;
        }
        
        .transaction-table th {
          background-color: #f3f4f6;
          color: #374151;
          font-weight: 600;
          padding: 10px 8px;
          text-align: left;
          border: 1px solid #d1d5db;
        }
        
        .transaction-table td {
          padding: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .transaction-table tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .amount-cell {
          text-align: right;
          font-weight: 600;
        }
        
        .income-amount { color: #10b981; }
        .expense-amount { color: #ef4444; }
        .investment-amount { color: #3b82f6; }
        
        .category-breakdown {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 20px;
        }
        
        .category-section {
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 15px;
        }
        
        .category-section h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 600;
        }
        
        .category-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
        }
        
        .category-item:last-child {
          border-bottom: none;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
        }
        
        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="logo-section">
          <img src="${ligthsLogoBase64}" alt="LigthsON" class="logo">
          <div class="company-info">
            <h1>LigthsON</h1>
            <p>Personal Finance Management</p>
          </div>
        </div>
        <div class="report-info">
          <h2>${reportType} Report</h2>
          <p>Generated on: ${currentDate}</p>
          <p>Period: ${dateRange || "All Time"}</p>
        </div>
      </div>

      <!-- User Information -->
      <div class="user-info">
        <h3>Account Information</h3>
        <p><strong>User:</strong> ${userInfo.username || "N/A"}</p>
        <p><strong>Email:</strong> ${userInfo.email || "N/A"}</p>
        <p><strong>Report Type:</strong> ${reportType}</p>
      </div>

      <!-- Financial Summary -->
      <div class="summary-grid">
        <div class="summary-card income">
          <h4>Total Income</h4>
          <p class="amount">₹${summary.totalIncome.toLocaleString("en-IN")}</p>
          <p style="font-size: 10px; margin: 5px 0 0 0; color: #6b7280;">
            ${summary.transactionCounts.income} transactions
          </p>
        </div>
        <div class="summary-card expense">
          <h4>Total Expenses</h4>
          <p class="amount">₹${summary.totalExpenses.toLocaleString(
      "en-IN"
    )}</p>
          <p style="font-size: 10px; margin: 5px 0 0 0; color: #6b7280;">
            ${summary.transactionCounts.expenses} transactions
          </p>
        </div>
        <div class="summary-card investment">
          <h4>Total Investments</h4>
          <p class="amount">₹${summary.totalInvestments.toLocaleString(
      "en-IN"
    )}</p>
          <p style="font-size: 10px; margin: 5px 0 0 0; color: #6b7280;">
            ${summary.transactionCounts.investments} transactions
          </p>
        </div>
        <div class="summary-card savings">
          <h4>Net Savings</h4>
          <p class="amount">₹${summary.netSavings.toLocaleString("en-IN")}</p>
          <p style="font-size: 10px; margin: 5px 0 0 0; color: #6b7280;">
            ${summary.netSavings >= 0 ? "Surplus" : "Deficit"}
          </p>
        </div>
      </div>

      ${this.generateTransactionTable(transactions)}
      
      ${this.generateCategoryBreakdown(summary.categoryBreakdown)}

      <!-- Footer -->
      <div class="footer">
        <p>This report was generated by LigthsON Personal Finance Management System</p>
        <p>© ${new Date().getFullYear()} LigthsON. All rights reserved.</p>
      </div>
    </body>
    </html>
    `;
  }

  // Generate transaction table HTML
  generateTransactionTable(transactions) {
    if (!transactions || transactions.length === 0) {
      return `
        <div class="section">
          <h3 class="section-title">Recent Transactions</h3>
          <p>No transactions found for the selected period.</p>
        </div>
      `;
    }

    // Sort transactions by date (most recent first)
    const sortedTransactions = transactions.sort((a, b) => {
      const dateA = new Date(this.normalizeDate(a.date));
      const dateB = new Date(this.normalizeDate(b.date));
      return dateB - dateA;
    });

    const tableRows = sortedTransactions
      .map((transaction) => {
        const amountClass = transaction.type.toLowerCase() + "-amount";
        return `
        <tr>
          <td>${this.formatDate(transaction.date)}</td>
          <td>${transaction.name || "N/A"}</td>
          <td>${transaction.type}</td>
          <td>${transaction.subType || "N/A"}</td>
          <td class="amount-cell ${amountClass}">₹${parseFloat(
          transaction.amount || 0
        ).toLocaleString("en-IN")}</td>
          <td>${transaction.method || "N/A"}</td>
          <td style="font-size: 10px;">${transaction.description || "-"}</td>
        </tr>
      `;
      })
      .join("");

    return `
      <div class="section">
        <h3 class="section-title">Transaction Details</h3>
        <table class="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  }

  // Generate category breakdown HTML
  generateCategoryBreakdown(categoryBreakdown) {
    const generateCategoryList = (categories, title, colorClass) => {
      const items = Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .map(
          ([category, amount]) =>
            `<div class="category-item">
            <span>${category}</span>
            <span class="${colorClass}">₹${amount.toLocaleString(
              "en-IN"
            )}</span>
          </div>`
        )
        .join("");

      return `
        <div class="category-section">
          <h4>${title}</h4>
          ${items ||
        '<p style="font-size: 12px; color: #6b7280;">No data available</p>'
        }
        </div>
      `;
    };

    return `
      <div class="section">
        <h3 class="section-title">Category Breakdown</h3>
        <div class="category-breakdown">
          ${generateCategoryList(
      categoryBreakdown.income,
      "Income Sources",
      "income-amount"
    )}
          ${generateCategoryList(
      categoryBreakdown.expenses,
      "Expense Categories",
      "expense-amount"
    )}
          ${generateCategoryList(
      categoryBreakdown.investments,
      "Investment Types",
      "investment-amount"
    )}
        </div>
      </div>
    `;
  }

  // Format date for display
  formatDate(dateString) {
    const date = new Date(this.normalizeDate(dateString));
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // Generate Monthly Report
  async generateMonthlyReport(month, year) {
    try {
      const parsedInfo = await getUserSession();
      if (!parsedInfo) {
        throw new Error("User not logged in");
      }

      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      // Calculate date range for the month
      const startDate = `${year}-${month.padStart(2, "0")}-01`;
      const endDate = new Date(year, parseInt(month), 0)
        .toISOString()
        .split("T")[0];

      const transactions = await this.fetchUserTransactions(
        username,
        startDate,
        endDate
      );
      const summary = this.calculateFinancialSummary(transactions);

      const reportData = {
        transactions,
        summary,
        dateRange: `${this.getMonthName(month)} ${year}`,
      };

      const html = this.generateReportHTML(reportData, "Monthly Financial", {
        username,
        email: parsedInfo?.user?.email || "N/A",
      });

      return await this.createAndSharePDF(
        html,
        `Monthly_Report_${month}_${year}.pdf`
      );
    } catch (error) {
      console.error("Error generating monthly report:", error);
      throw error;
    }
  }

  // Generate Annual Report
  async generateAnnualReport(year) {
    try {
      const parsedInfo = await getUserSession();
      if (!parsedInfo) {
        throw new Error("User not logged in");
      }

      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const transactions = await this.fetchUserTransactions(
        username,
        startDate,
        endDate
      );
      const summary = this.calculateFinancialSummary(transactions);

      const reportData = {
        transactions,
        summary,
        dateRange: `Year ${year}`,
      };

      const html = this.generateReportHTML(reportData, "Annual Financial", {
        username,
        email: parsedInfo?.user?.email || "N/A",
      });

      return await this.createAndSharePDF(html, `Annual_Report_${year}.pdf`);
    } catch (error) {
      console.error("Error generating annual report:", error);
      throw error;
    }
  }

  // Generate Custom Date Range Report
  async generateCustomReport(startDate, endDate) {
    try {
      const parsedInfo = await getUserSession();
      if (!parsedInfo) {
        throw new Error("User not logged in");
      }

      const username = parsedInfo?.user?.username || parsedInfo?.user?.userName;

      const transactions = await this.fetchUserTransactions(
        username,
        startDate,
        endDate
      );
      const summary = this.calculateFinancialSummary(transactions);

      const reportData = {
        transactions,
        summary,
        dateRange: `${this.formatDate(startDate)} to ${this.formatDate(
          endDate
        )}`,
      };

      const html = this.generateReportHTML(
        reportData,
        "Custom Period Financial",
        {
          username,
          email: parsedInfo?.user?.email || "N/A",
        }
      );

      const fileName = `Custom_Report_${startDate}_to_${endDate}.pdf`;
      return await this.createAndSharePDF(html, fileName);
    } catch (error) {
      console.error("Error generating custom report:", error);
      throw error;
    }
  }

  // Create PDF and share
  async createAndSharePDF(html, fileName) {
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Create a new file with proper name
      const newUri = FileSystem.documentDirectory + fileName;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Financial Report",
        });
      }

      return newUri;
    } catch (error) {
      console.error("Error creating/sharing PDF:", error);
      throw error;
    }
  }

  // Helper function to get month name
  getMonthName(monthNumber) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[parseInt(monthNumber) - 1];
  }
}

export default new ReportService();

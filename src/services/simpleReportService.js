import * as FileSystem from "expo-file-system/legacy";
import { LOGO_DATA_URI } from "../components/brand/logoSvg";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { auth } from "../config/FirebaseConfig";
import { getTransactions } from "./firestoreService";

class SimpleReportService {
  constructor() {
  }

  // Fetch user transactions
  async fetchUserTransactions(uid, startDate = null, endDate = null) {
    try {
      let transactions = await getTransactions(uid);

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
      transactionCount: transactions.length,
    };

    transactions.forEach((transaction) => {
      const amount = parseFloat(transaction.amount) || 0;

      switch (transaction.type) {
        case "Income":
          summary.totalIncome += amount;
          break;
        case "Expense":
          summary.totalExpenses += amount;
          break;
        case "Investment":
          summary.totalInvestments += amount;
          break;
      }
    });

    summary.netSavings =
      summary.totalIncome - summary.totalExpenses - summary.totalInvestments;
    return summary;
  }

  // Generate simple professional HTML for A4 PDF
  generateSimpleReportHTML(reportData, reportType, userInfo) {
    const { transactions, summary, dateRange } = reportData;
    const currentDate = new Date().toLocaleDateString("en-IN");

    // Get the logo as base64 (you would replace this with actual logo conversion)
    const logoBase64 = LOGO_DATA_URI;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportType} Report</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.5;
          color: #333;
          margin: 0;
          padding: 0;
        }
        

        
        .user-info {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          border-left: 4px solid #3b82f6;
        }
        
        .user-info-title {
          font-size: 16px;
          font-weight: bold;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .user-details {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #475569;
        }
        
        .summary-section {
          margin-bottom: 30px;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #1e293b;
          margin-bottom: 20px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 25px;
        }
        
        .summary-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .summary-card.income {
          border-left: 6px solid #10b981;
          background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
        }
        
        .summary-card.expense {
          border-left: 6px solid #ef4444;
          background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
        }
        
        .summary-card.investment {
          border-left: 6px solid #3b82f6;
          background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
        }
        
        .summary-card.savings {
          border-left: 6px solid #8b5cf6;
          background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
        }
        
        .summary-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        
        .summary-amount {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .summary-note {
          font-size: 11px;
          color: #64748b;
        }
        
        .income .summary-amount { color: #10b981; }
        .expense .summary-amount { color: #ef4444; }
        .investment .summary-amount { color: #3b82f6; }
        .savings .summary-amount { color: #8b5cf6; }
        
        .transactions-section {
          margin-top: 25px;
        }
        
        .transaction-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 15px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .transaction-table th {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          font-weight: 600;
          padding: 12px 8px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .transaction-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .transaction-table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        
        .transaction-table tbody tr:hover {
          background-color: #e2e8f0;
        }
        
        .amount-cell {
          text-align: right;
          font-weight: 600;
        }
        
        .income-amount { color: #10b981; }
        .expense-amount { color: #ef4444; }
        .investment-amount { color: #3b82f6; }
        
        .footer {
          margin-top: 40px;
          padding: 20px;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: white;
          border-radius: 8px;
          text-align: center;
        }
        
        .footer-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .footer-text {
          font-size: 12px;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <!-- Brand header -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <img src="${logoBase64}" alt="LigthsON" style="width: 44px; height: 44px;">
        <div>
          <div style="font-size: 20px; font-weight: 700; color: #0C110E;">LigthsON</div>
          <div style="font-size: 12px; color: #5B675F;">Personal Finance Management</div>
        </div>
      </div>

      <!-- Report Information Bar -->
      <div style="background: #f8fafc; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #64748b;">
          <span><strong style="color: #1e293b;">${reportType}</strong> | Period: ${dateRange || "All Time"
      }</span>
          <span>Generated: ${currentDate}</span>
        </div>
      </div>

      <!-- User Information -->
      <div class="user-info">
        <div class="user-info-title">Account Summary</div>
        <div class="user-details">
          <span><strong>User:</strong> ${userInfo.username || "N/A"}</span>
          <span><strong>Email:</strong> ${userInfo.email || "N/A"}</span>
          <span><strong>Total Transactions:</strong> ${summary.transactionCount
      }</span>
        </div>
      </div>

      <!-- Financial Summary -->
      <div class="summary-section">
        <h2 class="section-title">💰 Financial Overview</h2>
        <div class="summary-grid">
          <div class="summary-card income">
            <div class="summary-label">Total Income</div>
            <div class="summary-amount">₹${summary.totalIncome.toLocaleString(
        "en-IN"
      )}</div>
            <div class="summary-note">Money earned</div>
          </div>
          <div class="summary-card expense">
            <div class="summary-label">Total Expenses</div>
            <div class="summary-amount">₹${summary.totalExpenses.toLocaleString(
        "en-IN"
      )}</div>
            <div class="summary-note">Money spent</div>
          </div>
          <div class="summary-card investment">
            <div class="summary-label">Total Investments</div>
            <div class="summary-amount">₹${summary.totalInvestments.toLocaleString(
        "en-IN"
      )}</div>
            <div class="summary-note">Money invested</div>
          </div>
          <div class="summary-card savings">
            <div class="summary-label">Net Savings</div>
            <div class="summary-amount">₹${summary.netSavings.toLocaleString(
        "en-IN"
      )}</div>
            <div class="summary-note">${summary.netSavings >= 0 ? "Surplus" : "Deficit"
      }</div>
          </div>
        </div>
      </div>

      ${this.generateTransactionTable(transactions)}

      <!-- Professional Footer -->
      <div class="footer">
        <div class="footer-title">LigthsON Personal Finance Management</div>
        <div class="footer-text">
          This report contains confidential financial information. Keep it secure.<br>
          © ${new Date().getFullYear()} LigthsON. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Generate simplified transaction table
  generateTransactionTable(transactions) {
    if (!transactions || transactions.length === 0) {
      return `
        <div class="transactions-section">
          <h2 class="section-title">📊 Transaction History</h2>
          <div style="text-align: center; padding: 40px; background: #f8fafc; border-radius: 8px; color: #64748b;">
            <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
            <p style="font-size: 16px; margin: 0;">No transactions found for the selected period.</p>
          </div>
        </div>
      `;
    }

    // Sort transactions by date (most recent first)
    const sortedTransactions = transactions
      .sort((a, b) => {
        const dateA = new Date(this.normalizeDate(a.date));
        const dateB = new Date(this.normalizeDate(b.date));
        return dateB - dateA;
      });

    const tableRows = sortedTransactions
      .map((transaction, index) => {
        const amountClass = transaction.type.toLowerCase() + "-amount";
        const rowClass = index % 2 === 0 ? "even-row" : "odd-row";
        return `
        <tr class="${rowClass}">
          <td style="font-weight: 500;">${this.formatDate(
          transaction.date
        )}</td>
          <td>${transaction.name || "N/A"}</td>
          <td>
            <span style="
              background: ${transaction.type === "Income"
            ? "#dcfce7"
            : transaction.type === "Expense"
              ? "#fee2e2"
              : "#dbeafe"
          };
              color: ${transaction.type === "Income"
            ? "#166534"
            : transaction.type === "Expense"
              ? "#991b1b"
              : "#1e40af"
          };
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
            ">${transaction.type}</span>
          </td>
          <td style="color: #64748b;">${transaction.subType || "N/A"}</td>
          <td class="amount-cell ${amountClass}">₹${parseFloat(
            transaction.amount || 0
          ).toLocaleString("en-IN")}</td>
        </tr>
      `;
      })
      .join("");

    return `
      <div class="transactions-section">
        <h2 class="section-title">📊 Transaction History</h2>
        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            📝 Showing all ${sortedTransactions.length
      } transactions for the selected period.
          </p>
        </div>
        <table class="transaction-table">
          <thead>
            <tr>
              <th style="width: 15%;">📅 Date</th>
              <th style="width: 30%;">📋 Description</th>
              <th style="width: 15%;">🏷️ Type</th>
              <th style="width: 20%;">📂 Category</th>
              <th style="width: 20%;">💰 Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
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
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not logged in");
      }

      const uid = user.uid;
      const username = user.displayName || "User";

      // Calculate date range for the month
      const startDate = `${year}-${month.padStart(2, "0")}-01`;
      const endDate = new Date(year, parseInt(month), 0)
        .toISOString()
        .split("T")[0];

      const transactions = await this.fetchUserTransactions(
        uid,
        startDate,
        endDate
      );
      const summary = this.calculateFinancialSummary(transactions);

      const reportData = {
        transactions,
        summary,
        dateRange: `${this.getMonthName(month)} ${year}`,
      };

      const html = this.generateSimpleReportHTML(
        reportData,
        "Monthly Financial",
        {
          username,
          email: user.email || "N/A",
        }
      );

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
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not logged in");
      }

      const uid = user.uid;
      const username = user.displayName || "User";

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const transactions = await this.fetchUserTransactions(
        uid,
        startDate,
        endDate
      );
      const summary = this.calculateFinancialSummary(transactions);

      const reportData = {
        transactions,
        summary,
        dateRange: `Year ${year}`,
      };

      const html = this.generateSimpleReportHTML(
        reportData,
        "Annual Financial",
        {
          username,
          email: user.email || "N/A",
        }
      );

      return await this.createAndSharePDF(html, `Annual_Report_${year}.pdf`);
    } catch (error) {
      console.error("Error generating annual report:", error);
      throw error;
    }
  }

  // Generate Custom Date Range Report
  async generateCustomReport(startDate, endDate) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not logged in");
      }

      const uid = user.uid;
      const username = user.displayName || "User";

      const transactions = await this.fetchUserTransactions(
        uid,
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

      const html = this.generateSimpleReportHTML(
        reportData,
        "Custom Period Financial",
        {
          username,
          email: user.email || "N/A",
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

  // Share report method
  async shareReport(reportType, param1, param2) {
    try {
      let result;

      switch (reportType) {
        case "monthly":
          result = await this.generateMonthlyReport(param1, param2);
          break;
        case "annual":
          result = await this.generateAnnualReport(param2);
          break;
        case "custom":
          result = await this.generateCustomReport(param1, param2);
          break;
      }

      return result;
    } catch (error) {
      console.error("Error sharing report:", error);
      throw error;
    }
  }

  // Generate HTML for monthly report
  async generateMonthlyReportHtml(month, year) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not logged in");
      }

      const uid = user.uid;
      const username = user.displayName || "User";

      const startDate = `${year}-${month.padStart(2, "0")}-01`;
      const endDate = new Date(year, parseInt(month), 0)
        .toISOString()
        .split("T")[0];

      const transactions = await this.fetchUserTransactions(
        uid,
        startDate,
        endDate
      );
      const summary = this.calculateFinancialSummary(transactions);

      const reportData = {
        transactions,
        summary,
        dateRange: `${this.getMonthName(month)} ${year}`,
      };

      return this.generateSimpleReportHTML(reportData, "Monthly Financial", {
        username,
        email: user.email || "N/A",
      });
    } catch (error) {
      console.error("Error generating monthly report HTML:", error);
      throw error;
    }
  }

  // Generate HTML for annual report
  async generateAnnualReportHtml(year) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not logged in");
      }

      const uid = user.uid;
      const username = user.displayName || "User";

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const transactions = await this.fetchUserTransactions(
        uid,
        startDate,
        endDate
      );
      const summary = this.calculateFinancialSummary(transactions);

      const reportData = {
        transactions,
        summary,
        dateRange: `Year ${year}`,
      };

      return this.generateSimpleReportHTML(reportData, "Annual Financial", {
        username,
        email: user.email || "N/A",
      });
    } catch (error) {
      console.error("Error generating annual report HTML:", error);
      throw error;
    }
  }

  // Generate HTML for custom report
  async generateCustomReportHtml(startDate, endDate) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not logged in");
      }

      const uid = user.uid;
      const username = user.displayName || "User";

      const transactions = await this.fetchUserTransactions(
        uid,
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

      return this.generateSimpleReportHTML(
        reportData,
        "Custom Period Financial",
        {
          username,
          email: user.email || "N/A",
        }
      );
    } catch (error) {
      console.error("Error generating custom report HTML:", error);
      throw error;
    }
  }

  // Auto generate previous month report and save locally
  async autoGeneratePreviousMonthReport(uid) {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      // Calculate previous month details
      const now = new Date();
      let prevMonth = now.getMonth(); // 0-indexed, if June (5) it returns May (4)
      let prevYear = now.getFullYear();
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }

      const monthStr = String(prevMonth).padStart(2, "0");
      const yearStr = String(prevYear);
      const fileName = `Auto_Report_${monthStr}_${yearStr}.pdf`;
      const localUri = FileSystem.documentDirectory + fileName;

      // Check if file already exists in local storage
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        return localUri;
      }

      // Fetch transactions first to verify if there is any transaction history
      const transactions = await this.fetchUserTransactions(
        uid,
        `${yearStr}-${monthStr}-01`,
        new Date(prevYear, prevMonth, 0).toISOString().split("T")[0]
      );

      if (transactions.length === 0) {
        // No transactions, do not generate empty PDF, return null
        return null;
      }

      // If transactions exist, generate PDF report in background
      const html = await this.generateMonthlyReportHtml(monthStr, yearStr);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Move PDF to final destination
      await FileSystem.moveAsync({
        from: uri,
        to: localUri,
      });

      console.log("Auto-generated monthly report PDF saved locally:", localUri);
      return localUri;
    } catch (error) {
      console.error("Error auto-generating monthly report:", error);
      return null;
    }
  }
}

export default new SimpleReportService();

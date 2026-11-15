import React, { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  Award, 
  Users, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ChevronRight, 
  Check, 
  X, 
  ShieldAlert, 
  ArrowUpDown, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  AlertCircle,
  Coins,
  ChevronDown,
  Lock
} from "lucide-react";
import { auth, db, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  doc, 
  getDoc,
  collection, 
  query, 
  onSnapshot, 
  orderBy
} from "firebase/firestore";

// Approve / reject / complete run on the server, which re-checks admin rights.
const reviewRewardClaim = httpsCallable(functions, "reviewRewardClaim");

// Admin access comes only from an admins/{uid} document (Firebase console or
// scripts/securityMigration.js). Firestore rules and Cloud Functions enforce
// the same check, so this screen cannot be bypassed from the browser.

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  
  // Dashboard state
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  
  // Navigation / View State
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" or "claims"
  const [rewardsMenuOpen, setRewardsMenuOpen] = useState(true);
  
  // Search, Filter, Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest"); // "newest", "oldest", "highestCoins"
  
  // Drawer / Modal States
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'approve'|'complete', claim: ... }
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add a toast notification
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        let isAdminUser = false;
        try {
          const adminSnap = await getDoc(doc(db, "admins", user.uid));
          isAdminUser = adminSnap.exists();
        } catch (err) {
          console.error("Admin check failed", err);
        }

        if (isAdminUser) {
          setCurrentUser(user);
          setIsAdmin(true);
          setAuthError("");
        } else {
          setAuthError("Unauthorized. You do not have administrator privileges.");
          await signOut(auth);
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // Real-time Firestore query for all claims
  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    setClaimsLoading(true);
    const q = query(collection(db, "rewardClaims"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const claimsData = [];
      snapshot.forEach((docSnap) => {
        claimsData.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setClaims(claimsData);
      setClaimsLoading(false);
    }, (error) => {
      console.error("Firestore claims stream error:", error);
      addToast("Failed to fetch real-time claims data.", "error");
      setClaimsLoading(false);
    });

    return unsubscribe;
  }, [currentUser, isAdmin]);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login failed:", err);
      let msg = "Invalid email or password.";
      if (err.code === "auth/user-not-found") msg = "User account not found.";
      if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      setAuthError(msg);
      setAuthLoading(false);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      addToast("Logged out successfully");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // Approve Claim Transaction logic
  const handleApprove = async (claim) => {
    setConfirmDialog(null);
    try {
      addToast("Processing approval...");
      
      await reviewRewardClaim({ claimId: claim.id, action: "approve" });

      addToast("Claim approved.");
      if (selectedClaim?.id === claim.id) {
        setSelectedClaim(prev => ({ ...prev, status: "Approved" }));
      }
    } catch (err) {
      console.error("Approval transaction failed:", err);
      addToast(err.message || "Approval transaction failed.", "error");
    }
  };

  // Reject Claim logic
  const handleReject = async (claim, reason) => {
    setIsRejectModalOpen(false);
    setRejectReason("");
    try {
      addToast("Processing rejection...");
      
      await reviewRewardClaim({ claimId: claim.id, action: "reject", reason: reason.trim() });

      addToast(`Claim rejected and ${claim.coinsRequired} coins refunded to the user.`);
      if (selectedClaim?.id === claim.id) {
        setSelectedClaim(prev => ({ ...prev, status: "Rejected", rejectedReason: reason }));
      }
    } catch (err) {
      console.error("Rejection transaction failed:", err);
      addToast(err.message || "Failed to reject claim.", "error");
    }
  };

  // Complete Claim logic
  const handleComplete = async (claim) => {
    setConfirmDialog(null);
    try {
      addToast("Marking as completed...");
      
      await reviewRewardClaim({ claimId: claim.id, action: "complete" });

      addToast("Claim marked as Completed!");
      if (selectedClaim?.id === claim.id) {
        setSelectedClaim(prev => ({ ...prev, status: "Completed" }));
      }
    } catch (err) {
      console.error("Completion transaction failed:", err);
      addToast(err.message || "Failed to complete claim.", "error");
    }
  };

  // Calculate statistics from the local snapshot of claims
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let completed = 0;
    let rejected = 0;

    claims.forEach((c) => {
      if (c.status === "Pending") pending++;
      else if (c.status === "Approved") approved++;
      else if (c.status === "Completed") completed++;
      else if (c.status === "Rejected") rejected++;
    });

    return {
      pending,
      approved,
      completed,
      rejected,
      totalIssued: completed // Total Rewards Issued corresponds to Completed claims count
    };
  }, [claims]);

  // Search, Filter, Sort Claims
  const processedClaims = useMemo(() => {
    let result = [...claims];

    // Filter by Status
    if (statusFilter !== "All") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Filter by Search Term
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => {
        return (
          c.fullName?.toLowerCase().includes(term) ||
          c.userName?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term) ||
          c.phoneNumber?.toLowerCase().includes(term) ||
          c.rewardName?.toLowerCase().includes(term)
        );
      });
    }

    // Sort Claims
    result.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;

      if (sortBy === "newest") {
        return bTime - aTime;
      }
      if (sortBy === "oldest") {
        return aTime - bTime;
      }
      if (sortBy === "highestCoins") {
        return (b.coinsRequired || 0) - (a.coinsRequired || 0);
      }
      return 0;
    });

    return result;
  }, [claims, statusFilter, searchTerm, sortBy]);

  // Paginated claims list
  const paginatedClaims = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedClaims.slice(startIndex, startIndex + itemsPerPage);
  }, [processedClaims, currentPage]);

  const totalPages = Math.ceil(processedClaims.length / itemsPerPage);

  // Status Style utilities
  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  // Auth screen layout
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-blue-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-indigo-500 animate-spin-reverse"></div>
        </div>
        <p className="mt-6 text-sm tracking-wider text-slate-400 font-medium">Verifying Administrator Session...</p>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        {/* Subtle glowing elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-4 animate-pulse">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">LigthsON Admin</h1>
            <p className="text-slate-400 text-xs mt-1">Reward Claim Management System Panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input 
                type="email" 
                name="email"
                required
                autoComplete="email"
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                placeholder="admin@lightson.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" 
                name="password"
                required
                autoComplete="current-password"
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition duration-200 transform active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              Sign In to System
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans overflow-x-hidden">
      {/* Toast System */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-slide-in ${
              toast.type === "error" 
                ? "bg-rose-950/80 border-rose-500/30 text-rose-200" 
                : "bg-slate-900/90 border-emerald-500/30 text-slate-100"
            }`}
          >
            {toast.type === "error" ? (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Confirm Action</h3>
            <p className="text-slate-400 text-sm mb-6">
              {confirmDialog.type === "approve" 
                ? `Approve this claim? The user already paid ${confirmDialog.claim.coinsRequired.toLocaleString()} coins when they requested it; nothing more is deducted.`
                : `Are you sure you want to mark this claim as completed?`
              }
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (confirmDialog.type === "approve") handleApprove(confirmDialog.claim);
                  else handleComplete(confirmDialog.claim);
                }}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-lg transition ${
                  confirmDialog.type === "approve"
                    ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                }`}
              >
                {confirmDialog.type === "approve" ? "Confirm Approve" : "Confirm Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Reject Reward Claim</h3>
            <p className="text-slate-400 text-sm mb-4">
              Specify the reason why you are rejecting this claim. This will be visible to the mobile user in their history.
            </p>
            <textarea 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Activity audit failed or coins discrepancy detected..."
              className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition text-sm h-28 resize-none mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectReason("");
                }}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleReject(selectedClaim, rejectReason)}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 transition"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar Menu */}
      <aside className="w-72 border-r border-slate-900 bg-slate-900/30 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-900/60 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-md font-extrabold text-white tracking-tight leading-none">LigthsON</h2>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Admin Suite</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => {
              setActiveTab("dashboard");
              setSelectedClaim(null);
            }}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
              activeTab === "dashboard" 
                ? "bg-blue-600/10 text-blue-400 border-l-[3px] border-blue-500 pl-3.5" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>

          <div className="space-y-1">
            <button 
              onClick={() => setRewardsMenuOpen(!rewardsMenuOpen)}
              className="w-full flex items-center justify-between gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold tracking-wide text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition duration-150"
            >
              <div className="flex items-center gap-3.5">
                <Award className="w-5 h-5" />
                <span>Rewards</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition duration-200 ${rewardsMenuOpen ? "transform rotate-180" : ""}`} />
            </button>

            {rewardsMenuOpen && (
              <div className="pl-6 space-y-1">
                <button 
                  onClick={() => {
                    setActiveTab("claims");
                    setSelectedClaim(null);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition ${
                    activeTab === "claims" 
                      ? "text-blue-400 bg-blue-600/5 font-bold" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "claims" ? "bg-blue-500" : "bg-slate-700"}`}></div>
                  Reward Claims
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* User logout section */}
        <div className="p-4 border-t border-slate-950 bg-slate-950/20">
          <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-2xl border border-slate-800/40">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase border border-indigo-500/10">
                {currentUser?.email?.substring(0, 2) || "AD"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{currentUser?.email}</p>
                <span className="text-[9px] font-bold text-slate-500 tracking-wider block uppercase">Superadmin</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <header className="h-20 border-b border-slate-900 bg-slate-950/50 flex items-center justify-between px-8">
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">
              {activeTab === "dashboard" ? "System Dashboard" : "Reward Claims Management"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === "dashboard" ? "Overall claims analytics and system health metrics" : "Manage and process user milestones"}
            </p>
          </div>
        </header>

        {/* Scrollable container */}
        <div className="flex-1 p-8 overflow-y-auto space-y-8">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Analytics KPI grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                
                {/* PENDING CARD */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-sm hover:border-slate-800 transition group duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/15 rounded-2xl text-amber-400 transition group-hover:scale-110 duration-200">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Pending Review</span>
                  <h2 className="text-3xl font-extrabold text-white mt-1.5">{stats.pending}</h2>
                </div>

                {/* APPROVED CARD */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-sm hover:border-slate-800 transition group duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/15 rounded-2xl text-blue-400 transition group-hover:scale-110 duration-200">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Coins Redeemed (Approved)</span>
                  <h2 className="text-3xl font-extrabold text-white mt-1.5">{stats.approved}</h2>
                </div>

                {/* COMPLETED CARD */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-sm hover:border-slate-800 transition group duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl text-emerald-400 transition group-hover:scale-110 duration-200">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Completed Delivery</span>
                  <h2 className="text-3xl font-extrabold text-white mt-1.5">{stats.completed}</h2>
                </div>

                {/* REJECTED CARD */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-sm hover:border-slate-800 transition group duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-2xl text-rose-400 transition group-hover:scale-110 duration-200">
                      <XCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Rejected Requests</span>
                  <h2 className="text-3xl font-extrabold text-white mt-1.5">{stats.rejected}</h2>
                </div>

                {/* TOTAL COMPLETED ISSUED CARD */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-sm hover:border-slate-800 transition group duration-200 bg-gradient-to-br from-indigo-950/20 to-blue-950/10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/15 rounded-2xl text-indigo-400 transition group-hover:scale-110 duration-200">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Total Rewards Issued</span>
                  <h2 className="text-3xl font-extrabold text-white mt-1.5">{stats.totalIssued}</h2>
                </div>

              </div>

              {/* Quick snapshot list of pending claims */}
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Recent Incoming Pending Claims</h3>
                    <p className="text-xs text-slate-500">Coins already deducted; awaiting your review</p>
                  </div>
                  <button 
                    onClick={() => {
                      setStatusFilter("Pending");
                      setActiveTab("claims");
                    }}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    Manage all pending
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {claimsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-blue-500 animate-spin"></div>
                  </div>
                ) : claims.filter(c => c.status === "Pending").length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
                    <CheckCircle2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <h4 className="text-sm font-semibold text-slate-400">All caught up!</h4>
                    <p className="text-xs text-slate-500 mt-1">There are no pending claims requiring verification.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {claims.filter(c => c.status === "Pending").slice(0, 4).map((claim) => (
                      <div 
                        key={claim.id}
                        onClick={() => {
                          setSelectedClaim(claim);
                          setActiveTab("claims");
                        }}
                        className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-900 hover:border-slate-800 rounded-2xl p-5 flex flex-col justify-between transition cursor-pointer group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition leading-tight">
                              {claim.fullName || claim.userName || "LigthsON User"}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">{claim.email}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 uppercase tracking-wider">
                            Pending
                          </span>
                        </div>
                        
                        <div className="mt-5 pt-4 border-t border-slate-900 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-slate-500">Reward:</span>
                            <span className="font-semibold text-slate-300 ml-1.5">{claim.rewardName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-amber-400">
                            <span>{claim.coinsRequired?.toLocaleString()}</span>
                            <span>🪙</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLAIMS LIST TABLE */}
          {activeTab === "claims" && (
            <div className="bg-slate-900/20 border border-slate-900 rounded-3xl overflow-hidden flex flex-col">
              
              {/* Table search & utility control panel */}
              <div className="p-6 border-b border-slate-900/80 bg-slate-900/10 flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
                
                {/* Search input bar */}
                <div className="relative w-full lg:max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search name, email, reward..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>

                {/* Filter and sorting groups */}
                <div className="flex flex-wrap items-center gap-3.5">
                  
                  {/* Status filtering tabs */}
                  <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
                    {["All", "Pending", "Approved", "Completed", "Rejected"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          statusFilter === status 
                            ? "bg-blue-600 text-white shadow" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  {/* Sort by dropdown */}
                  <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 shrink-0">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 mr-2" />
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-slate-300 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="newest" className="bg-slate-900 text-slate-300">Newest</option>
                      <option value="oldest" className="bg-slate-900 text-slate-300">Oldest</option>
                      <option value="highestCoins" className="bg-slate-900 text-slate-300">Highest Coins</option>
                    </select>
                  </div>

                </div>

              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                      <th className="py-4.5 px-6">User Details</th>
                      <th className="py-4.5 px-6">Phone Number</th>
                      <th className="py-4.5 px-6">Reward</th>
                      <th className="py-4.5 px-6 text-center">Coins Required</th>
                      <th className="py-4.5 px-6 text-center">Wallet Coins</th>
                      <th className="py-4.5 px-6">Status</th>
                      <th className="py-4.5 px-6">Claim Date</th>
                      <th className="py-4.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {claimsLoading ? (
                      <tr>
                        <td colSpan="8" className="py-16 text-center">
                          <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-blue-500 animate-spin mx-auto"></div>
                          <span className="text-xs text-slate-500 mt-3.5 block">Syncing Firestore collection...</span>
                        </td>
                      </tr>
                    ) : paginatedClaims.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-20 text-center">
                          <AlertCircle className="w-10 h-10 text-slate-800 mx-auto mb-3" />
                          <h4 className="text-sm font-semibold text-slate-500">No claims found</h4>
                          <p className="text-xs text-slate-600 mt-1">Try resetting filters or checking after some time.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedClaims.map((claim) => (
                        <tr 
                          key={claim.id}
                          onClick={() => setSelectedClaim(claim)}
                          className="hover:bg-slate-900/40 transition cursor-pointer group"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/30 flex items-center justify-center font-bold text-xs text-slate-300 uppercase shrink-0">
                                {claim.fullName ? claim.fullName.substring(0,2) : claim.userName?.substring(0,2) || "U"}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-white group-hover:text-blue-400 transition text-xs block truncate">
                                  {claim.fullName || claim.userName || "LigthsON User"}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate">{claim.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-400 text-xs font-medium">
                            {claim.phone || claim.phoneNumber || "N/A"}
                          </td>
                          <td className="py-4 px-6 text-white text-xs font-semibold">
                            {claim.rewardName}
                          </td>
                          <td className="py-4 px-6 text-center text-amber-400 text-xs font-extrabold">
                            <div className="flex items-center justify-center gap-1">
                              <span>{claim.coinsRequired?.toLocaleString()}</span>
                              <span>🪙</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center text-slate-300 text-xs font-medium">
                            <div className="flex items-center justify-center gap-1">
                              <span>{claim.currentCoins?.toLocaleString()}</span>
                              <span>🪙</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${getStatusBadge(claim.status)}`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 text-xs">
                            {formatDate(claim.createdAt)}
                          </td>
                          <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              {claim.status === "Pending" && (
                                <>
                                  <button
                                    onClick={() => setConfirmDialog({ type: "approve", claim })}
                                    className="p-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg border border-blue-500/20 hover:border-transparent transition"
                                    title="Approve claim"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedClaim(claim);
                                      setIsRejectModalOpen(true);
                                    }}
                                    className="p-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg border border-rose-500/20 hover:border-transparent transition"
                                    title="Reject Request"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {claim.status === "Approved" && (
                                <button
                                  onClick={() => setConfirmDialog({ type: "complete", claim })}
                                  className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg border border-emerald-500/20 hover:border-transparent transition flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                                  title="Deliver & Complete"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Complete</span>
                                </button>
                              )}
                              {claim.status === "Completed" && (
                                <span className="text-[10px] font-bold text-slate-500 pr-2">Delivered</span>
                              )}
                              {claim.status === "Rejected" && (
                                <span className="text-[10px] font-bold text-slate-600 pr-2">Rejected</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table pagination controls */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-slate-900/80 bg-slate-900/10 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                    <span className="font-semibold text-slate-300">
                      {Math.min(currentPage * itemsPerPage, processedClaims.length)}
                    </span>{" "}
                    of <span className="font-semibold text-slate-300">{processedClaims.length}</span> entries
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:text-slate-400 transition"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          currentPage === p 
                            ? "bg-blue-600 text-white" 
                            : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:text-slate-400 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* Details Slide-out Right Drawer */}
      {selectedClaim && (
        <div className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-xs flex justify-end animate-fade-in">
          {/* Overlay click to dismiss */}
          <div className="flex-1" onClick={() => setSelectedClaim(null)}></div>
          
          <div className="w-[480px] bg-slate-900 border-l border-slate-850 h-full flex flex-col shadow-2xl animate-slide-left p-6 space-y-6 relative overflow-y-auto">
            
            {/* Drawer top close action */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Review Claim Details</h3>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">ID: {selectedClaim.id}</span>
              </div>
              <button 
                onClick={() => setSelectedClaim(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile detail section */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Profile Information
              </h4>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Name</span>
                  <span className="font-semibold text-slate-200">{selectedClaim.fullName || selectedClaim.userName || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Email Address</span>
                  <a href={`mailto:${selectedClaim.email}`} className="font-semibold text-blue-400 hover:underline">{selectedClaim.email}</a>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Phone Number</span>
                  <a href={`tel:${selectedClaim.phone || selectedClaim.phoneNumber}`} className="font-semibold text-slate-200 hover:text-blue-400 hover:underline">
                    {selectedClaim.phone || selectedClaim.phoneNumber || "N/A"}
                  </a>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">User UID</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate w-32 text-right">{selectedClaim.uid}</span>
                </div>
              </div>
            </div>

            {/* Reward details card */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                Reward Information
              </h4>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Requested Reward</span>
                  <span className="font-bold text-white">{selectedClaim.rewardName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Reward ID / Key</span>
                  <span className="font-semibold text-slate-400">{selectedClaim.rewardType || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Milestone Coins Required</span>
                  <div className="flex items-center gap-1 text-amber-400 font-extrabold">
                    <span>{selectedClaim.coinsRequired?.toLocaleString()}</span>
                    <span>🪙</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coins profile check card */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                Coin Wallet Status
              </h4>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Current Wallet Balance</span>
                  <div className="flex items-center gap-1 text-slate-200 font-bold">
                    <span>{selectedClaim.currentCoins?.toLocaleString()}</span>
                    <span>🪙</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Affordability Status</span>
                  {Number(selectedClaim.currentCoins) >= Number(selectedClaim.coinsRequired) ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/15">Eligible</span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/15">Insufficient Wallet Coins</span>
                  )}
                </div>
              </div>
            </div>

            {/* Claims process history logs */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Review Status & Logs
              </h4>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Requested Time</span>
                  <span className="font-semibold text-slate-300">{formatDate(selectedClaim.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Current Status</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadge(selectedClaim.status)}`}>
                    {selectedClaim.status}
                  </span>
                </div>

                {selectedClaim.status === "Approved" && (
                  <>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-900">
                      <span className="text-slate-500">Approved At</span>
                      <span className="font-semibold text-slate-300">{formatDate(selectedClaim.approvedAt)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Approved By</span>
                      <span className="font-semibold text-slate-400 truncate max-w-[200px]">{selectedClaim.approvedBy || "Admin"}</span>
                    </div>
                  </>
                )}

                {selectedClaim.status === "Completed" && (
                  <>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-900">
                      <span className="text-slate-500">Approved At</span>
                      <span className="font-semibold text-slate-300">{formatDate(selectedClaim.approvedAt)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Completed At</span>
                      <span className="font-semibold text-slate-300">{formatDate(selectedClaim.completedAt)}</span>
                    </div>
                  </>
                )}

                {selectedClaim.status === "Rejected" && (
                  <>
                    <div className="flex justify-between items-start text-xs pt-2 border-t border-slate-900 gap-4">
                      <span className="text-slate-500 shrink-0">Reason for Rejection</span>
                      <span className="font-medium text-rose-300 text-right italic break-words flex-1">
                        {selectedClaim.rejectedReason || "No details provided"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action buttons footer */}
            {selectedClaim.status === "Pending" && (
              <div className="flex gap-3 pt-6 border-t border-slate-800 mt-auto">
                <button 
                  onClick={() => setIsRejectModalOpen(true)}
                  className="flex-1 py-3 text-xs font-semibold bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl border border-rose-500/20 hover:border-transparent transition flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Reject Claim
                </button>
                <button 
                  disabled={Number(selectedClaim.currentCoins) < Number(selectedClaim.coinsRequired)}
                  onClick={() => setConfirmDialog({ type: "approve", claim: selectedClaim })}
                  className="flex-1 py-3 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
              </div>
            )}

            {selectedClaim.status === "Approved" && (
              <div className="flex pt-6 border-t border-slate-800 mt-auto">
                <button 
                  onClick={() => setConfirmDialog({ type: "complete", claim: selectedClaim })}
                  className="w-full py-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Completed (Reward Delivered)
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
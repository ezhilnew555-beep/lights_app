/**
 * voiceAgentService.js
 * Client-side API service layer connecting the LigthsON mobile app
 * to the Voice AI Agent backend (outcome) hosted at api.robxinnovations.in.
 *
 * Provides 9 service functions covering:
 * - Health check & diagnostics
 * - Conversational text processing (NLU → CRUD)
 * - Audio processing (STT → NLU → CRUD)
 * - 2-step transaction confirmation
 * - Natural language financial queries
 * - RAG semantic query & full history summary
 * - Category taxonomy retrieval
 * - Real-time audio session token
 *
 * Authentication: Automatically retrieves and forwards Firebase ID token
 * via the Authorization: Bearer header on every request.
 */

import axios from "axios";
import { auth } from "../config/FirebaseConfig";
import { VOICE_API_BASE_URL } from "../config/api";

// ── Axios Client ────────────────────────────────────────────────────
const voiceClient = axios.create({
  baseURL: VOICE_API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Retrieve the current Firebase ID token for authenticated API calls.
 * Returns null if no user is signed in.
 */
async function getIdToken() {
  try {
    const user = auth.currentUser;
    if (user) return await user.getIdToken();
    return null;
  } catch (err) {
    console.warn("voiceAgentService: Failed to get ID token:", err.message);
    return null;
  }
}

/**
 * Build authorization headers with the Firebase JWT.
 */
async function authHeaders() {
  const token = await getIdToken();
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ════════════════════════════════════════════════════════════════════
// 1. HEALTH CHECK
// ════════════════════════════════════════════════════════════════════

/**
 * Check whether the voice agent backend is online and responsive.
 * @returns {Promise<Object>} { status, service, version, firestore_mode, ... }
 */
export async function checkHealth() {
  try {
    const res = await voiceClient.get("/health");
    return { success: true, ...res.data };
  } catch (err) {
    console.warn("voiceAgentService: Health check failed:", err.message);
    return { success: false, status: "offline", error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════
// 2. PROCESS AUDIO (Conversational Pipeline)
// ════════════════════════════════════════════════════════════════════

/**
 * Send base64-encoded audio to the conversational agent pipeline.
 * Pipeline: STT → Language Detection → NLU → Firestore CRUD → Localized Response
 *
 * @param {string} audioBase64 - Base64 encoded M4A/MP4 audio data
 * @param {string} userId - Firebase user UID
 * @param {string} [language='auto'] - Language override ('en-IN', 'ta-IN', 'hi-IN', or 'auto')
 * @returns {Promise<Object>} API response with parsedData, spokenResponse, etc.
 */
export async function processAudioConversation(audioBase64, userId, language = "auto") {
  try {
    const headers = await authHeaders();
    const res = await voiceClient.post(
      "/agent/process-audio",
      {
        audioBase64,
        userId,
        language,
        model: "B", // Model B = auto-commit to Firestore
      },
      { headers }
    );
    return res.data;
  } catch (err) {
    console.error("voiceAgentService: processAudioConversation failed:", err.message);
    return {
      success: false,
      error: err.message,
      spokenResponse: "Sorry, something went wrong. Please try again.",
    };
  }
}

// ════════════════════════════════════════════════════════════════════
// 3. PROCESS TEXT (Conversational Pipeline)
// ════════════════════════════════════════════════════════════════════

/**
 * Send text to the conversational agent pipeline.
 * Pipeline: Language Detection → NLU → Firestore CRUD → Localized Response
 *
 * @param {string} text - Natural language text (e.g., "spent 500 on groceries")
 * @param {string} userId - Firebase user UID
 * @param {string} [language='auto'] - Language override
 * @param {string} [sessionId=null] - Session ID for multi-turn conversations
 * @returns {Promise<Object>} API response with parsedData, spokenResponse, etc.
 */
export async function processTextConversation(text, userId, language = "auto", sessionId = null) {
  try {
    const headers = await authHeaders();
    const body = {
      text,
      userId,
      language,
      model: "B",
    };
    if (sessionId) body.sessionId = sessionId;

    const res = await voiceClient.post("/agent/process-text", body, { headers });
    return res.data;
  } catch (err) {
    console.error("voiceAgentService: processTextConversation failed:", err.message);
    return {
      success: false,
      error: err.message,
      spokenResponse: "Sorry, something went wrong. Please try again.",
    };
  }
}

// ════════════════════════════════════════════════════════════════════
// 4. CONFIRM TRANSACTION (2-Step Commit)
// ════════════════════════════════════════════════════════════════════

/**
 * Commit a previewed transaction to Firestore (Model A confirmation flow).
 *
 * @param {Object} parsedData - The parsed transaction object from NLU
 * @param {string} userId - Firebase user UID
 * @param {string} [operation='create'] - CRUD operation ('create', 'update', 'delete')
 * @returns {Promise<Object>} { committed, confirmation_message, db_execution }
 */
export async function confirmTransaction(parsedData, userId, operation = "create") {
  try {
    const headers = await authHeaders();
    const res = await voiceClient.post(
      "/confirm-commit",
      { parsedData, userId, operation },
      { headers }
    );
    return res.data;
  } catch (err) {
    console.error("voiceAgentService: confirmTransaction failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════
// 5. NATURAL LANGUAGE QUERY
// ════════════════════════════════════════════════════════════════════

/**
 * Ask a natural language question about spending/income/investments.
 *
 * @param {string} queryText - e.g., "How much did I spend on groceries this month?"
 * @param {string} userId - Firebase user UID
 * @returns {Promise<Object>} { query, answer, summary, records }
 */
export async function queryFinances(queryText, userId) {
  try {
    const headers = await authHeaders();
    const res = await voiceClient.post(
      "/query",
      { queryText, userId },
      { headers }
    );
    return res.data;
  } catch (err) {
    console.error("voiceAgentService: queryFinances failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════
// 6. RAG SEMANTIC QUERY
// ════════════════════════════════════════════════════════════════════

/**
 * Perform a semantic RAG query against the user's transaction history.
 *
 * @param {string} query - Natural language query
 * @param {string} userId - Firebase user UID
 * @param {number} [k=4] - Number of top-K results to retrieve
 * @returns {Promise<Object>} { results, summary, answer }
 */
export async function ragQuery(query, userId, k = 4) {
  try {
    const headers = await authHeaders();
    const res = await voiceClient.post(
      "/rag/query",
      { query, userId, k },
      { headers }
    );
    return res.data;
  } catch (err) {
    console.error("voiceAgentService: ragQuery failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════
// 7. RAG FULL HISTORY SUMMARY
// ════════════════════════════════════════════════════════════════════

/**
 * Generate a full financial history summary using RAG + LLM.
 *
 * @param {string} userId - Firebase user UID
 * @returns {Promise<Object>} { count, summary, answer }
 */
export async function ragSummary(userId) {
  try {
    const headers = await authHeaders();
    const res = await voiceClient.post(
      "/rag/summary",
      { userId },
      { headers }
    );
    return res.data;
  } catch (err) {
    console.error("voiceAgentService: ragSummary failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════
// 8. CATEGORY TAXONOMY
// ════════════════════════════════════════════════════════════════════

/**
 * Fetch the full category taxonomy from the backend.
 *
 * @returns {Promise<Object>} { taxonomy: { income: [...], expense: [...], investment: [...] } }
 */
export async function getCategories() {
  try {
    const res = await voiceClient.get("/categories");
    return res.data;
  } catch (err) {
    console.warn("voiceAgentService: getCategories failed:", err.message);
    return { taxonomy: null, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════
// 9. REAL-TIME AUDIO SESSION TOKEN
// ════════════════════════════════════════════════════════════════════

/**
 * Request a real-time audio session participant token for WebRTC streaming.
 *
 * @param {string} userId - Firebase user UID
 * @param {string} [roomName] - Optional room name (defaults to 'finance-{userId}')
 * @returns {Promise<Object>} { server_url, room_name, participant_token, userId }
 */
export async function getRealTimeToken(userId, roomName = null) {
  try {
    const headers = await authHeaders();
    const body = { userId };
    if (roomName) body.roomName = roomName;

    const res = await voiceClient.post("/token", body, { headers });
    return res.data;
  } catch (err) {
    console.error("voiceAgentService: getRealTimeToken failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ════════════════════════════════════════════════════════════════════

export default {
  checkHealth,
  processAudioConversation,
  processTextConversation,
  confirmTransaction,
  queryFinances,
  ragQuery,
  ragSummary,
  getCategories,
  getRealTimeToken,
};

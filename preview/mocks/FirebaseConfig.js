// Preview stand-in for src/config/FirebaseConfig.js — no network, no real project.
import { DEMO_UID, profile } from "./demoData";

const signedOut = typeof window !== "undefined" && /[?&]auth=out\b/.test(window.location.search);

export const auth = {
  currentUser: signedOut
    ? null
    : {
        uid: DEMO_UID,
        email: profile.email,
        displayName: `${profile.firstName} ${profile.lastName}`,
        metadata: { creationTime: "2025-03-04T10:00:00Z" },
        getIdToken: async () => "preview-token",
      },
};

export const db = { __preview: true };
export const functions = { __preview: true };

export default { name: "pulse-preview" };

// Metro configuration.
// Default Expo config, plus an opt-in design-preview mode:
//   PULSE_PREVIEW=1 npx expo start --web
// swaps Firebase / market services for local demo data (preview/mocks) so every
// screen can be rendered and screenshot-tested without an account or network.
// Without PULSE_PREVIEW the app resolves modules exactly as before.

const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

if (process.env.PULSE_PREVIEW === "1") {
  const src = (p) => path.join(__dirname, "src", p);
  const mock = (p) => path.join(__dirname, "preview", "mocks", p);
  const REDIRECTS = {
    [src("config/FirebaseConfig.js")]: mock("FirebaseConfig.js"),
    [src("services/firestoreService.js")]: mock("firestoreService.js"),
    [src("services/secureFunctions.js")]: mock("secureFunctions.js"),
    [src("utils/secureStorage.js")]: mock("secureStorage.js"),
    [src("services/premiumRewardsService.js")]: mock("premiumRewardsService.js"),
    [src("services/yahooFinanceService.js")]: mock("yahooFinanceService.js"),
    [src("services/firebaseAuthService.js")]: mock("firebaseAuthService.js"),
    [src("services/breakoutService.js")]: mock("breakoutService.js"),
  };
  const byLower = Object.fromEntries(Object.entries(REDIRECTS).map(([k, v]) => [k.toLowerCase(), v]));

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "lottie-react-native") return { type: "sourceFile", filePath: mock("LottieView.js") };
    const res = context.resolveRequest(context, moduleName, platform);
    if (res && res.type === "sourceFile") {
      const target = byLower[res.filePath.toLowerCase()];
      // Mocks themselves import the real data files, never the redirected modules
      if (target && !context.originModulePath.includes(path.join("preview", "mocks"))) {
        return { type: "sourceFile", filePath: target };
      }
    }
    return res;
  };
}

module.exports = config;

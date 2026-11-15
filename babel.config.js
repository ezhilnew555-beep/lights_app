module.exports = function (api) {
    api.cache(true);

    const plugins = [];

    // Strip console.log/warn/error from production builds
    // This prevents sensitive data (tokens, user info) from leaking via device logs
    const isProduction = process.env.NODE_ENV === "production" || process.env.BABEL_ENV === "production";

    if (isProduction) {
        plugins.push("transform-remove-console");
    }

    return {
        presets: ["babel-preset-expo"],
        plugins,
    };
};

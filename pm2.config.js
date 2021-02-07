module.exports = {
    apps: [
        {
            name: "Der Bienenbot",
            script: "./dist/bot.js",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};

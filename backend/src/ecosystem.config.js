module.exports = {
    apps: [
        {
            name: "api",
            script: "./start.js",
            instances: 1,
            autorestart: true, 
            watch: false,
            env: {
                NODE_ENV: "production",
            },
        },
        {
           name: "sync-worker",
           script: "src/workers/sync-processing.worker.js",
           instances: 1,
           autorestart: true, 
           watch: false,
           env: {
            NODE_ENV: "production"
           }
        }
    ]
}
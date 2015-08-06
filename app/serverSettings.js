var loadRequiredEnv = envKey => {
    var envValue = process.env[envKey]
    if (envValue) {
        return envValue
    } else {
        throw `Required env ${envKey} is missing. Define it with ${envKey}=VALUE and try again.`
    }
}

module.exports = {
    SITE_NAME: loadRequiredEnv('SITE_NAME'),
    AWS_ACCESS_KEY_ID: loadRequiredEnv('AWS_ACCESS_KEY_ID'), // AWS SDK loads this env automatically. Just enabling quick failure here.
    AWS_SECRET_ACCESS_KEY: loadRequiredEnv('AWS_SECRET_ACCESS_KEY'), // AWS SDK loads this env automatically. Just enabling quick failure here.
    AWS_REGION: loadRequiredEnv('AWS_REGION'),
    S3_BUCKET: loadRequiredEnv('S3_BUCKET'),
    DB_NAME: loadRequiredEnv('DB_NAME'),
    SESSION_KEY: loadRequiredEnv('SESSION_KEY'),
    ADMIN_PASSWORD: loadRequiredEnv('ADMIN_PASSWORD'),
    FRIEND_QUESTION_1: loadRequiredEnv('FRIEND_QUESTION_1'),
    FRIEND_ANSWER_1: loadRequiredEnv('FRIEND_ANSWER_1'),
    FRIEND_QUESTION_2: loadRequiredEnv('FRIEND_QUESTION_2'),
    FRIEND_ANSWER_2: loadRequiredEnv('FRIEND_ANSWER_2')
}


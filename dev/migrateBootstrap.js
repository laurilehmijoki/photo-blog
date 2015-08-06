require('babel/register')
var migrationResult = require('./migrate')

migrationResult.onError(function(err) {
    console.error('Migration failed:', err)
    process.exit(1)
})

migrationResult.onValue(function() {
    console.log('Migration succeeded!')
    process.exit(0)
})

var mysql = require('mysql')
var {DB_NAME} = require('./serverSettings')

var connection = mysql.createConnection({
    host     : process.env.DB_HOST     || '127.0.0.1',
    port     : process.env.DB_PORT     || 3456,
    database : DB_NAME,
    user     : process.env.DB_USER     || 'root',
    password : process.env.DB_PASSWORD || '',
    timezone : process.env.DB_TIMEZONE || 'Europe/Helsinki'
});

module.exports = {connection}
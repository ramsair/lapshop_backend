const mysql = require('mysql2');
require('dotenv').config();

const fs = require('fs')

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:{
        ca: fs.readFileSync(process.env.CA)
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL', err);
        return;
    }
    console.log('Connected to MySQL');
    connection.release();
});

module.exports = pool.promise();

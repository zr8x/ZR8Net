const express = require('express');
const app = express();
const PORT = 8080;

let mysql = require('mysql');
require('dotenv').config();

let connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

connection.connect((err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the MySQL server.');
})



app.get("/", (req, res) => {
    res.send("ZR8Net version 1.0.0");
})

app.get("/commit", (req, res) => {

})


app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
})
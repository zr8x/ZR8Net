const express = require('express');
const app = express();
const PORT = 8080;


app.get("/", (req, res) => {
    res.send("ZR8Net version 1.0.0");
})

app.get("/commit", (req, res) => {
    
})


app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
})
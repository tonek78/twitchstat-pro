const path = require('path');
const express = require('express');
const app = require('./expressApp');

const PORT = process.env.PORT || 3000;

// Serve static frontend files for local development
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 TwitchStats Pro Node.js szerver elindult a http://localhost:${PORT} címen`);
});

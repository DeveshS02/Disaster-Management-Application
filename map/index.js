const express = require('express');
const app= express();
const env= require('dotenv');
const cors= require('cors');

env.config();
const port= process.env.PORT;

app.use(express.json());
app.use(cors());

app.listen(port,() => {
    console.log(`Running on port ${port}`);
});
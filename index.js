const express = require('express');
require('dotenv').config()

const app = express()

const port = process.env.PORT

app.get('/', (req, res)=>{
    res.send("<h1>Hello This is Homepage</h1>")
})

app.get('/mayank', (req, res)=>{
    res.send("<h5>Mayank is cooking Something</h5>")
})

app.listen(port, ()=>{
    console.log(`Example is listening on ${port}`)
})
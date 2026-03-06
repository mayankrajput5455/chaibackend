import express from 'express'; 
import dotenv from 'dotenv'
import connectDB from './db/database.js';
const app = express()

const port = process.env.PORT || 8000

connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}/`)
        })
    })
    .catch((err) => {console.log("MongoDB connection failed !!!", err)})

dotenv.config({
    path: './env'
})

app.get('/', (req, res)=>{
    res.send("<h1>Hello This is Homepage</h1>")
})

app.get('/api/jokes', (req, res)=>{
    const jokes = [
        {
            "id": 1,
            "title": "Joke1",
            "content": "This is the First joke"
        },
        {
            "id": 2,
            "title": "Joke2",
            "content": "This is the Second joke"
        },
        {
            "id": 3,
            "title": "Joke3",
            "content": "This is the Third joke"
        },
        {
            "id": 4,
            "title": "Joke4",
            "content": "This is the fourth joke"
        },
        {
            "id": 5,
            "title": "Joke5",
            "content": "This is the Fifth joke"
        },
    ]
    res.send(jokes);
})

app.listen(port, ()=>{
    console.log(`Example is listening on ${port}`)
})
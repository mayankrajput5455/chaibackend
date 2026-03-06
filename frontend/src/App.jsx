import React from 'react'
import { useState } from 'react'
import axios from 'axios';
import { useEffect } from 'react';
import './index.css'

const App = () => {
  const [jokes, setJokes] = useState([]) 

  useEffect(() => {
    axios.get('/api/jokes')
      .then((response) => {
        setJokes(response.data)
      })
      .catch((error) => {
        console.log(error)
      })
  })

  return (
    <>
      <h1>Main kya Ladle, Meow......</h1>
      <h2>Jokes : {jokes.length}</h2>

      {
        jokes.map((joke, index) => (
          <div key={joke.id}>
            <h3>{joke.title}</h3>
            <p>{joke.content}</p>
          </div>
        ))
      }
    </>
  )
}

export default App

import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
  <main className='d-flex justify-content-center align-items-center'>
     <div className='notfound'>
      <h1>404</h1>
      <p>404 page not found</p>
      <Link to ='/' className='btn'>
go to Home
      </Link>
    </div>
  </main>
  )
}

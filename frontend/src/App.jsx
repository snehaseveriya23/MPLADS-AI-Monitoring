import { useState } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Insights from './pages/Insights'
import About from './pages/About'
import './App.css'

function App() {
  const [page, setPage] = useState('home')

  function handleNavigate(nextPage) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`app-shell app-shell--${page}`}>
      <Navbar current={page} onNavigate={handleNavigate} />
      {page === 'home' && <Home onNavigate={handleNavigate} />}
      {page === 'dashboard' && <Dashboard />}
      {page === 'insights' && <Insights />}
      {page === 'about' && <About />}
    </div>
  )
}

export default App

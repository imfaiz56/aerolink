import { Component } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

class Boundary extends Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h2>Something went wrong</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.err?.stack || this.state.err)}</pre>
        <button onClick={() => { localStorage.removeItem('aerolink'); location.href = '/' }}>Reset app data</button>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter><Boundary><App /></Boundary></BrowserRouter>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'
import { WorkoutProvider } from './hooks/useWorkout.jsx'
import App from './App.jsx'
import './index.css'

// Mock sandbox: seed a token so the app boots straight into the logged-in UI.
if (import.meta.env.VITE_MOCK && !localStorage.getItem('token')) {
  localStorage.setItem('token', 'mock-token')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WorkoutProvider>
            <App />
          </WorkoutProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)

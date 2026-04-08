import { useEffect, useState } from 'react'
import './App.css'
import { getSession, logout, type Session } from './auth/auth'
import { navigateHash, useHashRoute } from './hooks/useHashRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/Profile'
import Home from './pages/Home'
import Channel from './pages/Channel'
import Utility from './pages/Utility'
import VideoDetail from './pages/VideoDetail'
import History from './pages/History'
import Favorites from './pages/Favorites'
import Search from './pages/Search'
import Inbox from './pages/Inbox'

export default function App() {
  const route = useHashRoute()
  const [session, setSession] = useState<Session | null>(() => getSession())

  useEffect(() => {
    setSession(getSession())
  }, [])

  useEffect(() => {
    setSession(getSession())
  }, [route])

  useEffect(() => {
    if (route === '/' || route === '') {
      navigateHash('/home')
      return
    }

    if (route === '/profile' && !session) {
      navigateHash('/login')
      return
    }

    const known =
      route === '/home' ||
      route === '/login' ||
      route === '/register' ||
      route === '/forgot' ||
      route === '/profile' ||
      route === '/history' ||
      route === '/favorites' ||
      route === '/inbox' ||
      route.startsWith('/channel/') ||
      route.startsWith('/util/') ||
      route.startsWith('/video/') ||
      route.startsWith('/search/')
    if (!known) {
      navigateHash('/home')
    }
  }, [route, session])

  if (route === '/profile' && !session) {
    return (
      <div className="auth-bg">
        <div className="auth-shell">
          <div className="auth-card">正在跳转到登录...</div>
        </div>
      </div>
    )
  }

  const doLogout = async () => {
    await logout()
    setSession(null)
    navigateHash('/home')
  }

  switch (route) {
    case '/home':
      return (
        <Home
          session={session}
          onLogout={doLogout}
        />
      )
    case '/login':
      return (
        <Login
          onLoginSuccess={() => {
            setSession(getSession())
            navigateHash('/home')
          }}
        />
      )
    case '/register':
      return (
        <Register
          onRegisterSuccess={() => {
            navigateHash('/login')
          }}
        />
      )
    case '/forgot':
      return (
        <ForgotPassword
          onDone={() => {
            navigateHash('/login')
          }}
        />
      )
    case '/profile':
      return (
        <Profile
          session={session!}
          onLogout={doLogout}
        />
      )
    case '/history':
      return <History session={session} onLogout={doLogout} />
    case '/favorites':
      return <Favorites session={session} onLogout={doLogout} />
    case '/inbox':
      return <Inbox session={session} onLogout={doLogout} />
    default:
      if (route.startsWith('/channel/')) {
        const name = decodeURIComponent(route.slice('/channel/'.length) || '')
        return <Channel session={session} onLogout={doLogout} name={name} />
      }
      if (route.startsWith('/util/')) {
        const name = decodeURIComponent(route.slice('/util/'.length) || '')
        return <Utility session={session} onLogout={doLogout} name={name} />
      }
      if (route.startsWith('/video/')) {
        const id = decodeURIComponent(route.slice('/video/'.length) || '')
        return <VideoDetail session={session} onLogout={doLogout} id={id} />
      }
      if (route.startsWith('/search/')) {
        const q = decodeURIComponent(route.slice('/search/'.length) || '')
        return <Search session={session} onLogout={doLogout} q={q} />
      }
      return (
        <Home
          session={session}
          onLogout={doLogout}
        />
      )
  }
}

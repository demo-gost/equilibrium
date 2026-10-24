import { useState } from 'react'
import { IonContent, IonPage } from '@ionic/react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { useIonRouter } from '@ionic/react'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth, isAuthenticated } = useAuthStore()
  const router = useIonRouter()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      const { user, accessToken, refreshToken } = res.data.data
      setAuth(user, accessToken, refreshToken)
      router.push('/', 'root', 'replace')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <IonPage>
      <IonContent>
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-10">
          {/* Ambient blobs */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-brand-secondary/10 rounded-full blur-[80px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-[400px] relative"
          >
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-brand-primary to-brand-secondary mb-4 shadow-glow">
                <span className="text-3xl">⚖️</span>
              </div>
              <h1 className="text-3xl font-bold gradient-text tracking-tight">Equilibrium</h1>
              <p className="text-text-muted mt-1.5 text-sm font-medium">Your AI workload balancer</p>
            </div>

            {/* Card */}
            <div className="card p-7">
              <h2 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">Welcome back</h2>
              <p className="text-sm text-text-muted mb-6">Sign in to continue your journey.</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-3.5 mb-5 flex items-start gap-2"
                >
                  <span className="mt-0.5 shrink-0">⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label-text" htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="input-field"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label-text" htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-2"
                >
                  {loading && (
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  )}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p className="text-center text-text-muted text-sm mt-6">
                New here?{' '}
                <Link to="/register" className="text-brand-primary hover:text-brand-secondary transition-colors font-bold">
                  Create account
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default LoginPage

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
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-8">
          {/* Subtle ambient background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-secondary/5 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-[400px] relative"
          >
            {/* Logo */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 mb-5">
                <span className="text-3xl">⚖️</span>
              </div>
              <h1 className="text-3xl font-bold gradient-text tracking-tight">Equilibrium</h1>
              <p className="text-text-muted mt-2 text-sm">Your AI workload balancer</p>
            </div>

            {/* Card */}
            <div className="glass-card-elevated p-8">
              <h2 className="text-xl font-semibold text-text-primary mb-6 tracking-tight">Welcome back</h2>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-status-error/8 border border-status-error/20 text-status-error text-sm rounded-xl p-3.5 mb-5 flex items-start gap-2"
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
                <Link to="/register" className="text-brand-primary hover:text-brand-secondary transition-colors font-medium">
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

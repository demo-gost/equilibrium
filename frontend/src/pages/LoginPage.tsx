import { useState } from 'react'
import { IonContent, IonPage } from '@ionic/react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { useIonRouter } from '@ionic/react'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const router = useIonRouter()

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
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
          {/* Background glow */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-secondary/10 rounded-full blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 mb-4 animate-pulse-glow">
                <span className="text-3xl">⚖️</span>
              </div>
              <h1 className="text-3xl font-bold gradient-text">Equilibrium</h1>
              <p className="text-text-muted mt-1 text-sm">Your AI workload balancer</p>
            </div>

            {/* Card */}
            <div className="glass-card-elevated p-8">
              <h2 className="text-xl font-bold text-text-primary mb-6">Welcome back</h2>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-status-error/10 border border-status-error/20 text-status-error text-sm rounded-xl p-3 mb-4"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label-text">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="input-field"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label-text">Password</label>
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
                  {loading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : null}
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

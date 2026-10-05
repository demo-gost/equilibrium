import { useState } from 'react'
import { IonContent, IonPage, useIonRouter } from '@ionic/react'
import { Link, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'

const steps = ['Account', 'Study', 'Sleep']

const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}))

const RegisterPage = () => {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth, isAuthenticated } = useAuthStore()
  const router = useIonRouter()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dailyStudyLimitHours: 8,
    preferredStartHour: 9,
    preferredEndHour: 22,
    bedtimeHour: 23,
    wakeHour: 7,
    breakIntervalMinutes: 90,
    breakDurationMinutes: 15,
  })

  const update = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        timezone: form.timezone,
      })
      const { user, accessToken, refreshToken } = res.data.data

      await api.put('/auth/me', {
        dailyStudyLimitHours: form.dailyStudyLimitHours,
        studyPreferences: {
          preferredStartHour: form.preferredStartHour,
          preferredEndHour: form.preferredEndHour,
          focusMode: 'flexible',
        },
        sleepSchedule: {
          bedtimeHour: form.bedtimeHour, bedtimeMinute: 0,
          wakeHour: form.wakeHour, wakeMinute: 0,
        },
        breakPreferences: {
          intervalMinutes: form.breakIntervalMinutes,
          durationMinutes: form.breakDurationMinutes,
        },
      }, { headers: { Authorization: `Bearer ${accessToken}` } })

      setAuth(user, accessToken, refreshToken)
      router.push('/', 'root', 'replace')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <IonPage>
      <IonContent>
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-8">
          {/* Ambient background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-accent/5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-secondary/5 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-[400px] relative"
          >
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 mb-4">
                <span className="text-2xl">⚖️</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text tracking-tight">Join Equilibrium</h1>
              <p className="text-text-muted text-sm mt-1">Set up your personalized study plan</p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-1.5 mb-6 px-1">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5 flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0
                      ${i < step  ? 'bg-brand-primary text-white'
                      : i === step ? 'bg-brand-primary text-white ring-4 ring-brand-primary/20'
                      : 'bg-white/6 text-text-muted'}`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${i === step ? 'text-text-primary' : 'text-text-muted'}`}>
                    {s}
                  </span>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-1 ${i < step ? 'bg-brand-primary' : 'bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Card */}
            <div className="glass-card-elevated p-7">
              {error && (
                <div className="bg-status-error/8 border border-status-error/20 text-status-error text-sm rounded-xl p-3.5 mb-5 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* ── Step 0: Account ──────────────────────────── */}
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    <h2 className="font-semibold text-text-primary text-lg mb-1">Create your account</h2>
                    <div>
                      <label className="label-text" htmlFor="reg-name">Full Name</label>
                      <input
                        id="reg-name"
                        className="input-field"
                        placeholder="Alex Johnson"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label-text" htmlFor="reg-email">Email</label>
                      <input
                        id="reg-email"
                        type="email"
                        className="input-field"
                        placeholder="alex@university.edu"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label-text" htmlFor="reg-password">Password</label>
                      <input
                        id="reg-password"
                        type="password"
                        className="input-field"
                        placeholder="Min. 8 characters"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                      />
                    </div>
                    <button
                      id="reg-next-1"
                      className="btn-primary w-full mt-2"
                      onClick={() => setStep(1)}
                      disabled={!form.name || !form.email || form.password.length < 8}
                    >
                      Continue →
                    </button>
                  </motion.div>
                )}

                {/* ── Step 1: Study ────────────────────────────── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-5"
                  >
                    <h2 className="font-semibold text-text-primary text-lg mb-1">Study preferences</h2>
                    <div>
                      <label className="label-text">
                        Daily study limit: <span className="text-brand-primary font-semibold">{form.dailyStudyLimitHours}h</span>
                      </label>
                      <input
                        type="range" min={2} max={14} value={form.dailyStudyLimitHours}
                        onChange={(e) => update('dailyStudyLimitHours', +e.target.value)}
                        className="w-full mt-2.5 accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-text-muted mt-1">
                        <span>2h</span><span>8h</span><span>14h</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-text">Study starts</label>
                        <select
                          className="input-field"
                          value={form.preferredStartHour}
                          onChange={(e) => update('preferredStartHour', +e.target.value)}
                        >
                          {HOUR_OPTS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label-text">Study ends</label>
                        <select
                          className="input-field"
                          value={form.preferredEndHour}
                          onChange={(e) => update('preferredEndHour', +e.target.value)}
                        >
                          {HOUR_OPTS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label-text">
                        Break interval: <span className="text-brand-primary font-semibold">{form.breakIntervalMinutes}min</span>
                      </label>
                      <input
                        type="range" min={30} max={180} step={15} value={form.breakIntervalMinutes}
                        onChange={(e) => update('breakIntervalMinutes', +e.target.value)}
                        className="w-full mt-2.5 accent-indigo-500"
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button className="btn-secondary flex-1" onClick={() => setStep(0)}>← Back</button>
                      <button id="reg-next-2" className="btn-primary flex-1" onClick={() => setStep(2)}>Continue →</button>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 2: Sleep ────────────────────────────── */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-5"
                  >
                    <h2 className="font-semibold text-text-primary text-lg mb-1">🌙 Sleep schedule</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-text">Bedtime</label>
                        <select
                          className="input-field"
                          value={form.bedtimeHour}
                          onChange={(e) => update('bedtimeHour', +e.target.value)}
                        >
                          {HOUR_OPTS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label-text">Wake up</label>
                        <select
                          className="input-field"
                          value={form.wakeHour}
                          onChange={(e) => update('wakeHour', +e.target.value)}
                        >
                          {HOUR_OPTS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="glass-card p-4 text-sm text-text-secondary border border-brand-accent/15 rounded-xl">
                      <span className="text-brand-accent font-medium">💡 </span>
                      Equilibrium will never schedule tasks during your sleep window, keeping your schedule sustainable.
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
                      <button
                        id="reg-submit"
                        className="btn-primary flex-1"
                        onClick={handleSubmit}
                        disabled={loading}
                      >
                        {loading && (
                          <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                        )}
                        {loading ? 'Setting up...' : 'Get Started 🚀'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-center text-text-muted text-sm mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-primary hover:text-brand-secondary transition-colors font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default RegisterPage

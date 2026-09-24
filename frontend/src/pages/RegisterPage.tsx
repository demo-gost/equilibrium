import { useState } from 'react'
import { IonContent, IonPage, useIonRouter } from '@ionic/react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'

const steps = ['Account', 'Study Preferences', 'Schedule']

const RegisterPage = () => {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const router = useIonRouter()

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

      // Update preferences
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
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-secondary/10 rounded-full blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            {/* Logo */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 mb-3">
                <span className="text-2xl">⚖️</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text">Join Equilibrium</h1>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-6">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${i <= step ? 'bg-brand-primary text-white' : 'bg-white/5 text-text-muted'}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs ${i === step ? 'text-text-primary' : 'text-text-muted'}`}>{s}</span>
                  {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-brand-primary' : 'bg-white/10'}`} />}
                </div>
              ))}
            </div>

            <div className="glass-card-elevated p-8">
              {error && (
                <div className="bg-status-error/10 border border-status-error/20 text-status-error text-sm rounded-xl p-3 mb-4">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <h2 className="text-lg font-bold text-text-primary">Create your account</h2>
                    <div>
                      <label className="label-text">Full Name</label>
                      <input id="reg-name" className="input-field" placeholder="Alex Johnson" value={form.name} onChange={(e) => update('name', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-text">Email</label>
                      <input id="reg-email" type="email" className="input-field" placeholder="alex@university.edu" value={form.email} onChange={(e) => update('email', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-text">Password</label>
                      <input id="reg-password" type="password" className="input-field" placeholder="Min. 8 characters" value={form.password} onChange={(e) => update('password', e.target.value)} />
                    </div>
                    <button id="reg-next-1" className="btn-primary w-full" onClick={() => setStep(1)} disabled={!form.name || !form.email || form.password.length < 8}>
                      Continue →
                    </button>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <h2 className="text-lg font-bold text-text-primary">Study preferences</h2>
                    <div>
                      <label className="label-text">Daily study limit: <span className="text-brand-primary">{form.dailyStudyLimitHours}h</span></label>
                      <input type="range" min={2} max={14} value={form.dailyStudyLimitHours} onChange={(e) => update('dailyStudyLimitHours', +e.target.value)}
                        className="w-full mt-2 accent-indigo-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-text">Study starts</label>
                        <select className="input-field" value={form.preferredStartHour} onChange={(e) => update('preferredStartHour', +e.target.value)}>
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label-text">Study ends</label>
                        <select className="input-field" value={form.preferredEndHour} onChange={(e) => update('preferredEndHour', +e.target.value)}>
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label-text">Break every: <span className="text-brand-primary">{form.breakIntervalMinutes}min</span></label>
                      <input type="range" min={30} max={180} step={15} value={form.breakIntervalMinutes}
                        onChange={(e) => update('breakIntervalMinutes', +e.target.value)} className="w-full mt-2 accent-indigo-500" />
                    </div>
                    <div className="flex gap-3">
                      <button className="btn-secondary flex-1" onClick={() => setStep(0)}>← Back</button>
                      <button id="reg-next-2" className="btn-primary flex-1" onClick={() => setStep(2)}>Continue →</button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <h2 className="text-lg font-bold text-text-primary">Sleep schedule</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-text">Bedtime</label>
                        <select className="input-field" value={form.bedtimeHour} onChange={(e) => update('bedtimeHour', +e.target.value)}>
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label-text">Wake up</label>
                        <select className="input-field" value={form.wakeHour} onChange={(e) => update('wakeHour', +e.target.value)}>
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="glass-card p-4 text-sm text-text-secondary">
                      <span className="text-brand-accent">💡 </span>
                      Equilibrium will never schedule tasks during your sleep window.
                    </div>
                    <div className="flex gap-3">
                      <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
                      <button id="reg-submit" className="btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
                        {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : null}
                        {loading ? 'Setting up...' : 'Get Started 🚀'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-center text-text-muted text-sm mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-primary hover:text-brand-secondary transition-colors font-medium">Sign in</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default RegisterPage

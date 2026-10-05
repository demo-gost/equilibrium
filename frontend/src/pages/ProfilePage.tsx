import { useState, useEffect } from 'react'
import { IonContent, IonPage } from '@ionic/react'
import { useIonRouter } from '@ionic/react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { useThemeStore } from '../store/theme.store'
import { useNotifications } from '../hooks/useNotifications'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}))

const ProfilePage = () => {
  const { user, setUser, logout } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const { hasPermission, requestPermission } = useNotifications()
  const qc = useQueryClient()
  const router = useIonRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [prefs, setPrefs] = useState({
    dailyStudyLimitHours: user?.dailyStudyLimitHours ?? 8,
    preferredStartHour: user?.studyPreferences?.preferredStartHour ?? 9,
    preferredEndHour: user?.studyPreferences?.preferredEndHour ?? 22,
    bedtimeHour: user?.sleepSchedule?.bedtimeHour ?? 23,
    wakeHour: user?.sleepSchedule?.wakeHour ?? 7,
    breakIntervalMinutes: user?.breakPreferences?.intervalMinutes ?? 90,
    breakDurationMinutes: user?.breakPreferences?.durationMinutes ?? 15,
  })

  useEffect(() => {
    if (user) {
      setPrefs({
        dailyStudyLimitHours: user.dailyStudyLimitHours ?? 8,
        preferredStartHour: user.studyPreferences?.preferredStartHour ?? 9,
        preferredEndHour: user.studyPreferences?.preferredEndHour ?? 22,
        bedtimeHour: user.sleepSchedule?.bedtimeHour ?? 23,
        wakeHour: user.sleepSchedule?.wakeHour ?? 7,
        breakIntervalMinutes: user.breakPreferences?.intervalMinutes ?? 90,
        breakDurationMinutes: user.breakPreferences?.durationMinutes ?? 15,
      })
    }
  }, [user])

  const update = (k: string, v: unknown) => setPrefs((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.put('/auth/me', {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dailyStudyLimitHours: prefs.dailyStudyLimitHours,
        studyPreferences: {
          preferredStartHour: prefs.preferredStartHour,
          preferredEndHour: prefs.preferredEndHour,
          focusMode: user?.studyPreferences?.focusMode || 'flexible',
        },
        sleepSchedule: {
          bedtimeHour: prefs.bedtimeHour, bedtimeMinute: 0,
          wakeHour: prefs.wakeHour, wakeMinute: 0,
        },
        breakPreferences: {
          intervalMinutes: prefs.breakIntervalMinutes,
          durationMinutes: prefs.breakDurationMinutes,
        },
      })
      setUser(res.data.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      qc.invalidateQueries({ queryKey: ['schedule'] })
      qc.invalidateQueries({ queryKey: ['schedule-week'] })
      qc.invalidateQueries({ queryKey: ['schedule-today'] })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {})
    logout()
    router.push('/login', 'root', 'replace')
  }

  const THEMES = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark',  label: 'Dark',  icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ] as const

  return (
    <IonPage>
      <IonContent>
        <div className="page-container">
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="page-title">Profile</h1>
            <p className="text-sm text-text-muted mt-1">Preferences & account settings</p>
          </div>

          {/* ── User Info Card ──────────────────────────────────── */}
          <div className="glass-card-elevated p-5 mb-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-2xl font-bold text-white shrink-0 select-none">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-text-primary text-base leading-tight truncate">{user?.name}</div>
              <div className="text-text-muted text-sm mt-0.5 truncate">{user?.email}</div>
              {user?.timezone && (
                <div className="text-text-muted text-xs mt-0.5 truncate">{user?.timezone}</div>
              )}
            </div>
          </div>

          {/* ── Appearance ──────────────────────────────────────── */}
          <div className="glass-card-elevated p-5 mb-4">
            <h2 className="font-semibold text-text-primary text-sm mb-3">Appearance</h2>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border
                    ${theme === value
                      ? 'bg-brand-primary text-white border-brand-primary shadow-glow'
                      : 'btn-secondary border-white/8 !py-2.5 !text-xs !font-semibold'}`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Push Notifications ──────────────────────────────── */}
          <div className="glass-card-elevated p-5 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-text-primary text-sm">Push Notifications</h2>
                <p className="text-text-muted text-xs mt-0.5">Deadline reminders and study alerts</p>
              </div>
              <button
                onClick={requestPermission}
                className={`shrink-0 py-2 px-4 rounded-xl text-xs font-semibold transition-all border
                  ${hasPermission
                    ? 'bg-status-success/10 text-status-success border-status-success/25'
                    : 'btn-primary !py-2 !px-4 !text-xs !min-h-0'}`}
              >
                {hasPermission ? '✓ Enabled' : '🔔 Enable'}
              </button>
            </div>
          </div>

          {/* ── Study Settings ──────────────────────────────────── */}
          <div className="glass-card-elevated p-5 mb-4 space-y-5">
            <h2 className="font-semibold text-text-primary text-sm">Study Settings</h2>

            <div>
              <label className="label-text">
                Daily study limit: <span className="text-brand-primary font-semibold">{prefs.dailyStudyLimitHours} hours</span>
              </label>
              <input
                type="range" min={2} max={14} value={prefs.dailyStudyLimitHours}
                onChange={(e) => update('dailyStudyLimitHours', +e.target.value)}
                className="w-full mt-2 accent-indigo-500"
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
                  value={prefs.preferredStartHour}
                  onChange={(e) => update('preferredStartHour', +e.target.value)}
                >
                  {HOUR_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">Study ends</label>
                <select
                  className="input-field"
                  value={prefs.preferredEndHour}
                  onChange={(e) => update('preferredEndHour', +e.target.value)}
                >
                  {HOUR_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Sleep Schedule ──────────────────────────────────── */}
          <div className="glass-card-elevated p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🌙</span>
              <h2 className="font-semibold text-text-primary text-sm">Sleep Schedule</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Bedtime</label>
                <select
                  className="input-field"
                  value={prefs.bedtimeHour}
                  onChange={(e) => update('bedtimeHour', +e.target.value)}
                >
                  {HOUR_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">Wake up</label>
                <select
                  className="input-field"
                  value={prefs.wakeHour}
                  onChange={(e) => update('wakeHour', +e.target.value)}
                >
                  {HOUR_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-3">
              Sleep: {HOUR_OPTIONS[prefs.bedtimeHour].label} → {HOUR_OPTIONS[prefs.wakeHour].label}
              {' · '}
              {(() => {
                const s = prefs.bedtimeHour >= prefs.wakeHour
                  ? 24 - prefs.bedtimeHour + prefs.wakeHour
                  : prefs.wakeHour - prefs.bedtimeHour
                return `${s}h sleep`
              })()}
            </p>
          </div>

          {/* ── Break Preferences ────────────────────────────────── */}
          <div className="glass-card-elevated p-5 mb-6 space-y-5">
            <h2 className="font-semibold text-text-primary text-sm">Break Preferences</h2>
            <div>
              <label className="label-text">
                Break every: <span className="text-brand-primary font-semibold">{prefs.breakIntervalMinutes} min</span>
              </label>
              <input
                type="range" min={30} max={180} step={15} value={prefs.breakIntervalMinutes}
                onChange={(e) => update('breakIntervalMinutes', +e.target.value)}
                className="w-full mt-2 accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>30m</span><span>90m</span><span>3h</span>
              </div>
            </div>
            <div>
              <label className="label-text">
                Break duration: <span className="text-brand-primary font-semibold">{prefs.breakDurationMinutes} min</span>
              </label>
              <input
                type="range" min={5} max={30} step={5} value={prefs.breakDurationMinutes}
                onChange={(e) => update('breakDurationMinutes', +e.target.value)}
                className="w-full mt-2 accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>5m</span><span>15m</span><span>30m</span>
              </div>
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────── */}
          <button
            id="save-profile-btn"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full mb-3"
          >
            {saving && (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            )}
            {saved ? '✓ Preferences saved!' : saving ? 'Saving...' : 'Save Preferences'}
          </button>

          <button onClick={handleLogout} className="btn-danger w-full">
            Sign Out
          </button>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default ProfilePage

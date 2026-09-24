import { useState } from 'react'
import { IonContent, IonPage } from '@ionic/react'
import { useIonRouter } from '@ionic/react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'

const ProfilePage = () => {
  const { user, setUser, logout } = useAuthStore()
  const qc = useQueryClient()
  const router = useIonRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [prefs, setPrefs] = useState({
    dailyStudyLimitHours: user?.dailyStudyLimitHours || 8,
    preferredStartHour: user?.studyPreferences?.preferredStartHour || 9,
    preferredEndHour: user?.studyPreferences?.preferredEndHour || 22,
    bedtimeHour: user?.sleepSchedule?.bedtimeHour || 23,
    wakeHour: user?.sleepSchedule?.wakeHour || 7,
    breakIntervalMinutes: user?.breakPreferences?.intervalMinutes || 90,
    breakDurationMinutes: user?.breakPreferences?.durationMinutes || 15,
  })

  const update = (k: string, v: unknown) => setPrefs((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.put('/auth/me', {
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
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {})
    logout()
    router.push('/login', 'root', 'replace')
  }

  return (
    <IonPage>
      <IonContent>
        <div className="max-w-2xl mx-auto px-4 pt-12 pb-24">
          <div className="mb-6">
            <h1 className="text-2xl font-bold gradient-text">Profile</h1>
            <p className="text-text-muted text-sm">Manage your study preferences</p>
          </div>

          {/* User Info */}
          <div className="glass-card-elevated p-5 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-2xl font-bold text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-text-primary text-lg">{user?.name}</div>
              <div className="text-text-muted text-sm">{user?.email}</div>
              <div className="text-text-muted text-xs mt-0.5">{user?.timezone}</div>
            </div>
          </div>

          {/* Settings */}
          <div className="glass-card-elevated p-5 mb-4 space-y-5">
            <h2 className="font-bold text-text-primary">Study Settings</h2>

            <div>
              <label className="label-text">Daily study limit: <span className="text-brand-primary">{prefs.dailyStudyLimitHours} hours</span></label>
              <input type="range" min={2} max={14} value={prefs.dailyStudyLimitHours}
                onChange={(e) => update('dailyStudyLimitHours', +e.target.value)}
                className="w-full mt-2 accent-indigo-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Study starts</label>
                <select className="input-field" value={prefs.preferredStartHour} onChange={(e) => update('preferredStartHour', +e.target.value)}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">Study ends</label>
                <select className="input-field" value={prefs.preferredEndHour} onChange={(e) => update('preferredEndHour', +e.target.value)}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card-elevated p-5 mb-4 space-y-5">
            <h2 className="font-bold text-text-primary">Sleep Schedule</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Bedtime</label>
                <select className="input-field" value={prefs.bedtimeHour} onChange={(e) => update('bedtimeHour', +e.target.value)}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">Wake up</label>
                <select className="input-field" value={prefs.wakeHour} onChange={(e) => update('wakeHour', +e.target.value)}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card-elevated p-5 mb-6 space-y-5">
            <h2 className="font-bold text-text-primary">Break Preferences</h2>
            <div>
              <label className="label-text">Break every: <span className="text-brand-primary">{prefs.breakIntervalMinutes} min</span></label>
              <input type="range" min={30} max={180} step={15} value={prefs.breakIntervalMinutes}
                onChange={(e) => update('breakIntervalMinutes', +e.target.value)}
                className="w-full mt-2 accent-indigo-500" />
            </div>
            <div>
              <label className="label-text">Break duration: <span className="text-brand-primary">{prefs.breakDurationMinutes} min</span></label>
              <input type="range" min={5} max={30} step={5} value={prefs.breakDurationMinutes}
                onChange={(e) => update('breakDurationMinutes', +e.target.value)}
                className="w-full mt-2 accent-indigo-500" />
            </div>
          </div>

          {/* Save Button */}
          <button
            id="save-profile-btn"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full mb-3"
          >
            {saving ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : null}
            {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Preferences'}
          </button>

          {/* Logout */}
          <button onClick={handleLogout} className="btn-danger w-full">
            Sign Out
          </button>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default ProfilePage

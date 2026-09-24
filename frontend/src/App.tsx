import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Routes, Route, Navigate } from 'react-router-dom'
import {
  homeOutline, calendarOutline, checkboxOutline,
  barChartOutline, personOutline
} from 'ionicons/icons'
import { useAuthStore } from './store/auth.store'
import { useScheduleSSE } from './hooks/useScheduleSSE'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import SchedulePage from './pages/SchedulePage'
import TasksPage from './pages/TasksPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ProfilePage from './pages/ProfilePage'

const AuthenticatedApp = () => {
  useScheduleSSE() // Connect to SSE stream once authenticated
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="dashboard" href="/">
          <IonIcon icon={homeOutline} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="schedule" href="/schedule">
          <IonIcon icon={calendarOutline} />
          <IonLabel>Schedule</IonLabel>
        </IonTabButton>
        <IonTabButton tab="tasks" href="/tasks">
          <IonIcon icon={checkboxOutline} />
          <IonLabel>Tasks</IonLabel>
        </IonTabButton>
        <IonTabButton tab="analytics" href="/analytics">
          <IonIcon icon={barChartOutline} />
          <IonLabel>Analytics</IonLabel>
        </IonTabButton>
        <IonTabButton tab="profile" href="/profile">
          <IonIcon icon={personOutline} />
          <IonLabel>Profile</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  )
}

const App = () => {
  const { isAuthenticated } = useAuthStore()

  return (
    <IonApp>
      <IonReactRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={isAuthenticated ? <AuthenticatedApp /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </IonReactRouter>
    </IonApp>
  )
}

export default App

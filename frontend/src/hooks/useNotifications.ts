import { useState, useEffect, useCallback } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from '../types';

export const useNotifications = () => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const requestPermission = useCallback(async () => {
    try {
      // 1. Web Notification API
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          setHasPermission(true);
        }
      }

      // 2. Capacitor Local Notifications (Mobile)
      const capPermStatus = await LocalNotifications.checkPermissions();
      if (capPermStatus.display !== 'granted') {
        const reqStatus = await LocalNotifications.requestPermissions();
        if (reqStatus.display === 'granted') {
          setHasPermission(true);
        }
      } else {
        setHasPermission(true);
      }
    } catch (err) {
      console.warn('Notification permission check error:', err);
    }
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setHasPermission(true);
    }
  }, []);

  const sendNotification = useCallback(
    async (title: string, options?: { body?: string; icon?: string; tag?: string }) => {
      // Browser Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: options?.body || 'Equilibrium Reminder',
          icon: options?.icon || '/favicon.svg',
          tag: options?.tag,
        });
      }

      // Capacitor Mobile Notification
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body: options?.body || 'Equilibrium Reminder',
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 1000) },
              smallIcon: 'ic_stat_icon_config_sample',
              iconColor: '#6366f1',
            },
          ],
        });
      } catch (err) {
        // Ignored if web platform
      }
    },
    []
  );

  /**
   * Monitor tasks and trigger deadline approaching alerts
   */
  const checkTaskDeadlines = useCallback(
    (tasks: Task[]) => {
      if (!hasPermission) return;
      const now = new Date().getTime();
      const notifiedTasks = JSON.parse(localStorage.getItem('notified_task_deadlines') || '{}');

      tasks.forEach((task) => {
        if (task.status !== 'pending' && task.status !== 'in_progress') return;
        const deadlineTime = new Date(task.deadline).getTime();
        const diffMins = Math.round((deadlineTime - now) / 60000);

        // Notify if deadline is within 60 minutes and hasn't been notified yet
        if (diffMins > 0 && diffMins <= 60 && !notifiedTasks[task._id]) {
          sendNotification(`⚠️ Task Deadline Near: ${task.title}`, {
            body: `Due in ${diffMins} minutes! Complete your study block.`,
            tag: `task-deadline-${task._id}`,
          });
          notifiedTasks[task._id] = true;
        }
      });

      localStorage.setItem('notified_task_deadlines', JSON.stringify(notifiedTasks));
    },
    [hasPermission, sendNotification]
  );

  return {
    hasPermission,
    requestPermission,
    sendNotification,
    checkTaskDeadlines,
  };
};

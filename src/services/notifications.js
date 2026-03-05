/**
 * Notification & Alarm Service
 * Handles scheduling local notifications, alarm triggers,
 * and AUTOMATIC WhatsApp message sending when events arrive
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { format } from 'date-fns';
import { getSettings, getEvents } from './storage';
import { sendWhatsAppReminder } from './whatsapp';

// ─── Configuration ───────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    // AUTO-SEND WhatsApp when a WhatsApp-trigger notification fires
    if (data?.autoSendWhatsApp && data?.eventId) {
      try {
        const [settings, events] = await Promise.all([getSettings(), getEvents()]);
        const event = events.find((e) => e.id === data.eventId);
        if (event && settings.whatsappNumber && settings.callmebotApiKey) {
          const fullNumber = settings.countryCode + settings.whatsappNumber;
          sendWhatsAppReminder(fullNumber, settings.callmebotApiKey, event);
          console.log('✅ Auto-sent WhatsApp for:', event.title);
        }
      } catch (err) {
        console.error('Auto WhatsApp send error:', err);
      }
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: data?.isAlarm ?? true,
      shouldSetBadge: true,
    };
  },
});

// ─── Permission ──────────────────────────────────────────────

export const requestNotificationPermissions = async () => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Event Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      sound: 'alarm.wav',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Event Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  return true;
};

// ─── Schedule Alarm Notification ─────────────────────────────

export const scheduleAlarmNotification = async (event) => {
  const eventDate = new Date(event.dateTime);
  const now = new Date();

  if (eventDate <= now) {
    console.warn('Cannot schedule alarm in the past');
    return null;
  }

  const secondsUntilEvent = Math.floor((eventDate - now) / 1000);

  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ ALARM: ' + event.title,
        body: `It's time! ${event.title}\n${format(eventDate, 'PPP p')}`,
        sound: Platform.OS === 'android' ? 'alarm.wav' : true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          eventId: event.id,
          isAlarm: true,
          type: 'alarm',
          customAlarmSoundUri: event.customAlarmSoundUri || null,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilEvent,
        channelId: 'alarms',
      },
    });

    return notifId;
  } catch (error) {
    console.error('Error scheduling alarm:', error);
    return null;
  }
};

// ─── Schedule Reminder Notification ──────────────────────────

export const scheduleReminderNotification = async (event, minutesBefore = 5) => {
  const eventDate = new Date(event.dateTime);
  const reminderDate = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);
  const now = new Date();

  if (reminderDate <= now) return null;

  const secondsUntilReminder = Math.floor((reminderDate - now) / 1000);

  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Reminder: ' + event.title,
        body: `Coming up in ${minutesBefore} minutes!\n${event.description || ''}`,
        data: {
          eventId: event.id,
          isAlarm: false,
          type: 'reminder',
          sendWhatsApp: true,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilReminder,
        channelId: 'reminders',
      },
    });

    return notifId;
  } catch (error) {
    console.error('Error scheduling reminder:', error);
    return null;
  }
};

// ─── Schedule WhatsApp Notification Trigger ──────────────────
// This schedules a notification that will AUTOMATICALLY send
// a WhatsApp message when it fires (via the notification handler above)

export const scheduleWhatsAppTrigger = async (event) => {
  const eventDate = new Date(event.dateTime);
  const now = new Date();

  // Schedule WhatsApp message at the start of the day of the event
  const dayOfEvent = new Date(eventDate);
  dayOfEvent.setHours(9, 0, 0, 0); // 9 AM on the event day

  if (dayOfEvent <= now) {
    // If the event is today and it's past 9 AM, trigger soon
    if (eventDate > now) {
      const seconds = Math.max(5, Math.floor((eventDate.getTime() - 10 * 60 * 1000 - now.getTime()) / 1000));
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: '📱 WhatsApp Reminder Sent',
          body: `Auto-sent WhatsApp reminder for: ${event.title}`,
          data: {
            eventId: event.id,
            type: 'whatsapp',
            autoSendWhatsApp: true,  // triggers automatic sending in handler
            sendWhatsApp: true,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          channelId: 'reminders',
        },
      });
    }
    return null;
  }

  const secondsUntil = Math.floor((dayOfEvent - now) / 1000);

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: '📱 WhatsApp Reminder Sent',
      body: `Auto-sent WhatsApp reminder for: ${event.title} at ${format(eventDate, 'p')}`,
      data: {
        eventId: event.id,
        type: 'whatsapp',
        autoSendWhatsApp: true,  // triggers automatic sending in handler
        sendWhatsApp: true,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntil,
      channelId: 'reminders',
    },
  });
};

// ─── Cancel Notifications ────────────────────────────────────

export const cancelEventNotifications = async (notificationIds) => {
  if (!notificationIds) return;
  for (const id of notificationIds) {
    if (id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch (err) {
        // Notification may already have fired
      }
    }
  }
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// ─── Schedule All For Event ──────────────────────────────────

export const scheduleAllNotifications = async (event, minutesBefore = 5) => {
  const ids = {
    alarmId: null,
    reminderId: null,
    whatsappId: null,
  };

  ids.alarmId = await scheduleAlarmNotification(event);
  ids.reminderId = await scheduleReminderNotification(event, minutesBefore);
  ids.whatsappId = await scheduleWhatsAppTrigger(event);

  return ids;
};

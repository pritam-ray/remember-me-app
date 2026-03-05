/**
 * HomeScreen - Main event list, alarm, and quick actions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isTomorrow, isPast, compareAsc } from 'date-fns';
import * as Notifications from 'expo-notifications';

import EventCard from '../components/EventCard';
import AddEventModal from '../components/AddEventModal';
import AlarmOverlay from '../components/AlarmOverlay';
import EmptyState from '../components/EmptyState';

import {
  getEvents,
  saveEvents,
  deleteEvent,
  toggleEventDone,
  getSettings,
} from '../services/storage';
import {
  scheduleAllNotifications,
  cancelEventNotifications,
  requestNotificationPermissions,
  scheduleAlarmNotification,
} from '../services/notifications';
import { sendWhatsAppReminder } from '../services/whatsapp';
import { COLORS, SHADOWS } from '../theme/colors';

const HomeScreen = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filter, setFilter] = useState('all'); // all, today, upcoming, done
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({});
  const [alarmEvent, setAlarmEvent] = useState(null);
  const [showAlarm, setShowAlarm] = useState(false);

  const notificationListener = useRef();
  const responseListener = useRef();

  // ─── Load data ─────────────────────────────────────────────

  const loadData = async () => {
    const [loadedEvents, loadedSettings] = await Promise.all([
      getEvents(),
      getSettings(),
    ]);
    // Sort by date
    loadedEvents.sort((a, b) => compareAsc(new Date(a.dateTime), new Date(b.dateTime)));
    setEvents(loadedEvents);
    setSettings(loadedSettings);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // ─── Notification listeners ────────────────────────────────

  useEffect(() => {
    requestNotificationPermissions();

    // When notification is received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data;
        if (data?.isAlarm) {
          const event = events.find((e) => e.id === data.eventId);
          if (event) {
            setAlarmEvent(event);
            setShowAlarm(true);
          }
        }
      });

    // When user taps a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        // WhatsApp is now auto-sent via notification handler, but also handle tap
        if (data?.sendWhatsApp && data?.eventId) {
          const event = events.find((e) => e.id === data.eventId);
          if (event && settings.whatsappNumber) {
            const fullNumber = settings.countryCode + settings.whatsappNumber;
            sendWhatsAppReminder(fullNumber, event);
          }
        }
        if (data?.isAlarm) {
          const event = events.find((e) => e.id === data.eventId);
          if (event) {
            setAlarmEvent(event);
            setShowAlarm(true);
          }
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [events, settings]);

  // ─── Filter events ─────────────────────────────────────────

  useEffect(() => {
    let result = [...events];

    switch (filter) {
      case 'today':
        result = result.filter((e) => isToday(new Date(e.dateTime)));
        break;
      case 'upcoming':
        result = result.filter(
          (e) => !isPast(new Date(e.dateTime)) && !e.done
        );
        break;
      case 'done':
        result = result.filter((e) => e.done);
        break;
      default:
        break;
    }

    setFilteredEvents(result);
  }, [events, filter]);

  // ─── Event handlers ────────────────────────────────────────

  const handleSaveEvent = async (eventData) => {
    let updatedEvents;
    const existing = events.find((e) => e.id === eventData.id);

    if (existing) {
      // Cancel old notifications
      if (existing.notificationIds) {
        await cancelEventNotifications(Object.values(existing.notificationIds));
      }
      updatedEvents = events.map((e) =>
        e.id === eventData.id ? eventData : e
      );
    } else {
      updatedEvents = [...events, eventData];
    }

    // Schedule new notifications
    if (eventData.alarmEnabled || eventData.whatsappReminder) {
      const notifIds = await scheduleAllNotifications(
        eventData,
        settings.notifyMinutesBefore || 5
      );
      eventData.notificationIds = notifIds;

      updatedEvents = updatedEvents.map((e) =>
        e.id === eventData.id ? eventData : e
      );
    }

    updatedEvents.sort((a, b) =>
      compareAsc(new Date(a.dateTime), new Date(b.dateTime))
    );

    setEvents(updatedEvents);
    await saveEvents(updatedEvents);
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (eventId) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const event = events.find((e) => e.id === eventId);
          if (event?.notificationIds) {
            await cancelEventNotifications(Object.values(event.notificationIds));
          }
          await deleteEvent(eventId);
          setEvents(events.filter((e) => e.id !== eventId));
        },
      },
    ]);
  };

  const handleToggleDone = async (eventId) => {
    await toggleEventDone(eventId);
    setEvents(
      events.map((e) =>
        e.id === eventId ? { ...e, done: !e.done } : e
      )
    );
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setModalVisible(true);
  };

  const handleWhatsApp = async (event) => {
    if (!settings.whatsappNumber) {
      Alert.alert(
        'Setup Required',
        'Please set your WhatsApp number in Settings first.',
        [{ text: 'OK' }]
      );
      return;
    }
    const fullNumber = settings.countryCode + settings.whatsappNumber;
    await sendWhatsAppReminder(fullNumber, event);
  };

  const handleDismissAlarm = () => {
    setShowAlarm(false);
    setAlarmEvent(null);
  };

  const handleSnoozeAlarm = async (minutes) => {
    setShowAlarm(false);
    if (alarmEvent) {
      const snoozedEvent = {
        ...alarmEvent,
        dateTime: new Date(
          Date.now() + minutes * 60 * 1000
        ).toISOString(),
      };
      await scheduleAlarmNotification(snoozedEvent);
    }
    setAlarmEvent(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ─── Stats ─────────────────────────────────────────────────

  const todayCount = events.filter((e) => isToday(new Date(e.dateTime))).length;
  const upcomingCount = events.filter(
    (e) => !isPast(new Date(e.dateTime)) && !e.done
  ).length;
  const doneCount = events.filter((e) => e.done).length;

  // ─── Render ────────────────────────────────────────────────

  const FILTERS = [
    { key: 'all', label: 'All', count: events.length },
    { key: 'today', label: 'Today', count: todayCount },
    { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { key: 'done', label: 'Done', count: doneCount },
  ];

  const renderHeader = () => (
    <View>
      {/* Hero section */}
      <View style={styles.hero}>
        <View>
          <Text style={styles.greeting}>RememberMe</Text>
          <Text style={styles.dateText}>
            {format(new Date(), 'EEEE, MMMM d')}
          </Text>
        </View>
        <View style={styles.statsCircle}>
          <Text style={styles.statsNumber}>{todayCount}</Text>
          <Text style={styles.statsLabel}>Today</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              filter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
            <View
              style={[
                styles.filterBadge,
                filter === f.key && styles.filterBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.filterBadgeText,
                  filter === f.key && styles.filterBadgeTextActive,
                ]}
              >
                {f.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDark} />

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onToggleDone={handleToggleDone}
            onDelete={handleDeleteEvent}
            onEdit={handleEdit}
            onWhatsApp={handleWhatsApp}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="🎯"
            title="No Events Yet"
            subtitle="Tap the + button to add your first event. Set alarms and get WhatsApp reminders!"
          />
        }
        contentContainerStyle={
          filteredEvents.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Add Event */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingEvent(null);
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <AddEventModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        editEvent={editingEvent}
      />

      {/* Alarm Overlay */}
      <AlarmOverlay
        visible={showAlarm}
        event={alarmEvent}
        onDismiss={handleDismissAlarm}
        onSnooze={handleSnoozeAlarm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '25',
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statsLabel: {
    fontSize: 10,
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary + '25',
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  filterBadge: {
    backgroundColor: COLORS.bgCardLight,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  filterBadgeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  filterBadgeTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
  fabIcon: {
    fontSize: 30,
    color: '#FFF',
    fontWeight: '300',
    marginTop: -2,
  },
});

export default HomeScreen;

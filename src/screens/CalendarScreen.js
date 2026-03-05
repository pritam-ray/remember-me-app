/**
 * CalendarScreen - Calendar view of events
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { format, isSameDay } from 'date-fns';

import { getEvents } from '../services/storage';
import { COLORS } from '../theme/colors';

const CalendarScreen = () => {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [markedDates, setMarkedDates] = useState({});
  const [dayEvents, setDayEvents] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const loadEvents = async () => {
    const loaded = await getEvents();
    setEvents(loaded);
    buildMarkedDates(loaded, selectedDate);
    filterDayEvents(loaded, selectedDate);
  };

  const buildMarkedDates = (eventList, selected) => {
    const marks = {};

    eventList.forEach((event) => {
      const dateStr = format(new Date(event.dateTime), 'yyyy-MM-dd');
      if (!marks[dateStr]) {
        marks[dateStr] = {
          marked: true,
          dots: [],
        };
      }

      const dotColor = event.done
        ? COLORS.success
        : new Date(event.dateTime) < new Date()
        ? COLORS.textMuted
        : COLORS.accent;

      marks[dateStr].dots.push({ color: dotColor });
    });

    // Mark selected date
    if (marks[selected]) {
      marks[selected] = {
        ...marks[selected],
        selected: true,
        selectedColor: COLORS.primary,
      };
    } else {
      marks[selected] = {
        selected: true,
        selectedColor: COLORS.primary,
      };
    }

    setMarkedDates(marks);
  };

  const filterDayEvents = (eventList, dateStr) => {
    const selected = new Date(dateStr + 'T00:00:00');
    const filtered = eventList.filter((e) =>
      isSameDay(new Date(e.dateTime), selected)
    );
    filtered.sort(
      (a, b) => new Date(a.dateTime) - new Date(b.dateTime)
    );
    setDayEvents(filtered);
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    buildMarkedDates(events, day.dateString);
    filterDayEvents(events, day.dateString);
  };

  const renderEventItem = ({ item }) => {
    const eventDate = new Date(item.dateTime);
    return (
      <View style={[styles.eventItem, item.done && styles.eventDone]}>
        <View
          style={[
            styles.eventDot,
            { backgroundColor: item.done ? COLORS.success : COLORS.primary },
          ]}
        />
        <View style={styles.eventContent}>
          <Text
            style={[styles.eventTitle, item.done && styles.eventTitleDone]}
          >
            {item.title}
          </Text>
          <Text style={styles.eventTime}>
            ⏰ {format(eventDate, 'h:mm a')}
          </Text>
          {item.description ? (
            <Text style={styles.eventDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.eventMeta}>
          {item.alarmEnabled && <Text style={styles.metaIcon}>⏰</Text>}
          {item.whatsappReminder && <Text style={styles.metaIcon}>📱</Text>}
          {item.done && <Text style={styles.metaIcon}>✅</Text>}
        </View>
      </View>
    );
  };

  const selectedDateFormatted = format(
    new Date(selectedDate + 'T00:00:00'),
    'EEEE, MMMM d, yyyy'
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Calendar</Text>
      </View>

      <Calendar
        onDayPress={onDayPress}
        markedDates={markedDates}
        markingType="multi-dot"
        theme={{
          backgroundColor: COLORS.bgDark,
          calendarBackground: COLORS.bgDark,
          textSectionTitleColor: COLORS.textSecondary,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: '#FFF',
          todayTextColor: COLORS.accent,
          dayTextColor: COLORS.textPrimary,
          textDisabledColor: COLORS.textMuted,
          monthTextColor: COLORS.textPrimary,
          arrowColor: COLORS.primary,
          textMonthFontWeight: '700',
          textMonthFontSize: 18,
          textDayFontSize: 14,
          textDayHeaderFontSize: 12,
        }}
      />

      {/* Selected date events */}
      <View style={styles.daySection}>
        <Text style={styles.dayTitle}>{selectedDateFormatted}</Text>
        <Text style={styles.dayCount}>
          {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={dayEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={styles.eventList}
        ListEmptyComponent={
          <View style={styles.emptyDay}>
            <Text style={styles.emptyIcon}>🌙</Text>
            <Text style={styles.emptyText}>No events on this day</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  daySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dayCount: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  eventList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventDone: {
    opacity: 0.5,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  eventTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  eventTime: {
    fontSize: 12,
    color: COLORS.primaryLight,
    marginTop: 2,
  },
  eventDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 4,
  },
  metaIcon: {
    fontSize: 14,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});

export default CalendarScreen;

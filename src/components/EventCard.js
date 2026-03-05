/**
 * EventCard Component
 * Displays a single event in the list with actions
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { format, isPast, isToday, differenceInMinutes } from 'date-fns';
import { COLORS, SHADOWS } from '../theme/colors';

const CATEGORY_ICONS = {
  Work: '💼',
  Personal: '👤',
  Health: '🏥',
  Meeting: '🤝',
  Birthday: '🎂',
  Shopping: '🛒',
  Study: '📚',
  Travel: '✈️',
  Other: '📌',
};

const EventCard = ({ event, onToggleDone, onDelete, onEdit, onWhatsApp }) => {
  const eventDate = new Date(event.dateTime);
  const isExpired = isPast(eventDate) && !isToday(eventDate);
  const isEventToday = isToday(eventDate);
  const minutesLeft = differenceInMinutes(eventDate, new Date());
  const isUpcoming = minutesLeft > 0 && minutesLeft <= 60;

  const getStatusColor = () => {
    if (event.done) return COLORS.success;
    if (isExpired) return COLORS.textMuted;
    if (isUpcoming) return COLORS.warning;
    if (isEventToday) return COLORS.accent;
    return COLORS.primary;
  };

  const getTimeLabel = () => {
    if (event.done) return '✅ Done';
    if (isExpired) return '⏰ Expired';
    if (minutesLeft > 0 && minutesLeft <= 5) return `🔥 ${minutesLeft}min left!`;
    if (isUpcoming) return `⚡ ${minutesLeft}min left`;
    if (isEventToday) return '📍 Today';
    return format(eventDate, 'MMM d');
  };

  const categoryIcon = CATEGORY_ICONS[event.category] || '📌';

  return (
    <View style={[styles.card, event.done && styles.cardDone]}>
      {/* Status indicator line */}
      <View style={[styles.statusLine, { backgroundColor: getStatusColor() }]} />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
            <Text
              style={[styles.title, event.done && styles.titleDone]}
              numberOfLines={1}
            >
              {event.title}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.badgeText, { color: getStatusColor() }]}>
              {getTimeLabel()}
            </Text>
          </View>
        </View>

        {/* Description */}
        {event.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}

        {/* Date & Time */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            📅 {format(eventDate, 'EEE, MMM d, yyyy')}
          </Text>
          <Text style={styles.timeText}>
            ⏰ {format(eventDate, 'h:mm a')}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.doneBtn]}
            onPress={() => onToggleDone(event.id)}
          >
            <Text style={styles.actionText}>
              {event.done ? '↩️ Undo' : '✅ Done'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.whatsappBtn]}
            onPress={() => onWhatsApp(event)}
          >
            <Text style={styles.actionText}>📱 WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => onEdit(event)}
          >
            <Text style={styles.actionText}>✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => onDelete(event.id)}
          >
            <Text style={styles.actionText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  cardDone: {
    opacity: 0.6,
  },
  statusLine: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  doneBtn: {
    backgroundColor: COLORS.success + '15',
  },
  whatsappBtn: {
    backgroundColor: COLORS.whatsapp + '15',
  },
  editBtn: {
    backgroundColor: COLORS.info + '15',
  },
  deleteBtn: {
    backgroundColor: COLORS.danger + '15',
  },
  actionText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});

export default EventCard;

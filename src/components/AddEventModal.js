/**
 * AddEventModal Component
 * Full-featured modal for creating/editing events
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
import { format } from 'date-fns';
import { COLORS, SHADOWS } from '../theme/colors';
import { pickAlarmSound, getSavedSounds, getSettings } from '../services/storage';

const CATEGORIES = [
  'Work',
  'Personal',
  'Health',
  'Meeting',
  'Birthday',
  'Shopping',
  'Study',
  'Travel',
  'Other',
];

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

const AddEventModal = ({ visible, onClose, onSave, editEvent = null }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Personal');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [whatsappReminder, setWhatsappReminder] = useState(true);
  const [customAlarmSoundUri, setCustomAlarmSoundUri] = useState(null);
  const [customAlarmSoundName, setCustomAlarmSoundName] = useState('Use Default');
  const [savedSounds, setSavedSounds] = useState([]);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [previewSound, setPreviewSound] = useState(null);

  // Load saved sounds list when modal opens
  useEffect(() => {
    if (visible) {
      loadSavedSounds();
    }
    return () => {
      // Stop any previewing sound when modal closes
      if (previewSound) {
        previewSound.unloadAsync().catch(() => {});
      }
    };
  }, [visible]);

  const loadSavedSounds = async () => {
    const sounds = await getSavedSounds();
    setSavedSounds(sounds);
  };

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title || '');
      setDescription(editEvent.description || '');
      setCategory(editEvent.category || 'Personal');
      setDate(new Date(editEvent.dateTime));
      setAlarmEnabled(editEvent.alarmEnabled ?? true);
      setWhatsappReminder(editEvent.whatsappReminder ?? true);
      setCustomAlarmSoundUri(editEvent.customAlarmSoundUri || null);
      setCustomAlarmSoundName(editEvent.customAlarmSoundName || 'Use Default');
    } else {
      resetForm();
    }
  }, [editEvent, visible]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Personal');
    const newDate = new Date();
    newDate.setHours(newDate.getHours() + 1, 0, 0, 0);
    setDate(newDate);
    setAlarmEnabled(true);
    setWhatsappReminder(true);
    setCustomAlarmSoundUri(null);
    setCustomAlarmSoundName('Use Default');
    setShowSoundPicker(false);
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter an event title.');
      return;
    }

    if (date <= new Date() && !editEvent) {
      Alert.alert(
        'Past Date',
        'The selected date/time is in the past. Do you still want to create this event?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Anyway',
            onPress: () => saveEvent(),
          },
        ]
      );
      return;
    }

    saveEvent();
  };

  const saveEvent = () => {
    const eventData = {
      id: editEvent?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      description: description.trim(),
      category,
      dateTime: date.toISOString(),
      alarmEnabled,
      whatsappReminder,
      customAlarmSoundUri,
      customAlarmSoundName,
      done: editEvent?.done || false,
      createdAt: editEvent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(eventData);
    resetForm();
    onClose();
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editEvent ? '✏️ Edit Event' : '➕ New Event'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.form}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Input */}
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Team Meeting, Doctor Visit..."
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            {/* Description Input */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add details about the event..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            {/* Category Picker */}
            <Text style={styles.label}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryRow}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.categoryIcon}>
                    {CATEGORY_ICONS[cat]}
                  </Text>
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date Picker */}
            <Text style={styles.label}>📅 Date</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateBtnText}>
                {format(date, 'EEEE, MMMM d, yyyy')}
              </Text>
              <Text style={styles.dateChangeText}>Change</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
                themeVariant="dark"
              />
            )}

            {/* Time Picker */}
            <Text style={styles.label}>⏰ Time</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateBtnText}>
                {format(date, 'h:mm a')}
              </Text>
              <Text style={styles.dateChangeText}>Change</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={date}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                themeVariant="dark"
              />
            )}

            {/* Alarm Sound Picker */}
            <Text style={styles.label}>🔔 Alarm Sound</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowSoundPicker(!showSoundPicker)}
            >
              <Text style={styles.dateBtnText} numberOfLines={1}>
                🎵 {customAlarmSoundName}
              </Text>
              <Text style={styles.dateChangeText}>
                {showSoundPicker ? 'Close' : 'Change'}
              </Text>
            </TouchableOpacity>

            {showSoundPicker && (
              <View style={styles.soundPickerContainer}>
                {/* Use default option */}
                <TouchableOpacity
                  style={[
                    styles.soundOption,
                    !customAlarmSoundUri && styles.soundOptionActive,
                  ]}
                  onPress={() => {
                    setCustomAlarmSoundUri(null);
                    setCustomAlarmSoundName('Use Default');
                    setShowSoundPicker(false);
                  }}
                >
                  <Text style={styles.soundOptionIcon}>🔔</Text>
                  <Text style={[
                    styles.soundOptionText,
                    !customAlarmSoundUri && styles.soundOptionTextActive,
                  ]}>Use Default Sound</Text>
                </TouchableOpacity>

                {/* Saved sounds from local storage */}
                {savedSounds.map((sound) => (
                  <TouchableOpacity
                    key={sound.id}
                    style={[
                      styles.soundOption,
                      customAlarmSoundUri === sound.uri && styles.soundOptionActive,
                    ]}
                    onPress={() => {
                      setCustomAlarmSoundUri(sound.uri);
                      setCustomAlarmSoundName(sound.name);
                      setShowSoundPicker(false);
                    }}
                  >
                    <Text style={styles.soundOptionIcon}>🎵</Text>
                    <Text
                      style={[
                        styles.soundOptionText,
                        customAlarmSoundUri === sound.uri && styles.soundOptionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {sound.name}
                    </Text>
                    {/* Preview button */}
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={async () => {
                        try {
                          if (previewSound) await previewSound.unloadAsync();
                          const { sound: s } = await Audio.Sound.createAsync(
                            { uri: sound.uri },
                            { shouldPlay: true, volume: 0.7 }
                          );
                          setPreviewSound(s);
                          setTimeout(() => s.unloadAsync().catch(() => {}), 3000);
                        } catch (e) {
                          console.log('Preview failed');
                        }
                      }}
                    >
                      <Text style={styles.previewBtnText}>▶</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}

                {/* Pick new sound from device */}
                <TouchableOpacity
                  style={styles.pickSoundBtn}
                  onPress={async () => {
                    const picked = await pickAlarmSound();
                    if (picked) {
                      setCustomAlarmSoundUri(picked.uri);
                      setCustomAlarmSoundName(picked.name);
                      setShowSoundPicker(false);
                      loadSavedSounds();
                    }
                  }}
                >
                  <Text style={styles.pickSoundIcon}>📂</Text>
                  <Text style={styles.pickSoundText}>Pick from Device Storage</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Toggle Switches */}
            <View style={styles.toggleSection}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setAlarmEnabled(!alarmEnabled)}
              >
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleIcon}>⏰</Text>
                  <View>
                    <Text style={styles.toggleTitle}>Alarm</Text>
                    <Text style={styles.toggleSubtitle}>
                      Ring alarm at event time
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.toggle,
                    alarmEnabled && styles.toggleActive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleDot,
                      alarmEnabled && styles.toggleDotActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setWhatsappReminder(!whatsappReminder)}
              >
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleIcon}>📱</Text>
                  <View>
                    <Text style={styles.toggleTitle}>WhatsApp Reminder</Text>
                    <Text style={styles.toggleSubtitle}>
                      Send message on event day
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.toggle,
                    whatsappReminder && styles.toggleActive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleDot,
                      whatsappReminder && styles.toggleDotActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.bgDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary + '30',
    borderColor: COLORS.primary,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  dateBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateBtnText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  dateChangeText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  toggleSection: {
    marginTop: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgCardLight,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.textMuted,
  },
  toggleDotActive: {
    backgroundColor: '#FFF',
    alignSelf: 'flex-end',
  },
  soundPickerContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  soundOptionActive: {
    backgroundColor: COLORS.primary + '20',
  },
  soundOptionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  soundOptionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  soundOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBtnText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  pickSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.accent + '10',
  },
  pickSoundIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  pickSoundText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
});

export default AddEventModal;

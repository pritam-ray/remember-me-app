/**
 * SettingsScreen - Configure WhatsApp, alarm preferences, etc.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';

import {
  getSettings,
  saveSettings,
  getEvents,
  pickAlarmSound,
  getSavedSounds,
  deleteSavedSound,
} from '../services/storage';
import { cancelAllNotifications } from '../services/notifications';
import { sendTestWhatsAppMessage, sendDailySummary } from '../services/whatsapp';
import { COLORS, SHADOWS } from '../theme/colors';

const COUNTRY_CODES = [
  { code: '+91', country: '🇮🇳 India' },
  { code: '+1', country: '🇺🇸 USA' },
  { code: '+44', country: '🇬🇧 UK' },
  { code: '+61', country: '🇦🇺 Australia' },
  { code: '+86', country: '🇨🇳 China' },
  { code: '+81', country: '🇯🇵 Japan' },
  { code: '+971', country: '🇦🇪 UAE' },
  { code: '+966', country: '🇸🇦 Saudi' },
  { code: '+49', country: '🇩🇪 Germany' },
  { code: '+33', country: '🇫🇷 France' },
];

const REMIND_OPTIONS = [
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

const SettingsScreen = () => {
  const [settings, setSettings] = useState({
    whatsappNumber: '',
    countryCode: '+91',
    alarmEnabled: true,
    whatsappEnabled: true,
    notifyMinutesBefore: 5,
    alarmDurationSeconds: 60,
  });
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSounds, setSavedSounds] = useState([]);
  const [previewSound, setPreviewSound] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const loaded = await getSettings();
    setSettings(loaded);
    const sounds = await getSavedSounds();
    setSavedSounds(sounds);
  };

  // ─── Sound management ────────────────────────────────────

  const handlePickSound = async () => {
    const picked = await pickAlarmSound();
    if (picked) {
      updateSetting('defaultAlarmSoundUri', picked.uri);
      updateSetting('defaultAlarmSoundName', picked.name);
      const sounds = await getSavedSounds();
      setSavedSounds(sounds);
    }
  };

  const handleSelectDefaultSound = (sound) => {
    if (sound) {
      updateSetting('defaultAlarmSoundUri', sound.uri);
      updateSetting('defaultAlarmSoundName', sound.name);
    } else {
      updateSetting('defaultAlarmSoundUri', null);
      updateSetting('defaultAlarmSoundName', 'Default (Built-in)');
    }
  };

  const handlePreviewSound = async (uri) => {
    try {
      // Stop any currently playing preview
      if (previewSound) {
        await previewSound.stopAsync();
        await previewSound.unloadAsync();
        setPreviewSound(null);
      }

      if (!uri) {
        // Preview the bundled default
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/alarm-sound.mp3'),
            { shouldPlay: true, volume: 0.7 }
          );
          setPreviewSound(sound);
          setTimeout(async () => {
            try { await sound.stopAsync(); await sound.unloadAsync(); } catch(e) {}
            setPreviewSound(null);
          }, 4000);
        } catch (e) {
          Alert.alert('No Sound', 'No default alarm sound file found.');
        }
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 0.7 }
      );
      setPreviewSound(sound);
      // Auto-stop after 4 seconds
      setTimeout(async () => {
        try { await sound.stopAsync(); await sound.unloadAsync(); } catch(e) {}
        setPreviewSound(null);
      }, 4000);
    } catch (error) {
      Alert.alert('Error', 'Could not play the sound file.');
    }
  };

  const handleDeleteSound = async (soundId) => {
    Alert.alert(
      'Delete Sound',
      'Remove this alarm sound from your device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const sound = savedSounds.find((s) => s.id === soundId);
            // If this was the default, reset to built-in
            if (sound && settings.defaultAlarmSoundUri === sound.uri) {
              updateSetting('defaultAlarmSoundUri', null);
              updateSetting('defaultAlarmSoundName', 'Default (Built-in)');
            }
            await deleteSavedSound(soundId);
            const sounds = await getSavedSounds();
            setSavedSounds(sounds);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const success = await saveSettings(settings);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!settings.whatsappNumber) {
      Alert.alert('Missing Number', 'Please enter your WhatsApp number first.');
      return;
    }
    if (!settings.callmebotApiKey) {
      Alert.alert('API Key Missing', 'Please complete the WhatsApp setup first. Go through the onboarding or enter your CallMeBot API key.');
      return;
    }
    const fullNumber = settings.countryCode + settings.whatsappNumber;
    const result = await sendTestWhatsAppMessage(fullNumber, settings.callmebotApiKey);
    if (result.success) {
      Alert.alert('✅ Success', 'Test message sent automatically to your WhatsApp!');
    } else {
      Alert.alert('❌ Failed', `Could not send: ${result.error}`);
    }
  };

  const handleSendDailySummary = async () => {
    if (!settings.whatsappNumber) {
      Alert.alert('Missing Number', 'Please enter your WhatsApp number first.');
      return;
    }
    const events = await getEvents();
    const todayEvents = events.filter((e) => {
      const d = new Date(e.dateTime);
      const now = new Date();
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });

    if (todayEvents.length === 0) {
      Alert.alert('No Events', 'You have no events scheduled for today.');
      return;
    }

    const fullNumber = settings.countryCode + settings.whatsappNumber;
    const result = await sendDailySummary(fullNumber, settings.callmebotApiKey, todayEvents);
    if (result.success) {
      Alert.alert('✅ Sent', 'Daily summary sent to your WhatsApp!');
    } else {
      Alert.alert('❌ Failed', `Could not send: ${result.error}`);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'This will cancel all scheduled alarms and reminders. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            Alert.alert('Done', 'All notifications have been cleared.');
          },
        },
      ]
    );
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
        <Text style={styles.headerSubtitle}>
          Configure your reminders and preferences
        </Text>
      </View>

      {/* ─── WhatsApp Setup ─────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 WhatsApp Setup</Text>
        <Text style={styles.sectionDesc}>
          Enter your WhatsApp number and CallMeBot API key to receive automatic event reminders.
        </Text>

        {/* Country Code */}
        <Text style={styles.label}>Country Code</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowCountryCodes(!showCountryCodes)}
        >
          <Text style={styles.selectorText}>
            {COUNTRY_CODES.find((c) => c.code === settings.countryCode)?.country ||
              settings.countryCode}
          </Text>
          <Text style={styles.selectorCode}>{settings.countryCode}</Text>
          <Text style={styles.selectorArrow}>
            {showCountryCodes ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {showCountryCodes && (
          <View style={styles.codeList}>
            {COUNTRY_CODES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.codeItem,
                  settings.countryCode === c.code && styles.codeItemActive,
                ]}
                onPress={() => {
                  updateSetting('countryCode', c.code);
                  setShowCountryCodes(false);
                }}
              >
                <Text style={styles.codeItemText}>{c.country}</Text>
                <Text style={styles.codeItemCode}>{c.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Phone Number */}
        <Text style={styles.label}>WhatsApp Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 9876543210"
          placeholderTextColor={COLORS.textMuted}
          value={settings.whatsappNumber}
          onChangeText={(text) => updateSetting('whatsappNumber', text.replace(/[^0-9]/g, ''))}
          keyboardType="phone-pad"
          maxLength={15}
        />

        {/* CallMeBot API Key */}
        <Text style={styles.label}>CallMeBot API Key</Text>
        <Text style={styles.fieldDesc}>
          Required for automatic WhatsApp sending. Send "I allow callmebot to send me messages" to +34 644 59 71 47 on WhatsApp to get your key.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 1234567"
          placeholderTextColor={COLORS.textMuted}
          value={settings.callmebotApiKey || ''}
          onChangeText={(text) => updateSetting('callmebotApiKey', text)}
          keyboardType="number-pad"
          maxLength={20}
        />

        {/* Test button */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, styles.whatsappBtn]}
            onPress={handleTestWhatsApp}
          >
            <Text style={styles.btnText}>📱 Test Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.summaryBtn]}
            onPress={handleSendDailySummary}
          >
            <Text style={styles.btnText}>📋 Today's Summary</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Alarm Settings ─────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Alarm Settings</Text>

        {/* Global alarm toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => updateSetting('alarmEnabled', !settings.alarmEnabled)}
        >
          <View>
            <Text style={styles.toggleTitle}>Enable Alarms</Text>
            <Text style={styles.toggleSubtitle}>
              Ring alarm at event time
            </Text>
          </View>
          <View
            style={[
              styles.toggle,
              settings.alarmEnabled && styles.toggleActive,
            ]}
          >
            <View
              style={[
                styles.toggleDot,
                settings.alarmEnabled && styles.toggleDotActive,
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* WhatsApp toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() =>
            updateSetting('whatsappEnabled', !settings.whatsappEnabled)
          }
        >
          <View>
            <Text style={styles.toggleTitle}>WhatsApp Reminders</Text>
            <Text style={styles.toggleSubtitle}>
              Send WhatsApp message on event day
            </Text>
          </View>
          <View
            style={[
              styles.toggle,
              settings.whatsappEnabled && styles.toggleActive,
            ]}
          >
            <View
              style={[
                styles.toggleDot,
                settings.whatsappEnabled && styles.toggleDotActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── Alarm Sound Management ─────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Alarm Sound</Text>
        <Text style={styles.sectionDesc}>
          Pick alarm sounds from your device. Sounds are copied to local storage so they're always available.
        </Text>

        {/* Current default sound */}
        <View style={styles.currentSoundRow}>
          <View style={styles.currentSoundInfo}>
            <Text style={styles.currentSoundLabel}>Default Sound:</Text>
            <Text style={styles.currentSoundName} numberOfLines={1}>
              🎵 {settings.defaultAlarmSoundName || 'Default (Built-in)'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.previewSoundBtn}
            onPress={() => handlePreviewSound(settings.defaultAlarmSoundUri)}
          >
            <Text style={styles.previewSoundBtnText}>▶ Play</Text>
          </TouchableOpacity>
        </View>

        {/* Built-in default option */}
        <TouchableOpacity
          style={[
            styles.soundItem,
            !settings.defaultAlarmSoundUri && styles.soundItemActive,
          ]}
          onPress={() => handleSelectDefaultSound(null)}
        >
          <Text style={styles.soundItemIcon}>🔔</Text>
          <Text style={[
            styles.soundItemName,
            !settings.defaultAlarmSoundUri && styles.soundItemNameActive,
          ]}>Default (Built-in)</Text>
          {!settings.defaultAlarmSoundUri && (
            <Text style={styles.soundItemCheck}>✓</Text>
          )}
        </TouchableOpacity>

        {/* Saved custom sounds */}
        {savedSounds.map((sound) => (
          <View key={sound.id} style={[
            styles.soundItem,
            settings.defaultAlarmSoundUri === sound.uri && styles.soundItemActive,
          ]}>
            <TouchableOpacity
              style={styles.soundItemMain}
              onPress={() => handleSelectDefaultSound(sound)}
            >
              <Text style={styles.soundItemIcon}>🎵</Text>
              <Text
                style={[
                  styles.soundItemName,
                  settings.defaultAlarmSoundUri === sound.uri && styles.soundItemNameActive,
                ]}
                numberOfLines={1}
              >
                {sound.name}
              </Text>
              {settings.defaultAlarmSoundUri === sound.uri && (
                <Text style={styles.soundItemCheck}>✓</Text>
              )}
            </TouchableOpacity>
            <View style={styles.soundItemActions}>
              <TouchableOpacity
                style={styles.soundActionBtn}
                onPress={() => handlePreviewSound(sound.uri)}
              >
                <Text style={styles.soundActionText}>▶</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.soundActionBtn, styles.soundDeleteBtn]}
                onPress={() => handleDeleteSound(sound.id)}
              >
                <Text style={styles.soundDeleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {savedSounds.length === 0 && (
          <Text style={styles.noSoundsText}>
            No custom sounds added yet. Pick one from your device!
          </Text>
        )}

        {/* Pick new sound button */}
        <TouchableOpacity
          style={styles.pickNewSoundBtn}
          onPress={handlePickSound}
        >
          <Text style={styles.pickNewSoundIcon}>📂</Text>
          <View>
            <Text style={styles.pickNewSoundText}>Pick Sound from Device</Text>
            <Text style={styles.pickNewSoundSubtext}>
              Browse MP3, WAV, OGG, etc. from your storage
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── Notification Timing ────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Remind Me Before</Text>
        <Text style={styles.sectionDesc}>
          Get a notification before your event starts
        </Text>

        <View style={styles.optionRow}>
          {REMIND_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionChip,
                settings.notifyMinutesBefore === opt.value &&
                  styles.optionChipActive,
              ]}
              onPress={() => updateSetting('notifyMinutesBefore', opt.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.notifyMinutesBefore === opt.value &&
                    styles.optionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ─── Danger Zone ────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>
          ⚠️ Danger Zone
        </Text>

        <TouchableOpacity
          style={[styles.btn, styles.dangerBtn]}
          onPress={handleClearAll}
        >
          <Text style={[styles.btnText, { color: COLORS.danger }]}>
            🗑️ Clear All Scheduled Notifications
          </Text>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saved && styles.saveBtnDone]}
        onPress={handleSave}
      >
        <Text style={styles.saveBtnText}>
          {saved ? '✅ Saved!' : '💾 Save Settings'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.bgCard,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 14,
    lineHeight: 18,
  },
  fieldDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.bgCardLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  selectorCode: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 8,
  },
  selectorArrow: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  codeList: {
    marginTop: 8,
    backgroundColor: COLORS.bgCardLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  codeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  codeItemActive: {
    backgroundColor: COLORS.primary + '20',
  },
  codeItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  codeItemCode: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  whatsappBtn: {
    backgroundColor: COLORS.whatsapp + '15',
    borderColor: COLORS.whatsapp + '40',
  },
  summaryBtn: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary + '40',
  },
  dangerBtn: {
    backgroundColor: COLORS.danger + '10',
    borderColor: COLORS.danger + '30',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bgCardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionChipActive: {
    backgroundColor: COLORS.primary + '30',
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  saveBtnDone: {
    backgroundColor: COLORS.success,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  // ─── Sound Management Styles ─────────────────────
  currentSoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCardLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentSoundInfo: {
    flex: 1,
    marginRight: 10,
  },
  currentSoundLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  currentSoundName: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  previewSoundBtn: {
    backgroundColor: COLORS.primary + '25',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewSoundBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: COLORS.bgCardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  soundItemActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary + '50',
  },
  soundItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  soundItemIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  soundItemName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  soundItemNameActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  soundItemCheck: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '700',
    marginRight: 8,
  },
  soundItemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  soundActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundActionText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  soundDeleteBtn: {
    backgroundColor: COLORS.danger + '15',
  },
  soundDeleteText: {
    fontSize: 14,
  },
  noSoundsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  pickNewSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '12',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  pickNewSoundIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pickNewSoundText: {
    fontSize: 15,
    color: COLORS.accent,
    fontWeight: '700',
  },
  pickNewSoundSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default SettingsScreen;

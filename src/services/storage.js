/**
 * Storage Service - AsyncStorage wrapper for event persistence
 * 
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ALL DATA IS STORED LOCALLY ON THE DEVICE                   ║
 * ║  No external database, server, or internet connection       ║
 * ║  is required. Everything uses:                              ║
 * ║  • AsyncStorage → events, settings, sound preferences       ║
 * ║  • expo-file-system → alarm sound files copied locally      ║
 * ║  Data persists across app restarts and survives updates.    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

// ─── Storage Keys (all stored in device-local AsyncStorage) ──
const EVENTS_KEY = '@rememberme_events';
const SETTINGS_KEY = '@rememberme_settings';
const SOUNDS_KEY = '@rememberme_saved_sounds';

// ─── Local directory for copied alarm sound files ────────────
const SOUNDS_DIR = FileSystem.documentDirectory + 'alarm_sounds/';

/**
 * Ensure the local sounds directory exists on device storage
 */
const ensureSoundsDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(SOUNDS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(SOUNDS_DIR, { intermediates: true });
  }
};

// ═══════════════════════════════════════════════════════════════
// EVENT STORAGE (AsyncStorage — fully local, no database needed)
// ═══════════════════════════════════════════════════════════════

export const getEvents = async () => {
  try {
    const json = await AsyncStorage.getItem(EVENTS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error reading events from local storage:', error);
    return [];
  }
};

export const saveEvents = async (events) => {
  try {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    return true;
  } catch (error) {
    console.error('Error saving events to local storage:', error);
    return false;
  }
};

export const addEvent = async (event) => {
  const events = await getEvents();
  events.push(event);
  return saveEvents(events);
};

export const updateEvent = async (eventId, updates) => {
  const events = await getEvents();
  const index = events.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    events[index] = { ...events[index], ...updates };
    return saveEvents(events);
  }
  return false;
};

export const deleteEvent = async (eventId) => {
  const events = await getEvents();
  const filtered = events.filter((e) => e.id !== eventId);
  return saveEvents(filtered);
};

export const toggleEventDone = async (eventId) => {
  const events = await getEvents();
  const index = events.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    events[index].done = !events[index].done;
    return saveEvents(events);
  }
  return false;
};

// ═══════════════════════════════════════════════════════════════
// SETTINGS STORAGE (AsyncStorage — fully local)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_SETTINGS = {
  whatsappNumber: '',
  countryCode: '+91',
  callmebotApiKey: '',     // legacy — no longer used
  greenApiInstanceId: '', // Green API instance ID for auto WhatsApp sending
  greenApiToken: '',      // Green API API token
  isSetupComplete: false,
  alarmEnabled: true,
  whatsappEnabled: true,
  notifyMinutesBefore: 5,
  alarmDurationSeconds: 60,
  defaultAlarmSoundUri: null,
  defaultAlarmSoundName: 'Default (Built-in)',
};

export const getSettings = async () => {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json ? { ...DEFAULT_SETTINGS, ...JSON.parse(json) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error reading settings from local storage:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings to local storage:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════
// ALARM SOUND MANAGEMENT (FileSystem — stored on device locally)
// ═══════════════════════════════════════════════════════════════

/**
 * Pick an audio file from the user's device storage.
 * The file is COPIED into the app's local document directory
 * so it persists even if the original is moved/deleted.
 * 
 * @returns {{ id: string, uri: string, name: string } | null}
 */
export const pickAlarmSound = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];
    if (!file || !file.uri) return null;

    // Copy the picked file to our persistent local sounds directory
    await ensureSoundsDir();
    const fileName = `alarm_${Date.now()}_${file.name || 'sound.mp3'}`;
    const localUri = SOUNDS_DIR + fileName;

    await FileSystem.copyAsync({
      from: file.uri,
      to: localUri,
    });

    // Save to our sounds library (stored in AsyncStorage)
    const soundEntry = {
      id: Date.now().toString(),
      name: file.name || 'Custom Sound',
      uri: localUri,
      size: file.size || 0,
      addedAt: new Date().toISOString(),
    };

    await addSavedSound(soundEntry);

    return soundEntry;
  } catch (error) {
    console.error('Error picking alarm sound:', error);
    Alert.alert(
      'Error',
      'Could not pick the audio file. Please try again with a different file.',
    );
    return null;
  }
};

/**
 * Get all saved alarm sounds from local storage
 */
export const getSavedSounds = async () => {
  try {
    const json = await AsyncStorage.getItem(SOUNDS_KEY);
    const sounds = json ? JSON.parse(json) : [];

    // Verify each file still exists on device
    const verified = [];
    for (const sound of sounds) {
      const info = await FileSystem.getInfoAsync(sound.uri);
      if (info.exists) {
        verified.push(sound);
      }
    }

    // Update list if any files were removed
    if (verified.length !== sounds.length) {
      await AsyncStorage.setItem(SOUNDS_KEY, JSON.stringify(verified));
    }

    return verified;
  } catch (error) {
    console.error('Error reading saved sounds:', error);
    return [];
  }
};

/**
 * Add a sound entry to the saved sounds library
 */
const addSavedSound = async (soundEntry) => {
  const sounds = await getSavedSounds();
  sounds.push(soundEntry);
  await AsyncStorage.setItem(SOUNDS_KEY, JSON.stringify(sounds));
};

/**
 * Delete a saved alarm sound from local device storage
 */
export const deleteSavedSound = async (soundId) => {
  try {
    const sounds = await getSavedSounds();
    const sound = sounds.find((s) => s.id === soundId);

    if (sound) {
      // Delete the actual file from device storage
      const fileInfo = await FileSystem.getInfoAsync(sound.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(sound.uri);
      }
    }

    // Remove from saved list
    const filtered = sounds.filter((s) => s.id !== soundId);
    await AsyncStorage.setItem(SOUNDS_KEY, JSON.stringify(filtered));

    return true;
  } catch (error) {
    console.error('Error deleting sound:', error);
    return false;
  }
};

/**
 * Get the alarm sound URI for a specific event.
 * Falls back to: event sound → default settings sound → null (bundled)
 */
export const getAlarmSoundUri = async (event) => {
  // 1. Check if event has its own custom sound
  if (event?.customAlarmSoundUri) {
    const info = await FileSystem.getInfoAsync(event.customAlarmSoundUri);
    if (info.exists) return event.customAlarmSoundUri;
  }

  // 2. Fall back to the default alarm sound from settings
  const settings = await getSettings();
  if (settings.defaultAlarmSoundUri) {
    const info = await FileSystem.getInfoAsync(settings.defaultAlarmSoundUri);
    if (info.exists) return settings.defaultAlarmSoundUri;
  }

  // 3. Return null → AlarmOverlay will use the bundled fallback
  return null;
};

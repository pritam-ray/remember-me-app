/**
 * AlarmOverlay Component
 * Full-screen alarm overlay when an alarm fires
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import { format } from 'date-fns';
import { COLORS } from '../theme/colors';
import { getAlarmSoundUri } from '../services/storage';

const { width, height } = Dimensions.get('window');

const AlarmOverlay = ({ visible, event, onDismiss, onSnooze }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (visible) {
      startAlarm();
      startAnimations();
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => {
        clearInterval(timer);
        stopAlarm();
      };
    }
  }, [visible]);

  const startAnimations = () => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startAlarm = async () => {
    // Vibration pattern: vibrate, pause, vibrate...
    Vibration.vibrate([500, 300, 500, 300, 500], true);

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Get the user's chosen alarm sound from local storage
      // Priority: event custom sound → settings default sound → bundled fallback
      const customSoundUri = await getAlarmSoundUri(event);

      if (customSoundUri) {
        // Play the user-selected sound from device local storage
        const { sound } = await Audio.Sound.createAsync(
          { uri: customSoundUri },
          {
            shouldPlay: true,
            isLooping: true,
            volume: 1.0,
          }
        );
        soundRef.current = sound;
      } else {
        // Fallback to bundled alarm sound
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/alarm-sound.mp3'),
            {
              shouldPlay: true,
              isLooping: true,
              volume: 1.0,
            }
          );
          soundRef.current = sound;
        } catch (bundledErr) {
          console.log('Bundled alarm sound not available, vibration-only mode');
        }
      }
    } catch (error) {
      // If all sound options fail, rely on vibration
      console.log('Alarm sound not available, using vibration only');
    }
  };

  const stopAlarm = async () => {
    Vibration.cancel();
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        // Sound may already be unloaded
      }
      soundRef.current = null;
    }
  };

  const handleDismiss = () => {
    stopAlarm();
    onDismiss();
  };

  const handleSnooze = () => {
    stopAlarm();
    onSnooze(5); // Snooze for 5 minutes
  };

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={false}
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Background gradient effect */}
        <View style={styles.bgGlow} />

        {/* Time display */}
        <Text style={styles.time}>{format(currentTime, 'HH:mm')}</Text>
        <Text style={styles.seconds}>{format(currentTime, 'ss')}</Text>
        <Text style={styles.date}>
          {format(currentTime, 'EEEE, MMMM d, yyyy')}
        </Text>

        {/* Alarm icon with pulse */}
        <Animated.View
          style={[
            styles.alarmIconContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.alarmIcon}>⏰</Text>
        </Animated.View>

        {/* Event info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.description ? (
            <Text style={styles.eventDescription}>{event.description}</Text>
          ) : null}
          <Text style={styles.eventCategory}>
            {event.category || 'Event'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.snoozeBtn}
            onPress={handleSnooze}
            activeOpacity={0.7}
          >
            <Text style={styles.snoozeIcon}>😴</Text>
            <Text style={styles.snoozeText}>Snooze</Text>
            <Text style={styles.snoozeSubtext}>5 minutes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissIcon}>✓</Text>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  bgGlow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: COLORS.primary + '15',
    top: -width * 0.3,
  },
  time: {
    fontSize: 72,
    fontWeight: '200',
    color: COLORS.textPrimary,
    letterSpacing: 4,
  },
  seconds: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.primary,
    marginTop: -10,
  },
  date: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 40,
  },
  alarmIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  alarmIcon: {
    fontSize: 50,
  },
  eventInfo: {
    alignItems: 'center',
    marginBottom: 60,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  eventCategory: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  snoozeBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  snoozeIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  snoozeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  snoozeSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dismissBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 36,
    paddingVertical: 20,
    borderRadius: 20,
  },
  dismissIcon: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default AlarmOverlay;

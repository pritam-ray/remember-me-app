/**
 * SetupScreen - First-launch onboarding
 * Just collects the user's WhatsApp number.
 * Reminders open WhatsApp in your own self-chat — from YOUR number to YOURSELF.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { getSettings, saveSettings } from '../services/storage';
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
  { code: '+55', country: '🇧🇷 Brazil' },
  { code: '+7', country: '🇷🇺 Russia' },
  { code: '+82', country: '🇰🇷 S. Korea' },
  { code: '+39', country: '🇮🇹 Italy' },
  { code: '+34', country: '🇪🇸 Spain' },
  { code: '+52', country: '🇲🇽 Mexico' },
  { code: '+92', country: '🇵🇰 Pakistan' },
  { code: '+880', country: '🇧🇩 Bangladesh' },
  { code: '+234', country: '🇳🇬 Nigeria' },
  { code: '+27', country: '🇿🇦 S. Africa' },
];

const SetupScreen = ({ onSetupComplete }) => {
  const [step, setStep] = useState(1); // 1 = welcome, 2 = phone
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryCodes, setShowCountryCodes] = useState(false);

  const handleSkip = async () => {
    Alert.alert(
      'Skip Setup?',
      "You can still use alarms and todos. To set up WhatsApp reminders later, go to Settings.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            const s = await getSettings();
            await saveSettings({ ...s, isSetupComplete: true });
            onSetupComplete();
          },
        },
      ]
    );
  };

  const handleFinish = async () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      Alert.alert('Invalid Number', 'Please enter a valid WhatsApp phone number.');
      return;
    }
    const s = await getSettings();
    await saveSettings({
      ...s,
      whatsappNumber: phoneNumber,
      countryCode,
      isSetupComplete: true,
    });
    Alert.alert(
      '🎉 All Set!',
      `WhatsApp reminders will send to ${countryCode}${phoneNumber}. When a reminder fires, WhatsApp opens in your self-chat — just tap Send!`,
      [{ text: "Let's Go!", onPress: () => onSetupComplete() }]
    );
  };

  // ─── Render Steps ───────────────────────────────────────

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.emoji}>🔔</Text>
      <Text style={styles.title}>Welcome to RememberMe</Text>
      <Text style={styles.subtitle}>
        Your personal event manager with alarm clock and WhatsApp reminders to yourself
      </Text>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>⏰</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Smart Alarms</Text>
            <Text style={styles.featureDesc}>Never miss an event with powerful alarm notifications</Text>
          </View>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📱</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>WhatsApp Self-Reminders</Text>
            <Text style={styles.featureDesc}>WhatsApp opens with your reminder pre-filled — just tap Send from your own number.</Text>
          </View>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📋</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Todo + Calendar</Text>
            <Text style={styles.featureDesc}>Organize events, track progress, and view on calendar</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(2)}>
        <Text style={styles.primaryButtonText}>Set Up WhatsApp Number →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhoneStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepBadge}>Step 2 of 2</Text>
      <Text style={styles.emoji}>📱</Text>
      <Text style={styles.title}>Your WhatsApp Number</Text>
      <Text style={styles.subtitle}>
        Enter your own WhatsApp number. When a reminder fires, WhatsApp will open
        in your self-chat with the message ready — just tap Send.
      </Text>

      {/* How it works info box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>💡 How it works</Text>
        <Text style={styles.infoBoxText}>
          When your scheduled reminder time arrives, WhatsApp opens automatically
          in <Text style={styles.bold}>your own chat (Saved Messages)</Text> with
          the event details pre-filled. You tap Send once — and the message is from
          YOUR number to YOUR number.
        </Text>
      </View>

      {/* Country code selector */}
      <TouchableOpacity
        style={styles.countryCodeButton}
        onPress={() => setShowCountryCodes(!showCountryCodes)}
      >
        <Text style={styles.countryCodeButtonText}>
          {COUNTRY_CODES.find((c) => c.code === countryCode)?.country || countryCode}
        </Text>
        <Text style={styles.countryCodeValue}>{countryCode} ▼</Text>
      </TouchableOpacity>

      {showCountryCodes && (
        <ScrollView style={styles.countryCodeList} nestedScrollEnabled>
          {COUNTRY_CODES.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={[
                styles.countryCodeItem,
                countryCode === item.code && styles.countryCodeItemActive,
              ]}
              onPress={() => {
                setCountryCode(item.code);
                setShowCountryCodes(false);
              }}
            >
              <Text style={styles.countryCodeItemText}>
                {item.country}
              </Text>
              <Text style={styles.countryCodeItemCode}>{item.code}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Phone number input */}
      <View style={styles.phoneInputRow}>
        <View style={styles.codeDisplay}>
          <Text style={styles.codeDisplayText}>{countryCode}</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          placeholder="Phone Number"
          placeholderTextColor={COLORS.textMuted}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={15}
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
        <Text style={styles.primaryButtonText}>✓ Save &amp; Get Started</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip — I'll set this up later</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Main Render ────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress dots */}
        <View style={styles.progressDots}>
          {[1, 2].map((s) => (
            <View
              key={s}
              style={[styles.dot, step >= s && styles.dotActive]}
            />
          ))}
        </View>

        {step === 1 && renderWelcome()}
        {step === 2 && renderPhoneStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.bgCardLight,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 28,
    borderRadius: 5,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepBadge: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10,
  },

  // ─── Features ──────────────────
  featureList: {
    width: '100%',
    gap: 16,
    marginBottom: 36,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // ─── Buttons ───────────────────
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  backButton: {
    paddingVertical: 10,
    marginBottom: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  whatsappButton: {
    width: '100%',
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  // ─── Phone input ───────────────
  countryCodeButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  countryCodeButtonText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  countryCodeValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  countryCodeList: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  countryCodeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  countryCodeItemActive: {
    backgroundColor: COLORS.primary + '15',
  },
  countryCodeItemText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  countryCodeItemCode: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  phoneInputRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  codeDisplay: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 70,
    alignItems: 'center',
  },
  codeDisplayText: {
    fontSize: 16,
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: COLORS.border,
    letterSpacing: 1,
  },

  // ─── Info Box ──────────────────
  infoBox: {
    width: '100%',
    backgroundColor: COLORS.primary + '18',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    marginBottom: 20,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryLight,
    marginBottom: 6,
  },
  infoBoxText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ─── Unused CalllMeBot styles removed ───
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whatsappButton: {
    width: '100%',
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default SetupScreen;

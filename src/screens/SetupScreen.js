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
  Linking,
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
  const [step, setStep] = useState(1); // 1 = welcome, 2 = phone, 3 = green api
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [greenApiInstanceId, setGreenApiInstanceId] = useState('');
  const [greenApiToken, setGreenApiToken] = useState('');

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
      greenApiInstanceId: greenApiInstanceId.trim(),
      greenApiToken: greenApiToken.trim(),
      isSetupComplete: true,
    });
    const isAutoConfigured = greenApiInstanceId.trim() && greenApiToken.trim();
    Alert.alert(
      '🎉 All Set!',
      isAutoConfigured
        ? `Green API configured! Reminders will be sent automatically to ${countryCode}${phoneNumber}. No tapping needed!`
        : `WhatsApp number saved (${countryCode}${phoneNumber}). You can add Green API credentials later in Settings for fully automatic sending.`,
      [{ text: "Let's Go!", onPress: () => onSetupComplete() }]
    );
  };

  const handleSkipToFinish = async () => {
    // Save phone number and mark setup complete (skip Green API for now)
    if (!phoneNumber || phoneNumber.length < 7) {
      handleSkip();
      return;
    }
    const s = await getSettings();
    await saveSettings({
      ...s,
      whatsappNumber: phoneNumber,
      countryCode,
      isSetupComplete: true,
    });
    onSetupComplete();
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
            <Text style={styles.featureTitle}>Automatic WhatsApp Messages</Text>
            <Text style={styles.featureDesc}>Reminders are sent from your own WhatsApp number — fully automatic, no tapping needed.</Text>
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
        Enter your own WhatsApp number. Reminders will be sent to this number.
      </Text>

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

      <TouchableOpacity style={styles.primaryButton} onPress={() => {
        if (!phoneNumber || phoneNumber.length < 7) {
          Alert.alert('Invalid Number', 'Please enter a valid WhatsApp phone number.');
          return;
        }
        setStep(3);
      }}>
        <Text style={styles.primaryButtonText}>Next →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkipToFinish}>
        <Text style={styles.skipButtonText}>Skip — I'll set this up later</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGreenApiStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepBadge}>Step 3 of 3 — Optional</Text>
      <Text style={styles.emoji}>🤖</Text>
      <Text style={styles.title}>Enable Auto-Send</Text>
      <Text style={styles.subtitle}>
        Set up Green API so reminders are sent automatically — zero tapping needed.
        Completely free (500 messages/month).
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>💡 How it works</Text>
        <Text style={styles.infoBoxText}>
          Green API links <Text style={styles.bold}>your own WhatsApp</Text> account via a QR code scan.
          When a reminder fires, the app calls Green API which sends the message
          straight to your WhatsApp — fully automatic, no tap needed.
        </Text>
      </View>

      {/* Setup steps */}
      <View style={styles.setupSteps}>
        <Text style={styles.setupStep}><Text style={styles.bold}>1.</Text> Go to green-api.com → Register (free)</Text>
        <Text style={styles.setupStep}><Text style={styles.bold}>2.</Text> Create an instance → Scan QR code with WhatsApp</Text>
        <Text style={styles.setupStep}><Text style={styles.bold}>3.</Text> Copy your Instance ID &amp; API Token below</Text>
      </View>

      <TouchableOpacity
        style={styles.greenApiOpenBtn}
        onPress={() => Linking.openURL('https://green-api.com')}
      >
        <Text style={styles.greenApiOpenBtnText}>🌐 Open green-api.com (Free Sign Up)</Text>
      </TouchableOpacity>

      <Text style={styles.inputLabel}>Instance ID</Text>
      <TextInput
        style={styles.apiInput}
        placeholder="e.g. 1101234567"
        placeholderTextColor={COLORS.textMuted}
        value={greenApiInstanceId}
        onChangeText={setGreenApiInstanceId}
        autoCapitalize="none"
        keyboardType="default"
      />

      <Text style={styles.inputLabel}>API Token</Text>
      <TextInput
        style={styles.apiInput}
        placeholder="e.g. d75b3a66374942c5b3c650ef2b..."
        placeholderTextColor={COLORS.textMuted}
        value={greenApiToken}
        onChangeText={setGreenApiToken}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
        <Text style={styles.primaryButtonText}>✓ Finish Setup</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkipToFinish}>
        <Text style={styles.skipButtonText}>Skip — Set this up later in Settings</Text>
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
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.dot, step >= s && styles.dotActive]}
            />
          ))}
        </View>

        {step === 1 && renderWelcome()}
        {step === 2 && renderPhoneStep()}
        {step === 3 && renderGreenApiStep()}
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

  // ─── Green API step styles ──────────────────
  setupSteps: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
    paddingLeft: 4,
  },
  setupStep: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  greenApiOpenBtn: {
    width: '100%',
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  greenApiOpenBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  apiInput: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
});


export default SetupScreen;

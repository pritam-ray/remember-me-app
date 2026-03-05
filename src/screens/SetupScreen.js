/**
 * SetupScreen - First-launch onboarding
 * Collects WhatsApp number + CallMeBot API key for automatic messaging
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
  Linking,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { getSettings, saveSettings } from '../services/storage';
import { sendAutoWhatsAppMessage } from '../services/whatsapp';
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
  const [step, setStep] = useState(1); // 1 = welcome, 2 = phone, 3 = api key
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [testing, setTesting] = useState(false);

  // ─── Step handlers ──────────────────────────────────────

  const handleGoToPhone = () => setStep(2);

  const handleGoToApiKey = () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      Alert.alert('Invalid Number', 'Please enter a valid WhatsApp phone number.');
      return;
    }
    setStep(3);
  };

  const handleOpenCallMeBot = () => {
    const fullNumber = (countryCode + phoneNumber).replace(/[^0-9+]/g, '');
    const message = encodeURIComponent('I allow callmebot to send me messages');
    const url = `https://wa.me/34644663262?text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Cannot Open WhatsApp',
        'Please manually send the message "I allow callmebot to send me messages" to +34 644 66 32 62 on WhatsApp.'
      );
    });
  };

  const handleTestAndFinish = async () => {
    if (!apiKey || apiKey.length < 3) {
      Alert.alert('API Key Required', 'Please enter the API key you received from CallMeBot.');
      return;
    }

    setTesting(true);
    const fullNumber = countryCode + phoneNumber;

    try {
      const result = await sendAutoWhatsAppMessage(
        fullNumber,
        apiKey,
        '✅ *RememberMe Setup Complete!*\n\nYour WhatsApp auto-messaging is now configured. You will receive automatic reminders for your scheduled events.'
      );

      if (result.success) {
        // Save settings
        const currentSettings = await getSettings();
        const updatedSettings = {
          ...currentSettings,
          whatsappNumber: phoneNumber,
          countryCode: countryCode,
          callmebotApiKey: apiKey,
          isSetupComplete: true,
        };
        await saveSettings(updatedSettings);

        Alert.alert(
          '🎉 Setup Complete!',
          'Check your WhatsApp — you should have received a test message. Your automatic reminders are now active!',
          [{ text: 'Get Started!', onPress: () => onSetupComplete() }]
        );
      } else {
        Alert.alert(
          'Message Failed',
          `Could not send test message: ${result.error}\n\nPlease double-check your API key and make sure you completed the CallMeBot activation step.`,
          [{ text: 'Try Again' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Something went wrong. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSkip = async () => {
    Alert.alert(
      'Skip Setup?',
      'You can still use the alarm and todo features, but WhatsApp auto-messaging won\'t work until you complete the setup in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            const currentSettings = await getSettings();
            await saveSettings({ ...currentSettings, isSetupComplete: true });
            onSetupComplete();
          },
        },
      ]
    );
  };

  // ─── Render Steps ───────────────────────────────────────

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.emoji}>🔔</Text>
      <Text style={styles.title}>Welcome to RememberMe</Text>
      <Text style={styles.subtitle}>
        Your personal event manager with alarm clock and automatic WhatsApp reminders
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
            <Text style={styles.featureTitle}>Auto WhatsApp Messages</Text>
            <Text style={styles.featureDesc}>Get automatic WhatsApp reminders — no tapping needed!</Text>
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

      <TouchableOpacity style={styles.primaryButton} onPress={handleGoToPhone}>
        <Text style={styles.primaryButtonText}>Let's Set Up WhatsApp →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhoneStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepBadge}>Step 1 of 2</Text>
      <Text style={styles.emoji}>📱</Text>
      <Text style={styles.title}>Your WhatsApp Number</Text>
      <Text style={styles.subtitle}>
        Enter the WhatsApp number where you want to receive automatic reminders
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

      <TouchableOpacity style={styles.primaryButton} onPress={handleGoToApiKey}>
        <Text style={styles.primaryButtonText}>Next →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderApiKeyStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepBadge}>Step 2 of 2</Text>
      <Text style={styles.emoji}>🔑</Text>
      <Text style={styles.title}>Activate Auto-Messaging</Text>
      <Text style={styles.subtitle}>
        We use the free CallMeBot service to send WhatsApp messages automatically.
        Follow these simple steps:
      </Text>

      {/* Instructions */}
      <View style={styles.instructionCard}>
        <View style={styles.instructionStep}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>1</Text>
          </View>
          <Text style={styles.instructionText}>
            Tap the green button below — it will open WhatsApp with{' '}
            <Text style={styles.bold}>CallMeBot's bot number (+34 644 66 32 62)</Text>.{' '}
            <Text style={styles.italic}>This is a bot service, not your own number.</Text>
          </Text>
        </View>

        <View style={styles.instructionStep}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>2</Text>
          </View>
          <Text style={styles.instructionText}>
            Send the pre-filled message{' '}
            <Text style={styles.bold}>"I allow callmebot to send me messages"</Text>{' '}
            to that bot. CallMeBot will then message <Text style={styles.bold}>your</Text> number (+{(countryCode + phoneNumber).replace(/[^0-9]/g, '')}) with a key.
          </Text>
        </View>

        <View style={styles.instructionStep}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>3</Text>
          </View>
          <Text style={styles.instructionText}>
            Check your WhatsApp for a reply from the bot. Copy the{' '}
            <Text style={styles.bold}>API key</Text> from that message and enter it below.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.whatsappButton} onPress={handleOpenCallMeBot}>
        <Text style={styles.whatsappButtonText}>📲 Open WhatsApp with CallMeBot</Text>
      </TouchableOpacity>

      {/* API key input */}
      <Text style={styles.inputLabel}>Enter your API Key:</Text>
      <TextInput
        style={styles.apiKeyInput}
        placeholder="e.g. 1234567"
        placeholderTextColor={COLORS.textMuted}
        value={apiKey}
        onChangeText={setApiKey}
        keyboardType="number-pad"
        maxLength={20}
      />

      <TouchableOpacity
        style={[styles.primaryButton, testing && styles.buttonDisabled]}
        onPress={handleTestAndFinish}
        disabled={testing}
      >
        {testing ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFF" size="small" />
            <Text style={styles.primaryButtonText}> Sending test message...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>✓ Test & Finish Setup</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip — I'll do this later</Text>
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
        {step === 3 && renderApiKeyStep()}
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

  // ─── API Key ───────────────────
  instructionCard: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    gap: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  italic: {
    fontStyle: 'italic',
    color: COLORS.primary,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  apiKeyInput: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 3,
  },
});

export default SetupScreen;

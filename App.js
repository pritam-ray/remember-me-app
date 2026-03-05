/**
 * RememberMe App
 * Event manager with alarm clock, todo list, and WhatsApp reminders
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import AppNavigator from './src/navigation/AppNavigator';
import SetupScreen from './src/screens/SetupScreen';
import { requestNotificationPermissions } from './src/services/notifications';
import { getSettings } from './src/services/storage';
import { COLORS } from './src/theme/colors';

// Dark theme for navigation
const DarkTheme = {
  dark: true,
  colors: {
    primary: COLORS.primary,
    background: COLORS.bgDark,
    card: COLORS.bgCard,
    text: COLORS.textPrimary,
    border: COLORS.border,
    notification: COLORS.accent,
  },
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      // Request notification permissions
      await requestNotificationPermissions();

      // Check if user has completed first-launch setup
      const settings = await getSettings();
      setIsSetupComplete(settings.isSetupComplete === true);
      setIsLoading(false);
    };

    initialize();
  }, []);

  // Show loading spinner while checking setup status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor={COLORS.bgDark} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Show setup/onboarding screen on first launch
  if (!isSetupComplete) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor={COLORS.bgDark} />
        <SetupScreen onSetupComplete={() => setIsSetupComplete(true)} />
      </View>
    );
  }

  // Main app
  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" backgroundColor={COLORS.bgDark} />
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
});

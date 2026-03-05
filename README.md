# 🔔 RememberMe App

A **React Native (Expo)** app that works as an **event manager**, **alarm clock**, **todo list**, and **WhatsApp notifier** — all in one.

---

## ✨ Features

### 📋 Event / Todo Management
- Create events with title, description, category, date & time
- Categories: Work, Personal, Health, Meeting, Birthday, Shopping, Study, Travel
- Mark events as done (todo-list style)
- Edit and delete events
- Filter by: All, Today, Upcoming, Done

### ⏰ Alarm Clock
- Full-screen alarm overlay when event time arrives
- Vibration + sound alert
- Snooze (5 minutes) or dismiss
- Works even when app is in foreground

### 📱 WhatsApp Reminders
- Sends a pre-formatted WhatsApp message to yourself
- Reminder sent at the start of the event day (9 AM)
- On-demand: tap the WhatsApp button on any event
- Daily summary: send all today's events as one message
- Test message to verify setup

### 📅 Calendar View
- Monthly calendar with event dots
- Tap any day to see events for that date
- Color-coded: active / done / expired

### 🔔 Notifications
- Alarm notification at event time (high priority)
- Reminder notification X minutes before (configurable)
- WhatsApp trigger notification on event day

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ installed
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go** app on your phone (for testing)
- **WhatsApp** installed on your phone

### Installation

```bash
# Navigate to project folder
cd "remember me app"

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

### Running on Device
1. Open **Expo Go** app on your phone
2. Scan the QR code from the terminal
3. The app will load on your device

### Running on Emulator
```bash
# Android
npx expo start --android

# iOS (Mac only)
npx expo start --ios
```

---

## ⚙️ Configuration

### WhatsApp Setup
1. Go to **Settings** tab
2. Select your **country code**
3. Enter your **WhatsApp number** (without country code)
4. Tap **Test Message** to verify
5. Save settings

### Alarm Settings
- **Enable/Disable alarms** globally
- **Remind before**: 1, 5, 10, 15, 30, or 60 minutes
- **WhatsApp reminders**: toggle on/off

---

## 📁 Project Structure

```
remember-me-app/
├── App.js                          # Entry point
├── app.json                        # Expo config
├── package.json                    # Dependencies
├── assets/
│   └── alarm-sound.mp3             # Alarm sound (add your own)
└── src/
    ├── theme/
    │   └── colors.js               # Color palette & theme
    ├── services/
    │   ├── storage.js              # AsyncStorage (events & settings)
    │   ├── notifications.js        # Alarm & reminder scheduling
    │   └── whatsapp.js             # WhatsApp deep-link messaging
    ├── components/
    │   ├── EventCard.js            # Event list item
    │   ├── AddEventModal.js        # Create/edit event form
    │   ├── AlarmOverlay.js         # Full-screen alarm UI
    │   └── EmptyState.js           # Empty placeholder
    ├── screens/
    │   ├── HomeScreen.js           # Main event list + filters
    │   ├── CalendarScreen.js       # Calendar month view
    │   └── SettingsScreen.js       # WhatsApp & alarm config
    └── navigation/
        └── AppNavigator.js         # Bottom tab navigation
```

---

## 📱 How WhatsApp Integration Works

The app uses **WhatsApp deep linking** (`whatsapp://send?phone=...&text=...`) to open WhatsApp with a pre-filled message. This approach:
- ✅ Works without any API key or backend
- ✅ Sends messages from your own number to yourself
- ✅ No third-party service needed
- ⚠️ Requires WhatsApp installed on device
- ⚠️ Requires one tap to confirm send in WhatsApp

---

## 🛠 Tech Stack

- **React Native** with **Expo SDK 52**
- **Expo Notifications** — local alarm & reminder scheduling
- **Expo AV** — alarm sound playback
- **AsyncStorage** — offline event & settings persistence
- **React Navigation** — bottom tab navigation
- **react-native-calendars** — calendar month view
- **date-fns** — date formatting & comparison

---

## ⚠️ Important Notes

1. **Alarm Sound**: Add an `alarm-sound.mp3` file in the `assets/` folder for custom alarm sound. The app falls back to vibration if no sound file is found.

2. **Background Alarms**: Expo notifications work in background on Android. For iOS, alarms may only show as notifications when the app is backgrounded.

3. **WhatsApp Messages**: The app opens WhatsApp with the message ready — you just need to tap "Send". This is by design (WhatsApp doesn't allow fully automated messages without their Business API).

---

## 📄 License

MIT License — Free to use and modify.

# Patient Abnormality Alert System

## Overview
Added a critical abnormality alert system to the **Patient Dashboard** that prompts patients to immediately video call their doctor when abnormal vital signs are detected from the ESP8266 sensor.

---

## Implementation Details

### 1. New State Variables
```javascript
const [showAbnormalityAlert, setShowAbnormalityAlert] = useState(false);
const [abnormalityDetails, setAbnormalityDetails] = useState(null);
```

### 2. Alert Detection Logic
**Location:** `PatientDashboard.js` - Socket listener `patient_condition` event

**Trigger Conditions:**
- `data_source === 'esp8266_sensor'` - Only for live sensor readings
- `abnormality === 'yes'` - Abnormality flag set by server

**When Triggered:**
```javascript
if (data.data_source === 'esp8266_sensor' && data.abnormality === 'yes') {
  setAbnormalityDetails({
    heart_rate: data.heart_rate,
    spo2: data.spo2,
    condition: data.condition,
    prediction: data.prediction,
    timestamp: data.timestamp
  });
  setShowAbnormalityAlert(true);
}
```

**Auto-Clear:**
```javascript
if (data.abnormality === 'no') {
  setShowAbnormalityAlert(false);
}
```

---

## Alert Banner UI

### Visual Design
- **Position:** Between header and main content (high visibility)
- **Colors:** Red-orange gradient with pulsing animation
- **Icon:** 🚨 Critical alert emoji with bounce animation
- **Z-index:** 20 (above all other content)

### Alert Components

#### 1. Alert Header
```
🚨 CRITICAL HEALTH ALERT
Abnormal Vitals Detected - [Condition Name]
```

#### 2. Vitals Display
- Heart Rate badge: `❤️ HR: XX bpm`
- SpO2 badge: `🫁 SpO2: XX%`
- Semi-transparent white background with backdrop blur

#### 3. Action Buttons
- **"Call Doctor Now"** button:
  - White background with red text
  - Large phone icon 📞
  - Calls `initiateCall()` function to start video call
  - Scale hover effect

- **"Dismiss"** button:
  - Semi-transparent white
  - Allows patient to hide alert temporarily
  - Alert will reappear if abnormality persists

---

## Alert Types Comparison

### Patient Dashboard vs Doctor Dashboard

| Feature | Patient Dashboard | Doctor Dashboard |
|---------|------------------|------------------|
| **Finger Placement Alert** | ✅ Orange popup when HR=0 | ❌ No popup |
| **Abnormality Alert** | ✅ Red banner with "Call Doctor" CTA | ✅ Critical alert in alerts panel |
| **Alert Message** | User-friendly: "Place your finger" | Clinical: "Invalid reading (HR=X, SpO2=Y)" |
| **Action** | Guides sensor placement + prompts video call | Monitors clinical data |

---

## Data Flow

```
ESP8266 Sensor → server.js
    ↓
Check Vital Limits (HR, SpO2)
    ↓
Set abnormality flag: 'yes' or 'no'
    ↓
Broadcast to Socket.IO rooms (P001, P001-D001)
    ↓
Patient Dashboard Receives
    ↓
┌─────────────────────┬──────────────────────┐
│ HR = 0              │ Abnormality = 'yes'  │
│ (Sensor contact)    │ (Critical vitals)    │
├─────────────────────┼──────────────────────┤
│ Orange finger alert │ Red critical banner  │
│ "Place finger"      │ "Call Doctor Now"    │
└─────────────────────┴──────────────────────┘
```

---

## Server-Side Abnormality Detection

**Location:** `server/server.js` - ESP8266 monitoring section

**Abnormality Conditions:**
```javascript
// Zero values (sensor contact lost)
if (heart_rate === 0 || spo2 === 0) {
  abnormality = 'yes';
}

// Critical Heart Rate (outside normal range)
if (heart_rate < 40 || heart_rate > 120) {
  abnormality = 'yes';
}

// Critical SpO2 (below safe threshold)
if (spo2 < 90) {
  abnormality = 'yes';
}
```

---

## User Experience Flow

### Scenario 1: Sensor Contact Lost (HR=0)
1. Patient removes finger from MAX30102 sensor
2. ESP8266 sends: `BPM: 0 | SpO2: 0`
3. **Two alerts appear:**
   - Orange "Place finger" popup (bottom of Latest Vitals)
   - Red "Critical Alert" banner (top of page) with "Call Doctor Now"
4. Patient places finger back on sensor
5. Valid reading received (e.g., HR=75)
6. Both alerts automatically disappear

### Scenario 2: Critical Vitals (e.g., SpO2=85)
1. ESP8266 sends: `BPM: 88 | SpO2: 85`
2. Server detects SpO2 < 90 → sets `abnormality = 'yes'`
3. **Red critical banner appears:**
   - "Abnormal Vitals Detected - Low Oxygen"
   - Shows HR=88, SpO2=85
   - "Call Doctor Now" button prominently displayed
4. Patient clicks "Call Doctor Now"
5. Video call initiates immediately
6. Doctor can see same critical alert in their dashboard

---

## Button Actions

### "Call Doctor Now" Button
```javascript
onClick={initiateCall}
```
- **Function:** Starts WebRTC video call setup
- **Steps:**
  1. Gets local video/audio stream
  2. Creates peer connection
  3. Joins Socket.IO room with doctor
  4. Exchanges ICE candidates
  5. Establishes video call
- **Visual:** White button with red text, phone icon, scale animation

### "Dismiss" Button
```javascript
onClick={() => setShowAbnormalityAlert(false)}
```
- **Function:** Hides alert banner temporarily
- **Note:** Alert will reappear if new abnormality data received
- **Visual:** Semi-transparent white with hover effect

---

## Alert Persistence Logic

### When Alert Shows:
- New abnormality detected (`abnormality === 'yes'`)
- Stores details in `abnormalityDetails` state
- Banner remains visible until:
  - Patient dismisses manually, OR
  - Vitals return to normal (`abnormality === 'no'`)

### When Alert Clears:
- Normal vitals received (`abnormality === 'no'`)
- Automatically hides banner
- Clears `abnormalityDetails` state

---

## Testing Instructions

### Test Case 1: Finger Placement + Abnormality Alert
1. Open Patient Dashboard: `http://localhost:3000/patient`
2. Click "Start Monitoring"
3. Remove finger from MAX30102 sensor
4. **Expected:**
   - Orange popup appears in Latest Vitals section
   - Red banner appears at top: "CRITICAL HEALTH ALERT"
   - Both show HR=0, SpO2=0
5. Place finger back on sensor
6. **Expected:**
   - Both alerts disappear when valid reading received

### Test Case 2: Critical Vitals Alert
1. Simulate abnormal reading (modify server logic or use real critical vitals)
2. **Expected:**
   - Red banner appears: "Abnormal Vitals Detected - [Condition]"
   - Shows actual HR and SpO2 values
   - "Call Doctor Now" button visible
3. Click "Call Doctor Now"
4. **Expected:**
   - Video call setup initiates
   - Connection request sent to doctor

### Test Case 3: Alert Dismissal
1. Trigger abnormality alert
2. Click "Dismiss" button
3. **Expected:**
   - Alert banner hides
4. New abnormality data received
5. **Expected:**
   - Alert banner reappears

---

## Code Locations

### Frontend Changes
**File:** `client/src/components/PatientDashboard.js`
- **Lines 47-50:** New state variables
- **Lines 777-792:** Abnormality detection logic
- **Lines 998-1037:** Alert banner UI component

### Backend Logic
**File:** `server/server.js`
- **Lines 201-245:** ESP8266 monitoring with abnormality detection
- **Lines 226-247:** Room broadcasting to both Patient and Doctor

---

## Alert Styling Classes

```jsx
// Alert Container
className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 p-6 rounded-2xl shadow-2xl border-2 border-red-700 animate-pulse"

// Icon Container
className="w-16 h-16 bg-white rounded-full flex items-center justify-center animate-bounce"

// Call Doctor Button
className="px-6 py-3 bg-white text-red-600 rounded-xl shadow-lg hover:shadow-2xl hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 font-bold flex items-center gap-2"

// Dismiss Button
className="px-4 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-300 backdrop-blur-sm"
```

---

## Key Benefits

✅ **Immediate Patient Notification:** Large, unmissable alert banner
✅ **Clear Action Prompt:** "Call Doctor Now" button for immediate consultation
✅ **Dual Alert System:** Separate alerts for sensor issues vs. health issues
✅ **Real-time Updates:** Alerts clear automatically when vitals normalize
✅ **User-Friendly:** Simple language and clear visual hierarchy
✅ **Clinical Integration:** Doctor sees same abnormality data simultaneously

---

## Next Steps

1. **Hard Refresh:** Press `Ctrl+Shift+R` on Patient Dashboard
2. **Test Monitoring:** Click "Start Monitoring" button
3. **Verify Alerts:** Remove finger to trigger both alerts
4. **Test Video Call:** Click "Call Doctor Now" to verify video call integration
5. **Monitor Logs:** Check console for alert trigger messages

---

**Status:** ✅ Implementation Complete - Ready for Testing
**Updated:** November 12, 2025

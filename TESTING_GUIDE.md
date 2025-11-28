# 🧪 ESP8266 Testing Checklist

## Pre-Test Setup ✅

### 1. Hardware Connection
- [ ] ESP8266 NodeMCU connected to USB
- [ ] MAX30102 sensor wired correctly
- [ ] Arduino code uploaded to ESP8266
- [ ] **Arduino Serial Monitor CLOSED** ⚠️

### 2. Software Setup
- [ ] MongoDB running: `docker ps`
- [ ] Server dependencies installed: `npm install`
- [ ] Frontend dependencies installed: `cd client && npm install`

---

## Test Scenarios 🧪

### Scenario 1: Normal Sensor Operation
**Steps:**
1. Connect sensor: `.\connect-sensor.bat`
2. Open browser: `http://localhost:3000`
3. Login as doctor
4. Click "Start Monitoring"
5. Place finger on MAX30102 sensor

**Expected Results:**
- ✅ Heart rate shows: `75 bpm 📡 ESP8266 Sensor`
- ✅ SpO2 shows: `98% 📡 ESP8266 Sensor`
- ✅ Blue badge appears on both vitals
- ✅ Data updates every ~4 seconds
- ✅ No CSV data displayed
- ✅ No alerts shown

**Screenshot Locations:**
- Heart Rate: Patient Details → Latest Vitals → Heart Rate card
- SpO2: Patient Details → Latest Vitals → Oxygen Level card

---

### Scenario 2: Finger Placement Alert
**Steps:**
1. Continue from Scenario 1 (sensor connected and monitoring)
2. **Remove finger from MAX30102 sensor**
3. Wait 4-5 seconds for next update

**Expected Results:**
- ✅ Orange alert appears at top of Patient Details section
- ✅ Alert shows: "⚠️ Sensor Contact Lost"
- ✅ Alert message: "Please place your finger on the MAX30102 sensor"
- ✅ Alert has orange border and pulsing animation
- ✅ Heart rate and SpO2 retain previous values (don't show 0)

**Screenshot:**
```
┌─────────────────────────────────────────┐
│ Patient Details                         │
├─────────────────────────────────────────┤
│ ⚠️  Sensor Contact Lost                 │
│     Please place your finger on the     │
│     MAX30102 sensor                     │
└─────────────────────────────────────────┘
```

---

### Scenario 3: Alert Auto-Hide
**Steps:**
1. Continue from Scenario 2 (alert is showing)
2. **Keep finger OFF sensor**
3. Start a timer
4. Wait exactly 5 seconds

**Expected Results:**
- ✅ Alert disappears automatically after 5 seconds
- ✅ No manual dismissal required
- ✅ Patient Details section returns to normal

**Timing Test:**
```
0s  → Alert appears
1s  → Alert visible
2s  → Alert visible
3s  → Alert visible
4s  → Alert visible
5s  → Alert DISAPPEARS ✅
```

---

### Scenario 4: Reconnection
**Steps:**
1. Continue from Scenario 3 (alert has auto-hidden)
2. **Place finger back on MAX30102 sensor**
3. Wait 4-5 seconds for next update

**Expected Results:**
- ✅ Normal readings resume immediately
- ✅ Blue badges reappear: `📡 ESP8266 Sensor`
- ✅ Heart rate shows current BPM
- ✅ SpO2 shows current oxygen level
- ✅ No alert shown

---

### Scenario 5: Data Source Priority
**Steps:**
1. Start monitoring WITHOUT ESP8266 connected
2. Observe CSV data loading
3. Connect ESP8266: `.\connect-sensor.bat`
4. Place finger on sensor
5. Observe data source change

**Expected Results:**

**Before ESP8266:**
- Heart Rate: `72 bpm` (green badge: "CSV Data")
- SpO2: `97%` (static)

**After ESP8266:**
- Heart Rate: `75 bpm 📡 ESP8266 Sensor` (blue badge)
- SpO2: `98% 📡 ESP8266 Sensor` (blue badge)
- ✅ CSV data is **overridden**
- ✅ ESP8266 takes priority

---

### Scenario 6: Disconnect and Fallback
**Steps:**
1. Continue from Scenario 5 (ESP8266 active)
2. Disconnect ESP8266 (unplug USB)
3. Wait 10 seconds
4. Observe fallback behavior

**Expected Results:**
- ✅ System falls back to CSV data
- ✅ Green badge appears: "CSV Data"
- ✅ No crash or error
- ✅ Data continues updating from CSV

---

## Visual Indicators Guide 🎨

### Data Source Badges

| Badge | Meaning | Color |
|-------|---------|-------|
| 📡 ESP8266 Sensor | Real-time sensor data | Blue |
| CSV Data | Reading from CSV file | Green |
| Real-time | From ML backend | Gray |
| Static | Historical data | Light Gray |

### Alert States

| State | Visual |
|-------|--------|
| Normal | No alert shown |
| No Contact | Orange pulsing box with ⚠️ icon |
| Auto-Hide | Alert fades out after 5s |

---

## Debugging Checklist 🔍

### If ESP8266 data not showing:

1. **Check Server Logs**
   ```powershell
   # Look for:
   ✅ "ESP8266Reader initialized"
   ✅ "ESP8266 connected on COM5"
   ✅ "ESP8266 data: { bpm: 75, spo2: 98 }"
   
   # Bad signs:
   ❌ "Access is denied" → Close Arduino Serial Monitor
   ❌ "Port not found" → Check USB connection
   ❌ No data logs → Check Arduino code
   ```

2. **Check Browser Console (F12)**
   ```javascript
   // Look for Socket.IO events:
   ✅ patient_condition: {heart_rate: 75, spo2: 98, data_source: 'esp8266_sensor'}
   
   // Bad signs:
   ❌ Connection errors
   ❌ No Socket.IO events
   ❌ data_source: 'csv' (should be 'esp8266_sensor')
   ```

3. **Check Arduino Serial Monitor**
   ```
   ✅ BPM: 75 | SpO2: 98
   ✅ Data updating every 4 seconds
   
   ❌ BPM: 0 | SpO2: 0 → No finger on sensor
   ❌ No output → Upload code again
   ```

### If Alert not appearing:

1. **Verify Zero Detection**
   ```javascript
   // Server should receive:
   { bpm: 0, spo2: 0 }
   
   // Frontend should set:
   showFingerPlacementAlert = true
   ```

2. **Check Component Rendering**
   ```jsx
   // React DevTools:
   DoctorDashboard
     └─ showFingerPlacementAlert: true ✅
   ```

3. **Verify Timing**
   ```javascript
   // setTimeout should be called:
   setTimeout(() => {
     setShowFingerPlacementAlert(false);
   }, 5000);
   ```

---

## Performance Metrics 📊

### Expected Timings
- **Data Update Frequency**: Every 4 seconds
- **Alert Appearance**: Immediate (0s)
- **Alert Auto-Hide**: 5 seconds
- **Socket.IO Latency**: < 100ms
- **UI Update Latency**: < 50ms

### Data Flow Latency
```
ESP8266 → Serial → Node.js → Socket.IO → React → DOM
  ~50ms    ~20ms     ~30ms      ~100ms     ~50ms
  
Total: ~250ms (acceptable)
```

---

## Success Criteria Summary ✅

| Test | Pass Criteria |
|------|---------------|
| Normal Operation | ESP8266 data displays with blue badge |
| Data Priority | ESP8266 overrides CSV |
| Zero Detection | Alert appears when BPM=0, SpO2=0 |
| Auto-Hide | Alert disappears after 5s |
| Reconnection | Readings resume after finger placement |
| Fallback | System continues with CSV if sensor disconnected |
| No Crashes | Graceful error handling |

---

## Report Template 📝

```markdown
# ESP8266 Integration Test Report

**Date**: [YYYY-MM-DD]
**Tester**: [Your Name]
**Hardware**: ESP8266 NodeMCU + MAX30102

## Test Results

### Scenario 1: Normal Operation
- [ ] PASS  / [ ] FAIL
- Notes: _______________________________

### Scenario 2: Finger Placement Alert
- [ ] PASS  / [ ] FAIL
- Notes: _______________________________

### Scenario 3: Alert Auto-Hide
- [ ] PASS  / [ ] FAIL
- Actual timing: _____ seconds

### Scenario 4: Reconnection
- [ ] PASS  / [ ] FAIL
- Notes: _______________________________

### Scenario 5: Data Source Priority
- [ ] PASS  / [ ] FAIL
- Notes: _______________________________

### Scenario 6: Disconnect and Fallback
- [ ] PASS  / [ ] FAIL
- Notes: _______________________________

## Issues Found
1. _______________________________
2. _______________________________

## Overall Status
- [ ] All tests PASSED ✅
- [ ] Some tests FAILED ❌

## Screenshots
[Attach screenshots here]
```

---

## Quick Test Commands 🚀

```powershell
# 1. Start MongoDB
docker start mongodb-rpm

# 2. Connect ESP8266
cd c:\Users\pranith rp\Downloads\finall\finall\web\web_interface\server
.\connect-sensor.bat

# 3. Check sensor status
# Look for: "ESP8266 connected on COM5"

# 4. Open browser
start http://localhost:3000

# 5. Test finger removal
# Remove finger → Alert should appear → Wait 5s → Alert disappears
```

---

## Troubleshooting Quick Reference 🆘

| Problem | Solution |
|---------|----------|
| "Access is denied" | Close Arduino Serial Monitor |
| No data in UI | Check "Start Monitoring" clicked |
| Alert doesn't appear | Remove finger completely from sensor |
| Alert doesn't hide | Wait full 5 seconds, check setTimeout |
| CSV data showing | ESP8266 not connected or sending zeros |
| No blue badges | Check data_source in Socket.IO events |

---

## Final Checklist Before Demo ✅

- [ ] MongoDB running
- [ ] Server running without errors
- [ ] Frontend compiled and running
- [ ] ESP8266 connected and sending data
- [ ] Arduino Serial Monitor closed
- [ ] Browser at http://localhost:3000
- [ ] Logged in as doctor
- [ ] "Start Monitoring" clicked
- [ ] Finger on sensor showing normal readings
- [ ] Test finger removal → Alert works
- [ ] Test reconnection → Normal readings resume

**All systems ready for demonstration!** 🎉

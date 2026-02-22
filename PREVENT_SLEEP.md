# Preventing TV Sleep on Windows Display Systems

The display monitor/TV will still enter sleep mode if Windows power settings are not properly configured. Follow these steps to prevent automatic sleep:

## Windows Power Settings

### Method 1: Disable Sleep (Recommended for Kiosk/Display Screens)

1. **Open Settings**
   - Press `Win + I` or go to Settings

2. **Navigate to Power Settings**
   - Go to **System** → **Power & battery** (or Power & sleep)
   - Click on **Power and sleep settings**

3. **Screen & Sleep Settings**
   - **Screen timeout (on battery)**: Set to "Never"
   - **Screen timeout (plugged in)**: Set to "Never"
   - **Sleep (on battery)**: Set to "Never"
   - **Sleep (plugged in)**: Set to "Never"

### Method 2: Change Power Plan (Alternative)

1. **Open Control Panel**
   - Search for "Power Plan" in Windows Search

2. **Select/Create High Performance Plan**
   - Click on "High performance" or create a new one

3. **Click "Change plan settings"**
   - Set "Put the computer to sleep" to "Never"
   - Set "Turn off the display" to "Never"

## Keep Alive Software Mechanisms

In addition to Windows settings, the application implements:

- ✅ **Screen Wake Lock API** - Keeps the screen awake while the browser is in focus
- ✅ **Periodic Input Simulation** - Every 10 seconds:
  - Mouse movement events
  - Keyboard events (Shift key)
  - Focus events
- ✅ **Silent Audio Oscillator** - Running an inaudible audio signal to prevent media suspension

## Testing

To verify the settings are working:

1. Open your display at `http://localhost:3000` (or your deployment URL)
2. Let the page sit idle for 5+ minutes without interaction
3. The display should remain on and continue cycling through announcements

If the screen still goes to sleep:
- Check Windows power settings again
- Verify the monitor isn't controlled by a separate power management app
- Check BIOS settings on the PC/TV - some devices have additional power management

## Troubleshooting

### If Wake Lock doesn't work:
- Uses fallback input simulation instead
- Check browser console for errors

### If monitor still sleeps:
- Ensure monitor is plugged in (not on battery)
- Check monitor's own power-saving settings
- Verify no other power management software is interfering (e.g., BitFender, McAfee)

### For LG/Samsung Smart TVs:
- Some TVs have CEC (Consumer Electronics Control) enabled
- This might turn off the TV even if Windows is awake
- Check TV settings → HDMI CEC Settings → Disable "Anynet+", "CEC", or "HDMI-CEC"

// Prevent multiple executions of the Clock app script
if (typeof window.clockAppLoaded !== 'undefined') {
    console.log('Clock app script already loaded, skipping re-initialization');
} else {
    window.clockAppLoaded = true;

    (function() {
        const digitalClockElement = document.getElementById('time');
        const analogHourHand = document.getElementById('hour-hand');
        const analogMinuteHand = document.getElementById('minute-hand');
        const analogSecondHand = document.getElementById('second-hand');
        const tickMarksContainer = document.getElementById('tick-marks');

        // Ensure dbManager is available
        const dbManager = window.dbManager;

async function saveAlarms() {
    if (dbManager) {
        try {
            await dbManager.saveSetting('clock_alarms', alarms);
            console.log('Alarms saved successfully.');
        } catch (error) {
            console.error('Error saving alarms:', error);
        }
    } else {
        console.warn('dbManager not available. Alarms not saved.');
    }
}

async function loadAlarms() {
    if (dbManager) {
        try {
            const savedAlarms = await dbManager.loadSetting('clock_alarms');
            if (savedAlarms && Array.isArray(savedAlarms)) {
                alarms = savedAlarms;
                console.log('Alarms loaded successfully.');
            } else {
                alarms = []; // Initialize with empty array if nothing is saved or format is incorrect
                console.log('No saved alarms found or format incorrect, initialized with empty array.');
            }
        } catch (error) {
            console.error('Error loading alarms:', error);
            alarms = []; // Initialize with empty array on error
        }
    } else {
        console.warn('dbManager not available. Alarms not loaded, using default empty array.');
        alarms = [];
    }
    displayAlarms(); // Display alarms after loading
}


function updateDigitalClock(now) {
  if (!digitalClockElement) return;
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;
  digitalClockElement.textContent = timeString;
}

function updateAnalogClock(now) {
  if (!analogHourHand || !analogMinuteHand || !analogSecondHand) return;

  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours();

  // Add milliseconds for smoother second hand movement
  const milliseconds = now.getMilliseconds();
  const secondsWithMs = seconds + milliseconds / 1000;

  const secondsAngle = (secondsWithMs / 60) * 360;
  const minutesAngle = ((minutes + seconds / 60) / 60) * 360;
  const hoursAngle = (((hours % 12) + minutes / 60) / 12) * 360;

  analogSecondHand.setAttribute('transform', `rotate(${secondsAngle}, 110, 110)`);
  analogMinuteHand.setAttribute('transform', `rotate(${minutesAngle}, 110, 110)`);
  analogHourHand.setAttribute('transform', `rotate(${hoursAngle}, 110, 110)`);
}

function createTickMarks() {
    if (!tickMarksContainer) return;
    tickMarksContainer.innerHTML = ''; // Clear existing (e.g. from HTML template)

    for (let i = 0; i < 60; i++) {
        const angle = i * 6; // 360 / 60 = 6 degrees per tick
        const isHourTick = i % 5 === 0;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", "110");
        line.setAttribute("y1", isHourTick ? "20" : "20"); // Start further out for hour ticks
        line.setAttribute("x2", "110");
        line.setAttribute("y2", isHourTick ? "35" : "30"); // Longer for hour ticks
        line.setAttribute("class", isHourTick ? "hour-tick" : "tick");
        line.setAttribute("transform", `rotate(${angle}, 110, 110)`);
        tickMarksContainer.appendChild(line);
    }
}


let lastAlarmCheckMinute = -1;

function clockLoop() {
  const now = new Date();
  updateDigitalClock(now);
  updateAnalogClock(now);

  // Check alarms only once per minute to avoid multiple alerts for the same minute
  const currentMinute = now.getMinutes();
  if (currentMinute !== lastAlarmCheckMinute) {
    checkAlarms(now);
    lastAlarmCheckMinute = currentMinute;
  }

  requestAnimationFrame(clockLoop);
}

// Alarms
let alarms = []; // Made 'let' for potential reassignment from DB
let editingAlarmIndex = null;

const alarmTimeInput = document.getElementById('alarm-time');
const alarmLabelInput = document.getElementById('alarm-label');
const addAlarmButton = document.getElementById('add-alarm-button');
const alarmsList = document.getElementById('alarms-list');

function displayAlarms() {
  if (!alarmsList) return;
  alarmsList.innerHTML = ''; // Clear current list

  alarms.forEach((alarm, index) => {
    const listItem = document.createElement('li');
    listItem.className = alarm.enabled ? '' : 'disabled';

    const alarmInfoDiv = document.createElement('div');
    alarmInfoDiv.className = 'alarm-info';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = alarm.enabled;
    checkbox.addEventListener('change', () => {
      alarms[index].enabled = checkbox.checked;
      listItem.className = alarms[index].enabled ? '' : 'disabled';
      saveAlarms();
    });

    const textSpan = document.createElement('span');
    textSpan.textContent = `${alarm.time} - ${alarm.label}`;

    alarmInfoDiv.appendChild(checkbox);
    alarmInfoDiv.appendChild(textSpan);

    const alarmActionsDiv = document.createElement('div');
    alarmActionsDiv.className = 'alarm-actions';

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.className = 'button-secondary';
    editButton.addEventListener('click', () => editAlarm(index));

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'button-danger';
    deleteButton.addEventListener('click', () => {
      alarms.splice(index, 1);
      displayAlarms();
      saveAlarms();
    });

    alarmActionsDiv.appendChild(editButton);
    alarmActionsDiv.appendChild(deleteButton);

    listItem.appendChild(alarmInfoDiv);
    listItem.appendChild(alarmActionsDiv);
    alarmsList.appendChild(listItem);
  });
}

// Stopwatch
let stopwatchInterval = null;
let stopwatchStartTime = 0;
let stopwatchElapsedTime = 0;
let stopwatchRunning = false;
let laps = [];

const stopwatchTimeDisplay = document.getElementById('stopwatch-time');
const startStopwatchButton = document.getElementById('start-stopwatch');
const stopStopwatchButton = document.getElementById('stop-stopwatch');
const lapStopwatchButton = document.getElementById('lap-stopwatch');
const resetStopwatchButton = document.getElementById('reset-stopwatch');
const stopwatchLapsList = document.getElementById('stopwatch-laps');

function formatStopwatchTime(timeMilliseconds) {
  const totalSeconds = Math.floor(timeMilliseconds / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const milliseconds = String(timeMilliseconds % 1000).padStart(3, '0');
  return `${minutes}:${seconds}.${milliseconds}`;
}

function updateStopwatchDisplay() {
  let currentTime;
  if (stopwatchRunning) {
    currentTime = Date.now() - stopwatchStartTime + stopwatchElapsedTime;
  } else {
    currentTime = stopwatchElapsedTime;
  }
  if (stopwatchTimeDisplay) {
    stopwatchTimeDisplay.textContent = formatStopwatchTime(currentTime);
  }
}

function startStopwatch() {
  if (stopwatchRunning) return;
  stopwatchRunning = true;
  stopwatchStartTime = Date.now(); // Reset start time relative to now
  // stopwatchElapsedTime is already holding the paused duration.

  clearInterval(stopwatchInterval);
  stopwatchInterval = setInterval(updateStopwatchDisplay, 10);

  if (startStopwatchButton) startStopwatchButton.disabled = true;
  if (stopStopwatchButton) stopStopwatchButton.disabled = false;
  if (lapStopwatchButton) lapStopwatchButton.disabled = false;
}

function stopStopwatch() {
  if (!stopwatchRunning) return;
  stopwatchRunning = false;
  stopwatchElapsedTime += (Date.now() - stopwatchStartTime); // Accumulate elapsed time
  clearInterval(stopwatchInterval);
  updateStopwatchDisplay();

  if (startStopwatchButton) startStopwatchButton.disabled = false;
  if (stopStopwatchButton) stopStopwatchButton.disabled = true;
  if (lapStopwatchButton) lapStopwatchButton.disabled = true;
}

function resetStopwatch() {
  stopwatchRunning = false;
  clearInterval(stopwatchInterval);
  stopwatchStartTime = 0;
  stopwatchElapsedTime = 0;
  laps = [];

  updateStopwatchDisplay();
  if (stopwatchLapsList) stopwatchLapsList.innerHTML = '';

  if (startStopwatchButton) startStopwatchButton.disabled = false;
  if (stopStopwatchButton) stopStopwatchButton.disabled = true;
  if (lapStopwatchButton) lapStopwatchButton.disabled = true;
}

function displayLaps() {
  if (!stopwatchLapsList) return;
  stopwatchLapsList.innerHTML = '';
  laps.forEach((lap, index) => {
    const listItem = document.createElement('li');
    listItem.textContent = `Lap ${index + 1}: ${lap}`;
    stopwatchLapsList.appendChild(listItem);
  });
}

function lapStopwatch() {
  if (!stopwatchRunning) return;
  let currentLapTimeValue = Date.now() - stopwatchStartTime + stopwatchElapsedTime;
  laps.push(formatStopwatchTime(currentLapTimeValue));
  displayLaps();
}

if (startStopwatchButton) startStopwatchButton.addEventListener('click', startStopwatch);
if (stopStopwatchButton) stopStopwatchButton.addEventListener('click', stopStopwatch);
if (lapStopwatchButton) lapStopwatchButton.addEventListener('click', lapStopwatch);
if (resetStopwatchButton) resetStopwatchButton.addEventListener('click', resetStopwatch);

updateStopwatchDisplay(); // Initial display update for stopwatch

function editAlarm(index) {
  editingAlarmIndex = index;
  const alarm = alarms[index];
  if (alarmTimeInput) alarmTimeInput.value = alarm.time;
  if (alarmLabelInput) alarmLabelInput.value = alarm.label;
  if (addAlarmButton) addAlarmButton.textContent = 'Update Alarm';
}

function addAlarm() {
  if (!alarmTimeInput || !alarmLabelInput) return;
  const time = alarmTimeInput.value;
  const label = alarmLabelInput.value.trim() || 'Alarm';

  if (!time) {
    // Replace with AuraOS notification later if available
    console.warn('Please select a time for the alarm.');
    if (window.AuraGameSDK && window.AuraGameSDK.ui && window.AuraGameSDK.ui.showNotification) {
        window.AuraGameSDK.ui.showNotification({ message: 'Please select a time for the alarm.', type: 'warning' });
    } else {
        alert('Please select a time for the alarm.');
    }
    return;
  }

  if (editingAlarmIndex !== null) {
    alarms[editingAlarmIndex].time = time;
    alarms[editingAlarmIndex].label = label;
    editingAlarmIndex = null;
    if (addAlarmButton) addAlarmButton.textContent = 'Add Alarm';
  } else {
    alarms.push({ time, label, enabled: true });
  }

  displayAlarms();
  saveAlarms();

  alarmTimeInput.value = '';
  alarmLabelInput.value = '';
}

if (addAlarmButton) {
  addAlarmButton.addEventListener('click', addAlarm);
}

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    button.classList.add('active');
    const targetTab = button.getAttribute('data-tab');
    const targetContent = document.getElementById(targetTab);
    if (targetContent) {
        targetContent.classList.add('active');
    }
  });
});

function checkAlarms(now) {
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeFormatted = `${currentHours}:${currentMinutes}`;

  alarms.forEach((alarm, index) => {
    if (alarm.enabled && alarm.time === currentTimeFormatted) {
      console.log(`Alarm triggered: ${alarm.label}`);
      if (window.AuraGameSDK && window.AuraGameSDK.ui && window.AuraGameSDK.ui.showNotification) {
        window.AuraGameSDK.ui.showNotification({
          message: `Alarm: ${alarm.label}`,
          type: 'warning', // As per requirement
          duration: 5000 // Keep notification for 5 seconds
        });
      } else {
        // Fallback if AuraGameSDK is not available
        alert(`Alarm: ${alarm.label}`);
      }

      if (window.AuraGameSDK && window.AuraGameSDK.audio && window.AuraGameSDK.audio.playSfx) {
        // Using placeholder sound as discussed
        window.AuraGameSDK.audio.playSfx('gameassets/sounds/blueprint_unlocked.wav');
      } else {
        console.warn('AuraGameSDK audio not available for alarm sound.');
      }

      alarms[index].enabled = false; // Disable alarm after it triggers
      displayAlarms();
      saveAlarms(); // Save the change in enabled state
    }
  });
}

// Timer
const timerDisplay = document.getElementById('timer-display');
const timerHoursInput = document.getElementById('timer-hours');
const timerMinutesInput = document.getElementById('timer-minutes');
const timerSecondsInput = document.getElementById('timer-seconds');
const startTimerButton = document.getElementById('start-timer');
const pauseTimerButton = document.getElementById('pause-timer');
const resetTimerButton = document.getElementById('reset-timer');

let timerInterval = null;
let timerTotalSeconds = 0;
let timerRemainingSeconds = 0;
let timerRunning = false;

function formatTimerTime(totalSeconds) {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function updateTimerDisplay() {
    if (timerDisplay) {
        timerDisplay.textContent = formatTimerTime(timerRemainingSeconds);
    }
}

function setTimerInputsDisabled(disabled) {
    if (timerHoursInput) timerHoursInput.disabled = disabled;
    if (timerMinutesInput) timerMinutesInput.disabled = disabled;
    if (timerSecondsInput) timerSecondsInput.disabled = disabled;
}

function timerTick() {
    timerRemainingSeconds--;
    updateTimerDisplay();

    if (timerRemainingSeconds <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        setTimerInputsDisabled(false);
        if (startTimerButton) startTimerButton.disabled = false;
        if (pauseTimerButton) pauseTimerButton.disabled = true;
        if (pauseTimerButton) pauseTimerButton.textContent = 'Pause';


        if (window.AuraGameSDK && window.AuraGameSDK.ui && window.AuraGameSDK.ui.showNotification) {
            window.AuraGameSDK.ui.showNotification({
                message: 'Timer Finished!',
                type: 'info',
                duration: 5000
            });
        } else {
            alert('Timer Finished!');
        }

        if (window.AuraGameSDK && window.AuraGameSDK.audio && window.AuraGameSDK.audio.playSfx) {
            window.AuraGameSDK.audio.playSfx('gameassets/sounds/blueprint_unlocked.wav'); // Placeholder
        }
        // Optionally, reset to original duration or 0
        // timerRemainingSeconds = timerTotalSeconds;
        // updateTimerDisplay();
    }
}

function startTimer() {
    if (timerRunning && timerInterval) { // If already running (e.g. "Resume" was clicked)
        timerInterval = setInterval(timerTick, 1000);
        if (pauseTimerButton) pauseTimerButton.textContent = 'Pause';
    } else { // Starting fresh or from paused state where interval was cleared
        const hours = parseInt(timerHoursInput.value) || 0;
        const minutes = parseInt(timerMinutesInput.value) || 0;
        const seconds = parseInt(timerSecondsInput.value) || 0;
        timerTotalSeconds = (hours * 3600) + (minutes * 60) + seconds;

        if (timerTotalSeconds <= 0) {
            if (window.AuraGameSDK && AuraGameSDK.ui) {
                AuraGameSDK.ui.showNotification({ message: "Please set a duration for the timer.", type: "warning" });
            } else {
                alert("Please set a duration for the timer.");
            }
            return;
        }
        timerRemainingSeconds = timerTotalSeconds;
        updateTimerDisplay();
        timerInterval = setInterval(timerTick, 1000);
    }

    timerRunning = true;
    setTimerInputsDisabled(true);
    if (startTimerButton) startTimerButton.disabled = true;
    if (pauseTimerButton) pauseTimerButton.disabled = false;
    if (pauseTimerButton) pauseTimerButton.textContent = 'Pause';
}

function pauseTimer() {
    if (!timerRunning) return; // Should not happen if button is disabled
    clearInterval(timerInterval);
    // timerRunning remains true, but interval is cleared. startTimer will resume.
    // Or, introduce a specific 'paused' state if needed for more complex logic.
    if (startTimerButton) startTimerButton.disabled = false; // Allow to resume
    if (pauseTimerButton) pauseTimerButton.textContent = 'Resume';
    // Note: if pauseTimerButton is clicked again (now "Resume"), it calls startTimer which handles resume.
    // This might be confusing. A dedicated resume function or state check in startTimer is better.
    // For now, clicking "Start" (if it were enabled) or "Resume" (which is actually pauseTimerButton) would resume.
    // Let's make "Start" button become "Resume" or handle it more cleanly.
    // Simpler: Pause clears interval. Start will pick up remaining time if timerRunning is true.
    // To make "Pause" button toggle between Pause/Resume:
    if (pauseTimerButton.textContent === 'Pause') {
        clearInterval(timerInterval);
        // timerRunning = false; // Or a new state like `timerPaused = true`
        pauseTimerButton.textContent = 'Resume';
        // startTimerButton remains disabled, user must click "Resume"
    } else { // Content is "Resume"
        startTimer(); // This will effectively resume with remaining time
        pauseTimerButton.textContent = 'Pause';
    }

}


function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    // timerPaused = false;
    setTimerInputsDisabled(false);

    // Reset to default values or last set values. For now, reset to 0 or initial default.
    if(timerHoursInput) timerHoursInput.value = 0;
    if(timerMinutesInput) timerMinutesInput.value = 0;
    if(timerSecondsInput) timerSecondsInput.value = 5; // Or 0

    timerRemainingSeconds = (parseInt(timerHoursInput.value) * 3600) + (parseInt(timerMinutesInput.value) * 60) + parseInt(timerSecondsInput.value);
    // If resetting to 0:
    // timerRemainingSeconds = 0;

    updateTimerDisplay();

    if (startTimerButton) startTimerButton.disabled = false;
    if (pauseTimerButton) pauseTimerButton.disabled = true;
    if (pauseTimerButton) pauseTimerButton.textContent = 'Pause';
}

if (startTimerButton) startTimerButton.addEventListener('click', startTimer);
if (pauseTimerButton) pauseTimerButton.addEventListener('click', pauseTimer);
if (resetTimerButton) resetTimerButton.addEventListener('click', resetTimer);


// Initial Setup
document.addEventListener('DOMContentLoaded', async () => {
    createTickMarks();
    if (dbManager && typeof dbManager.init === 'function' && !dbManager.db) {
        try {
            await dbManager.init(); // Ensure DB is initialized
            console.log("DBManager initialized by Clock app.");
        } catch (error) {
            console.error("Clock app: Error initializing DBManager:", error);
        }
    }
    await loadAlarms(); // Load alarms, which then calls displayAlarms
    resetTimer(); // Initialize timer display and state
    clockLoop(); // Start the main clock update loop
});

    })(); // Close the IIFE
}

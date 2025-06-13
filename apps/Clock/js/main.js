function updateDigitalClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;
  document.getElementById('time').textContent = timeString;
}

function updateAnalogClock() {
  const now = new Date();
  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours();

  const secondHand = document.getElementById('second-hand');
  const minuteHand = document.getElementById('minute-hand');
  const hourHand = document.getElementById('hour-hand');

  const secondsAngle = (seconds / 60) * 360;
  const minutesAngle = ((minutes + seconds / 60) / 60) * 360;
  const hoursAngle = (((hours % 12) + minutes / 60) / 12) * 360;

  secondHand.setAttribute('transform', `rotate(${secondsAngle}, 100, 100)`);
  minuteHand.setAttribute('transform', `rotate(${minutesAngle}, 100, 100)`);
  hourHand.setAttribute('transform', `rotate(${hoursAngle}, 100, 100)`);
}

// Update the clocks and check alarms every second
setInterval(() => {
  updateDigitalClock();
  updateAnalogClock();
  checkAlarms();
}, 1000);

// Initial call to display the clocks immediately
updateAnalogClock();
updateDigitalClock();

// Alarms
const alarms = [];
let editingAlarmIndex = null; // To track the alarm being edited

const alarmTimeInput = document.getElementById('alarm-time');
const alarmLabelInput = document.getElementById('alarm-label');
const addAlarmButton = document.getElementById('add-alarm-button');
const alarmsList = document.getElementById('alarms-list');

function displayAlarms() {
  alarmsList.innerHTML = ''; // Clear current list

  alarms.forEach((alarm, index) => {
    const listItem = document.createElement('li');
    listItem.className = alarm.enabled ? '' : 'disabled';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = alarm.enabled;
    checkbox.addEventListener('change', () => {
      alarms[index].enabled = checkbox.checked;
      // displayAlarms(); // Re-render to apply style, or just toggle class
      listItem.className = alarms[index].enabled ? '' : 'disabled';
    });

    const textSpan = document.createElement('span');
    textSpan.textContent = `${alarm.time} - ${alarm.label}`;

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => editAlarm(index));

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      alarms.splice(index, 1);
      displayAlarms();
    });

    listItem.appendChild(checkbox);
    listItem.appendChild(textSpan);
    listItem.appendChild(editButton);
    listItem.appendChild(deleteButton);
    alarmsList.appendChild(listItem);
  });
}

// Stopwatch
let stopwatchInterval = null;
let stopwatchStartTime = 0;
let stopwatchElapsedTime = 0; // Time elapsed when paused
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
  stopwatchStartTime = Date.now();
  clearInterval(stopwatchInterval); // Clear any existing interval
  stopwatchInterval = setInterval(updateStopwatchDisplay, 10); // Update every 10ms

  if (startStopwatchButton) startStopwatchButton.disabled = true;
  if (stopStopwatchButton) stopStopwatchButton.disabled = false;
  if (lapStopwatchButton) lapStopwatchButton.disabled = false;
}

function stopStopwatch() {
  if (!stopwatchRunning) return;
  stopwatchRunning = false;
  stopwatchElapsedTime += (Date.now() - stopwatchStartTime);
  clearInterval(stopwatchInterval);
  updateStopwatchDisplay(); // Show final paused time

  if (startStopwatchButton) startStopwatchButton.disabled = false;
  if (stopStopwatchButton) stopStopwatchButton.disabled = true;
  // Lap button should also be disabled when stopped
  if (lapStopwatchButton) lapStopwatchButton.disabled = true;
}

function resetStopwatch() {
  stopwatchRunning = false;
  clearInterval(stopwatchInterval);
  stopwatchStartTime = 0;
  stopwatchElapsedTime = 0;
  laps = [];

  updateStopwatchDisplay(); // Update display to 00:00:00.000
  if (stopwatchLapsList) stopwatchLapsList.innerHTML = ''; // Clear laps list

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
  let currentLapTimeValue;
  if (stopwatchRunning) {
    currentLapTimeValue = Date.now() - stopwatchStartTime + stopwatchElapsedTime;
  } else {
    currentLapTimeValue = stopwatchElapsedTime; // Should not happen if lap button is disabled when stopped
  }
  laps.push(formatStopwatchTime(currentLapTimeValue));
  displayLaps();
}

// Event Listeners for Stopwatch
if (startStopwatchButton) startStopwatchButton.addEventListener('click', startStopwatch);
if (stopStopwatchButton) stopStopwatchButton.addEventListener('click', stopStopwatch);
if (lapStopwatchButton) lapStopwatchButton.addEventListener('click', lapStopwatch);
if (resetStopwatchButton) resetStopwatchButton.addEventListener('click', resetStopwatch);

// Initial Stopwatch Display Update
updateStopwatchDisplay();

function editAlarm(index) {
  editingAlarmIndex = index;
  const alarm = alarms[index];
  alarmTimeInput.value = alarm.time;
  alarmLabelInput.value = alarm.label;
  addAlarmButton.textContent = 'Update Alarm';
}

function addAlarm() {
  const time = alarmTimeInput.value;
  const label = alarmLabelInput.value || 'Alarm'; // Default label

  if (!time) {
    alert('Please select a time for the alarm.');
    return;
  }

  if (editingAlarmIndex !== null) {
    // Update existing alarm
    alarms[editingAlarmIndex].time = time;
    alarms[editingAlarmIndex].label = label;
    // alarms[editingAlarmIndex].enabled is handled by checkbox directly
    editingAlarmIndex = null;
    addAlarmButton.textContent = 'Add Alarm';
  } else {
    // Add new alarm
    const newAlarm = {
      time: time,
      label: label,
      enabled: true // By default, new alarms are enabled
    };
    alarms.push(newAlarm);
  }

  displayAlarms();

  // Clear input fields
  alarmTimeInput.value = '';
  alarmLabelInput.value = '';
}

if (addAlarmButton) {
  addAlarmButton.addEventListener('click', addAlarm);
}

// Tab switching logic
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Deactivate all tabs
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Activate clicked tab
    button.classList.add('active');
    const targetTab = button.getAttribute('data-tab');
    document.getElementById(targetTab).classList.add('active');
  });
});

// Initialize alarms display (if on alarms tab initially, though it's hidden by default)
displayAlarms();

function checkAlarms() {
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeFormatted = `${currentHours}:${currentMinutes}`;

  alarms.forEach((alarm, index) => {
    if (alarm.enabled && alarm.time === currentTimeFormatted) {
      alert(`Alarm: ${alarm.label}`);
      alarms[index].enabled = false; // Disable alarm after it triggers
      // No need to splice here, just update state
      displayAlarms(); // Update UI to show it's disabled
    }
  });
}

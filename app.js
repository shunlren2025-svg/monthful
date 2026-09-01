const calendarCard = document.querySelector('#calendarCard');
const monthTitle = document.querySelector('#monthTitle');
const monthSummary = document.querySelector('#monthSummary');
const dialog = document.querySelector('#eventDialog');
const form = document.querySelector('#eventForm');
const titleInput = document.querySelector('#eventTitle');
const dateInput = document.querySelector('#eventDate');
const timeInput = document.querySelector('#eventTime');
const repeatInput = document.querySelector('#repeatWeekly');
const reminderInput = document.querySelector('#eventReminder');
const deleteButton = document.querySelector('#deleteEvent');
const toast = document.querySelector('#toast');
const alertButton = document.querySelector('#alertButton');
const categoryOptions = document.querySelector('#categoryOptions');
const newCategoryForm = document.querySelector('#newCategoryForm');
const reminderBanner = document.querySelector('#reminderBanner');
const shareDialog = document.querySelector('#shareDialog');
const shareForm = document.querySelector('#shareForm');
const shareViewInput = document.querySelector('#shareView');
const shareCategoryOptions = document.querySelector('#shareCategoryOptions');
const shareLinkArea = document.querySelector('#shareLinkArea');
const shareUrlInput = document.querySelector('#shareUrl');

const EVENTS_KEY = 'monthful-events-v2';
const OLD_EVENTS_KEY = 'monthful-events-v1';
const CATEGORIES_KEY = 'monthful-categories-v1';
const NOTIFIED_KEY = 'monthful-notified-v1';
const defaultCategories = [
  { id: 'school', name: 'School', color: '#4e68d8' },
  { id: 'activity', name: 'Activity', color: '#e18441' },
  { id: 'life', name: 'Life', color: '#5f9c74' },
  { id: 'fun', name: 'Fun', color: '#d2618e' }
];

let events = loadJSON(EVENTS_KEY, loadJSON(OLD_EVENTS_KEY, []));
let categories = loadJSON(CATEGORIES_KEY, defaultCategories);
let notified = loadJSON(NOTIFIED_KEY, []);
let selectedDate = new Date();
let selectedHour = selectedDate.getHours();
let currentView = 'month';
let editingId = null;
let sharedMode = false;
let shareSettings = { hideNames: false, hideTimes: false, hidePanel: false };

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

function saveAll() {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function eventDateTime(event) {
  const date = parseLocalDate(event.date);
  const [hours, minutes] = event.time.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTime(value) {
  const [hour, minute] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hour, minute));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function categoryFor(id) {
  return categories.find(category => category.id === id) || categories[0];
}

function buildEventChip(event) {
  const category = categoryFor(event.category);
  const reminderMark = event.reminder !== undefined && event.reminder !== '' ? '<span class="reminder-mark" aria-label="Reminder set">♢</span>' : '';
  const showTime = !(sharedMode && shareSettings.hideTimes);
  const title = showTime ? `${formatTime(event.time)} — ${event.title}` : event.title;
  return `<span class="event custom" data-event-id="${escapeHtml(event.id)}" style="--event-color:${category.color}" title="${escapeHtml(title)}">${showTime ? `<span class="event-time">${formatTime(event.time).replace(' ', '')}</span>` : ''}<span>${escapeHtml(event.title)}</span>${reminderMark}</span>`;
}

function eventsOn(key) {
  return events.filter(event => event.date === key).sort((a, b) => a.time.localeCompare(b.time));
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function updateHeading(rangeStart, rangeEnd) {
  let title;
  if (currentView === 'month') title = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  else if (currentView === 'week') title = `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${rangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  else if (currentView === 'day') title = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  else title = `${formatTime(`${String(selectedHour).padStart(2, '0')}:00`)} · ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  monthTitle.textContent = title;
  document.title = `${title} — Monthful`;
}

function updateSummary(visibleEvents) {
  monthSummary.textContent = visibleEvents.length ? `${visibleEvents.length} ${visibleEvents.length === 1 ? 'thing' : 'things'} planned — you’ve got this.` : 'Nothing planned yet — enjoy the calm.';
}

function renderCalendar() {
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === currentView));
  calendarCard.classList.toggle('agenda-mode', currentView !== 'month');
  if (currentView === 'month') renderMonth();
  if (currentView === 'week') renderWeek();
  if (currentView === 'day') renderDay();
  if (currentView === 'hour') renderHour();
  renderSidebar();
}

function renderSidebar() {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const monthEvents = events.filter(event => {
    const date = parseLocalDate(event.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  document.querySelector('#eventTotal').textContent = monthEvents.length;

  const now = new Date();
  const next = events.filter(event => eventDateTime(event) >= now).sort((a, b) => eventDateTime(a) - eventDateTime(b))[0];
  document.querySelector('#nextEvent').innerHTML = next
    ? `<span style="color:${categoryFor(next.category).color}">${escapeHtml(next.title)}</span><br><small>${eventDateTime(next).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${sharedMode && shareSettings.hideTimes ? '' : ` · ${formatTime(next.time)}`}</small>`
    : 'Your schedule is wide open.';

  const counts = new Map();
  monthEvents.forEach(event => counts.set(event.category, (counts.get(event.category) || 0) + 1));
  document.querySelector('#categoryLegend').innerHTML = categories.map(category => `<span class="legend-pill"><i style="background:${category.color}"></i>${escapeHtml(category.name)}${counts.get(category.id) ? ` · ${counts.get(category.id)}` : ''}</span>`).join('');
}

function renderMonth() {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  updateHeading();
  updateSummary(events.filter(event => { const date = parseLocalDate(event.date); return date.getFullYear() === year && date.getMonth() === month; }));
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((firstDay.getDay() + 6) % 7));
  const today = dateKey(new Date());
  let days = '';
  for (let index = 0; index < 42; index++) {
    const dayDate = new Date(start); dayDate.setDate(start.getDate() + index);
    const key = dateKey(dayDate);
    const dayEvents = eventsOn(key);
    const visibleCount = window.innerWidth <= 760 ? 2 : 3;
    const chips = dayEvents.slice(0, visibleCount).map(buildEventChip).join('');
    const more = dayEvents.length > visibleCount ? `<span class="more-events">+${dayEvents.length - visibleCount} more</span>` : '';
    days += `<button type="button" class="day${dayDate.getMonth() !== month ? ' outside' : ''}${key === today ? ' today' : ''}" data-date="${key}" aria-label="${dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, ${dayEvents.length} events. Add event."><span class="day-number">${dayDate.getDate()}</span>${chips}${more}</button>`;
  }
  calendarCard.innerHTML = `<div class="weekday-row" aria-hidden="true"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span class="weekend">SAT</span><span class="weekend">SUN</span></div><div class="calendar-grid">${days}</div>`;
}

function renderWeek() {
  const start = startOfWeek(selectedDate);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  updateHeading(start, end);
  const weekEvents = events.filter(event => { const date = parseLocalDate(event.date); return date >= start && date <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59); });
  updateSummary(weekEvents);
  const today = dateKey(new Date());
  let header = '', columns = '';
  for (let index = 0; index < 7; index++) {
    const day = new Date(start); day.setDate(start.getDate() + index);
    const key = dateKey(day);
    header += `<span>${day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}<b>${day.getDate()}</b></span>`;
    columns += `<div class="week-day${key === today ? ' today' : ''}" data-date="${key}" role="button" tabindex="0" aria-label="Add event on ${day.toLocaleDateString()}">${eventsOn(key).map(buildEventChip).join('')}</div>`;
  }
  calendarCard.innerHTML = `<div class="agenda-header week">${header}</div><div class="week-grid">${columns}</div>`;
}

function renderDay() {
  updateHeading();
  const key = dateKey(selectedDate);
  const dayEvents = eventsOn(key);
  updateSummary(dayEvents);
  if (sharedMode && shareSettings.hideTimes) {
    calendarCard.innerHTML = `<div class="hour-note">Events for this day · times are hidden by the owner.</div><div class="untimed-list">${dayEvents.map(buildEventChip).join('') || '<p>No shared events for this day.</p>'}</div>`;
    return;
  }
  let rows = '';
  for (let hour = 0; hour < 24; hour++) {
    const time = `${String(hour).padStart(2, '0')}:00`;
    const hourEvents = dayEvents.filter(event => Number(event.time.slice(0, 2)) === hour);
    rows += `<div class="time-row" data-date="${key}" data-time="${time}" role="button" tabindex="0" aria-label="Add event at ${formatTime(time)}"><span class="time-label">${formatTime(time)}</span><div class="time-events">${hourEvents.map(buildEventChip).join('')}</div></div>`;
  }
  calendarCard.innerHTML = `<div class="hour-note">Click any time to add an event. Events stay color-coded by category.</div><div class="timeline">${rows}</div>`;
}

function renderHour() {
  updateHeading();
  const key = dateKey(selectedDate);
  const hourEvents = eventsOn(key).filter(event => Number(event.time.slice(0, 2)) === selectedHour);
  updateSummary(hourEvents);
  if (sharedMode && shareSettings.hideTimes) {
    const dayEvents = eventsOn(key);
    updateSummary(dayEvents);
    calendarCard.innerHTML = `<div class="hour-note">Events for this day · times are hidden by the owner.</div><div class="untimed-list">${dayEvents.map(buildEventChip).join('') || '<p>No shared events for this day.</p>'}</div>`;
    return;
  }
  let rows = '';
  for (let quarter = 0; quarter < 4; quarter++) {
    const minute = quarter * 15;
    const time = `${String(selectedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const slotEvents = hourEvents.filter(event => { const eventMinute = Number(event.time.slice(3)); return eventMinute >= minute && eventMinute < minute + 15; });
    rows += `<div class="time-row" data-date="${key}" data-time="${time}" role="button" tabindex="0" aria-label="Add event at ${formatTime(time)}"><span class="time-label">${formatTime(time)}</span><div class="time-events">${slotEvents.map(buildEventChip).join('')}</div></div>`;
  }
  calendarCard.innerHTML = `<div class="hour-note">A closer look at one hour, divided into 15-minute slots.</div><div class="timeline hour-grid">${rows}</div>`;
}

function renderCategories(selectedId) {
  categoryOptions.innerHTML = categories.map((category, index) => `<label title="${escapeHtml(category.name)}"><input type="radio" name="category" value="${escapeHtml(category.id)}" ${(selectedId ? category.id === selectedId : index === 0) ? 'checked' : ''}><span><i class="dot" style="background:${category.color}"></i>${escapeHtml(category.name)}</span></label>`).join('');
}

function openAddDialog(date = dateKey(new Date()), time = '16:00') {
  editingId = null;
  form.reset();
  renderCategories();
  dateInput.value = date;
  timeInput.value = time;
  reminderInput.value = '';
  newCategoryForm.classList.add('hidden');
  deleteButton.classList.add('hidden');
  document.querySelector('#dialogTitle').textContent = 'Add to your month';
  dialog.showModal();
  requestAnimationFrame(() => titleInput.focus());
}

function openEditDialog(event) {
  editingId = event.id;
  titleInput.value = event.title;
  dateInput.value = event.date;
  timeInput.value = event.time;
  repeatInput.checked = false;
  reminderInput.value = event.reminder ?? '';
  renderCategories(event.category);
  newCategoryForm.classList.add('hidden');
  deleteButton.classList.remove('hidden');
  document.querySelector('#dialogTitle').textContent = 'Edit this event';
  dialog.showModal();
  requestAnimationFrame(() => titleInput.focus());
}

function closeDialog() { dialog.close(); }

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

calendarCard.addEventListener('click', event => {
  if (sharedMode) return;
  const eventChip = event.target.closest('[data-event-id]');
  if (eventChip) {
    event.stopPropagation();
    const savedEvent = events.find(item => item.id === eventChip.dataset.eventId);
    if (savedEvent) openEditDialog(savedEvent);
    return;
  }
  const target = event.target.closest('[data-date]');
  if (target) openAddDialog(target.dataset.date, target.dataset.time || '16:00');
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const baseEvent = { id: editingId || crypto.randomUUID(), title: data.get('title').trim(), date: data.get('date'), time: data.get('time'), category: data.get('category') || categories[0].id, reminder: data.get('reminder') };
  if (!baseEvent.title) return;
  if (editingId) {
    events = events.map(item => item.id === editingId ? baseEvent : item);
    showToast('Event updated');
  } else {
    events.push(baseEvent);
    if (repeatInput.checked) {
      const current = parseLocalDate(baseEvent.date);
      const targetMonth = current.getMonth();
      current.setDate(current.getDate() + 7);
      while (current.getMonth() === targetMonth) {
        events.push({ ...baseEvent, id: crypto.randomUUID(), date: dateKey(current) });
        current.setDate(current.getDate() + 7);
      }
      showToast('Weekly events added');
    } else showToast(baseEvent.reminder !== '' ? 'Event and reminder added' : 'Event added');
  }
  saveAll(); closeDialog(); selectedDate = parseLocalDate(baseEvent.date); selectedHour = Number(baseEvent.time.slice(0, 2)); renderCalendar(); checkReminders();
});

deleteButton.addEventListener('click', () => { events = events.filter(item => item.id !== editingId); saveAll(); closeDialog(); renderCalendar(); showToast('Event deleted'); });

document.querySelector('#showCategoryForm').addEventListener('click', () => {
  newCategoryForm.classList.toggle('hidden');
  if (!newCategoryForm.classList.contains('hidden')) document.querySelector('#newCategoryName').focus();
});

document.querySelector('#saveCategory').addEventListener('click', () => {
  const input = document.querySelector('#newCategoryName');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'}-${Date.now().toString(36)}`;
  categories.push({ id, name, color: document.querySelector('#newCategoryColor').value });
  saveAll(); renderCategories(id); input.value = ''; newCategoryForm.classList.add('hidden'); showToast(`${name} category added`);
});

document.querySelectorAll('[data-quick-title]').forEach(button => button.addEventListener('click', () => {
  openAddDialog(dateKey(selectedDate), `${String(selectedHour).padStart(2, '0')}:00`);
  titleInput.value = button.dataset.quickTitle;
  const category = document.querySelector(`input[name="category"][value="${button.dataset.quickCategory}"]`);
  if (category) category.checked = true;
}));

function renderShareCategories() {
  shareCategoryOptions.innerHTML = categories.map(category => `<label><input class="share-category" type="checkbox" value="${escapeHtml(category.id)}" checked><span><i class="dot" style="background:${category.color}"></i>${escapeHtml(category.name)}</span></label>`).join('');
}

function scopedEventsFor(view) {
  const target = dateKey(selectedDate);
  if (view === 'month') return events.filter(event => {
    const date = parseLocalDate(event.date);
    return date.getFullYear() === selectedDate.getFullYear() && date.getMonth() === selectedDate.getMonth();
  });
  if (view === 'week') {
    const start = startOfWeek(selectedDate);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return events.filter(event => event.date >= dateKey(start) && event.date <= dateKey(end));
  }
  if (view === 'hour') return events.filter(event => event.date === target && Number(event.time.slice(0, 2)) === selectedHour);
  return events.filter(event => event.date === target);
}

function encodeSharePayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeSharePayload(value) {
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}

function openShareDialog() {
  shareForm.reset();
  shareViewInput.value = currentView;
  renderShareCategories();
  shareLinkArea.classList.add('hidden');
  shareUrlInput.value = '';
  shareDialog.showModal();
}

function closeShareDialog() { shareDialog.close(); }

shareForm.addEventListener('submit', event => {
  event.preventDefault();
  const includedIds = [...shareCategoryOptions.querySelectorAll('.share-category:checked')].map(input => input.value);
  if (!includedIds.length) { showToast('Choose at least one category'); return; }
  const view = shareViewInput.value;
  const hideNames = document.querySelector('#hideEventNames').checked;
  const hideTimes = document.querySelector('#hideEventTimes').checked;
  const hidePanel = document.querySelector('#hideDashboard').checked;
  const sharedEvents = scopedEventsFor(view).filter(event => includedIds.includes(event.category)).map((event, index) => ({
    id: `shared-${index}`,
    title: hideNames ? 'Busy' : event.title,
    date: event.date,
    time: hideTimes ? '12:00' : event.time,
    category: event.category,
    reminder: ''
  }));
  const sharedCategories = categories.filter(category => includedIds.includes(category.id));
  const payload = { v: 1, view, date: dateKey(selectedDate), hour: hideTimes ? 12 : selectedHour, settings: { hideNames, hideTimes, hidePanel }, categories: sharedCategories, events: sharedEvents };
  const baseUrl = window.location.href.split('#')[0];
  shareUrlInput.value = `${baseUrl}#share=${encodeSharePayload(payload)}`;
  shareLinkArea.classList.remove('hidden');
  shareUrlInput.select();
});

document.querySelector('#shareButton').addEventListener('click', openShareDialog);
document.querySelector('#closeShareDialog').addEventListener('click', closeShareDialog);
document.querySelector('#cancelShareDialog').addEventListener('click', closeShareDialog);
shareDialog.addEventListener('click', event => { if (event.target === shareDialog) closeShareDialog(); });
document.querySelector('#copyShareLink').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareUrlInput.value);
    showToast('Share link copied');
  } catch {
    shareUrlInput.select();
    document.execCommand('copy');
    showToast('Share link copied');
  }
});

function applySharedViewFromUrl() {
  if (!window.location.hash.startsWith('#share=')) return;
  const payload = decodeSharePayload(window.location.hash.slice(7));
  if (!payload || payload.v !== 1 || !Array.isArray(payload.events) || !Array.isArray(payload.categories)) return;
  const safeCategories = payload.categories.slice(0, 30).map((category, index) => ({
    id: String(category.id || `category-${index}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `category-${index}`,
    name: String(category.name || 'Category').slice(0, 24),
    color: /^#[0-9a-fA-F]{6}$/.test(category.color) ? category.color : '#7569e8'
  }));
  if (!safeCategories.length) safeCategories.push(defaultCategories[0]);
  const categoryIds = safeCategories.map(category => category.id);
  const safeEvents = payload.events.slice(0, 300).filter(event => /^\d{4}-\d{2}-\d{2}$/.test(event.date) && /^\d{2}:\d{2}$/.test(event.time)).map((event, index) => ({
    id: `shared-${index}`,
    title: String(event.title || 'Busy').slice(0, 60),
    date: event.date,
    time: event.time,
    category: categoryIds.includes(event.category) ? event.category : categoryIds[0],
    reminder: ''
  }));
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(payload.date) ? parseLocalDate(payload.date) : new Date();
  const safeViews = ['month', 'week', 'day', 'hour'];
  sharedMode = true;
  events = safeEvents;
  categories = safeCategories;
  selectedDate = safeDate;
  selectedHour = Number.isInteger(payload.hour) && payload.hour >= 0 && payload.hour <= 23 ? payload.hour : 12;
  currentView = safeViews.includes(payload.view) ? payload.view : 'month';
  shareSettings = { hideNames: Boolean(payload.settings?.hideNames), hideTimes: Boolean(payload.settings?.hideTimes), hidePanel: Boolean(payload.settings?.hidePanel) };
  document.body.classList.add('shared-mode');
  document.body.classList.toggle('hide-shared-panel', shareSettings.hidePanel);
  document.querySelector('#sharedViewBanner').classList.remove('hidden');
  const hidden = [shareSettings.hideNames && 'names hidden', shareSettings.hideTimes && 'times hidden', shareSettings.hidePanel && 'dashboard hidden'].filter(Boolean);
  document.querySelector('#sharedViewDetails').textContent = `View-only calendar snapshot${hidden.length ? ` · ${hidden.join(' · ')}` : ''}`;
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { currentView = button.dataset.view; renderCalendar(); }));
document.querySelector('#previousMonth').addEventListener('click', () => navigate(-1));
document.querySelector('#nextMonth').addEventListener('click', () => navigate(1));

function navigate(direction) {
  if (currentView === 'month') {
    const currentDay = selectedDate.getDate();
    selectedDate.setDate(1);
    selectedDate.setMonth(selectedDate.getMonth() + direction);
    selectedDate.setDate(Math.min(currentDay, new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()));
  }
  if (currentView === 'week') selectedDate.setDate(selectedDate.getDate() + 7 * direction);
  if (currentView === 'day') selectedDate.setDate(selectedDate.getDate() + direction);
  if (currentView === 'hour') {
    selectedHour += direction;
    if (selectedHour > 23) { selectedHour = 0; selectedDate.setDate(selectedDate.getDate() + 1); }
    if (selectedHour < 0) { selectedHour = 23; selectedDate.setDate(selectedDate.getDate() - 1); }
  }
  renderCalendar();
}

document.querySelector('#todayButton').addEventListener('click', () => { selectedDate = new Date(); selectedHour = selectedDate.getHours(); renderCalendar(); });
document.querySelector('#addEventButton').addEventListener('click', () => openAddDialog(dateKey(selectedDate), `${String(selectedHour).padStart(2, '0')}:00`));
document.querySelector('#closeDialog').addEventListener('click', closeDialog);
document.querySelector('#cancelDialog').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
window.addEventListener('resize', () => { clearTimeout(window.calendarResize); window.calendarResize = setTimeout(renderCalendar, 100); });

function updateAlertButton() {
  if (!('Notification' in window)) { alertButton.textContent = 'In-app alerts'; return; }
  const enabled = Notification.permission === 'granted';
  alertButton.classList.toggle('enabled', enabled);
  alertButton.innerHTML = enabled ? '<span aria-hidden="true">✓</span> Alerts on' : '<span aria-hidden="true">♢</span> Turn on alerts';
}

alertButton.addEventListener('click', async () => {
  if (!('Notification' in window)) { showToast('In-app reminders are already on'); return; }
  if (Notification.permission === 'denied') { showToast('Allow notifications in your browser settings'); return; }
  const permission = await Notification.requestPermission();
  updateAlertButton();
  showToast(permission === 'granted' ? 'Browser alerts are on' : 'In-app reminders are still on');
});

function checkReminders() {
  if (sharedMode) return;
  const now = new Date();
  const candidates = events.filter(event => event.reminder !== undefined && event.reminder !== '').sort((a, b) => eventDateTime(a) - eventDateTime(b));
  for (const event of candidates) {
    const start = eventDateTime(event);
    const remindAt = new Date(start.getTime() - Number(event.reminder) * 60000);
    const notificationId = `${event.id}-${event.date}-${event.time}-${event.reminder}`;
    if (now >= remindAt && now <= new Date(start.getTime() + 5 * 60000) && !notified.includes(notificationId)) {
      notified.push(notificationId);
      notified = notified.slice(-250);
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));
      const message = `${event.title} · ${formatTime(event.time)}`;
      document.querySelector('#reminderText').textContent = message;
      reminderBanner.classList.remove('hidden');
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Monthful reminder', { body: message });
      break;
    }
  }
}

document.querySelector('#dismissReminder').addEventListener('click', () => reminderBanner.classList.add('hidden'));

applySharedViewFromUrl();
renderCategories();
renderCalendar();
updateAlertButton();
checkReminders();
setInterval(checkReminders, 30000);

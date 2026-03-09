// ============================================================
// breakdown.js
// Handles all logic for the cost breakdown page.
// Meetings are rendered as Bootstrap accordion items.
// People rows are clickable to include/exclude from cost.
// ============================================================

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});


// -------------------------------------------------------
// Undo — single-level undo for delete actions
// -------------------------------------------------------
let _undoSnapshot = null;
let _undoTimer = null;
let _undoLabel = "";

function saveUndoSnapshot(label) {
  _undoLabel = label;
  _undoSnapshot = localStorage.getItem("meetingsData");
}

function showUndoToast(label) {
  let toast = document.getElementById("undo-toast");
  if (!toast) return;
  document.getElementById("undo-toast-msg").textContent = `"${label}" removed.`;
  toast.classList.add("undo-toast-visible");
  if (_undoTimer) clearTimeout(_undoTimer);
  _undoTimer = setTimeout(dismissUndoToast, 5000);
}

function dismissUndoToast() {
  const toast = document.getElementById("undo-toast");
  if (toast) toast.classList.remove("undo-toast-visible");
  _undoSnapshot = null;
  _undoLabel = "";
}

function undoDelete() {
  if (!_undoSnapshot) return;
  localStorage.setItem("meetingsData", _undoSnapshot);
  dismissUndoToast();
  renderMeetings();
}

// -------------------------------------------------------
// Templates — common meeting presets
// -------------------------------------------------------
const TEMPLATES = [
  { label: "1:1",            durationMins: 30,  isRecurring: true,  timesPerMonth: 4,  totalOccurrences: 1, notes: "Regular one-on-one check-in." },
  { label: "Team Standup",   durationMins: 15,  isRecurring: true,  timesPerMonth: 20, totalOccurrences: 1, notes: "Daily standup to align on priorities." },
  { label: "Sprint Planning",durationMins: 120, isRecurring: true,  timesPerMonth: 2,  totalOccurrences: 1, notes: "Sprint planning at the start of each sprint." },
  { label: "All-Hands",      durationMins: 60,  isRecurring: true,  timesPerMonth: 1,  totalOccurrences: 1, notes: "Company-wide all-hands meeting." },
  { label: "Retrospective",  durationMins: 60,  isRecurring: true,  timesPerMonth: 2,  totalOccurrences: 1, notes: "Sprint retrospective to reflect and improve." },
  { label: "Interview",      durationMins: 60,  isRecurring: false, timesPerMonth: 1,  totalOccurrences: 1, notes: "Candidate interview." },
  { label: "Kickoff",        durationMins: 90,  isRecurring: false, timesPerMonth: 1,  totalOccurrences: 1, notes: "Project kickoff meeting." },
  { label: "Brainstorm",     durationMins: 60,  isRecurring: false, timesPerMonth: 1,  totalOccurrences: 1, notes: "Creative brainstorming session." },
];

function openTemplateModal() {
  const list = document.getElementById("template-list");
  if (!list) return;
  list.innerHTML = TEMPLATES.map((t, i) => `
    <div class="template-row" onclick="applyTemplate(${i})">
      <div class="template-row-info">
        <span class="template-row-name">${t.label}</span>
        <span class="template-row-meta">${t.durationMins} min · ${t.isRecurring ? `Recurring ${t.timesPerMonth}×/mo` : "One-time"}</span>
      </div>
      <span class="template-row-arrow">→</span>
    </div>
  `).join("");
  new bootstrap.Modal(document.getElementById("templateModal")).show();
}

function applyTemplate(idx) {
  const t = TEMPLATES[idx];
  document.getElementById("meeting-label").value = t.label;
  document.getElementById("meeting-duration").value = t.durationMins;
  document.getElementById("meeting-notes").value = t.notes;

  if (t.isRecurring) {
    document.getElementById("recurring-yes").checked = true;
    document.getElementById("recurring-fields").style.display = "block";
    document.getElementById("one-time-fields").style.display = "none";
    document.getElementById("times-per-month").value = t.timesPerMonth;
  } else {
    document.getElementById("recurring-no").checked = true;
    document.getElementById("recurring-fields").style.display = "none";
    document.getElementById("one-time-fields").style.display = "block";
    document.getElementById("total-occurrences").value = t.totalOccurrences;
  }

  bootstrap.Modal.getInstance(document.getElementById("templateModal")).hide();
}


// -------------------------------------------------------
// encodeData / decodeData
// Base64 encodes data before writing to localStorage so
// salary figures are not stored as plain readable JSON.
// -------------------------------------------------------
function encodeData(data) {
  return btoa(JSON.stringify(data));
}

function decodeData(raw) {
  try {
    return JSON.parse(atob(raw));
  } catch {
    return null;
  }
}

// -------------------------------------------------------
// Data helpers
// -------------------------------------------------------

function getMeetings() {
  const saved = localStorage.getItem("meetingsData");
  return saved ? (decodeData(saved) || []) : [];
}

function saveMeetings(meetings) {
  localStorage.setItem("meetingsData", encodeData(meetings));
}

function getPeople() {
  const saved = localStorage.getItem("salaryFormData");
  return saved ? (decodeData(saved) || []) : [];
}

// -------------------------------------------------------
// toggleRecurring()
// Shows/hides the times-per-month field.
// -------------------------------------------------------
function toggleRecurring() {
  const isRecurring = document.getElementById("recurring-yes").checked;
  document.getElementById("recurring-fields").style.display = isRecurring ? "block" : "none";
  document.getElementById("one-time-fields").style.display = isRecurring ? "none" : "block";
}

// -------------------------------------------------------
// addMeeting()
// Validates the form, saves the new meeting, resets the
// form fields, and re-renders.
// -------------------------------------------------------
function addMeeting() {
  const label = document.getElementById("meeting-label").value.trim();
  const durationMins = Number(
    document.getElementById("meeting-duration").value,
  );

  if (!durationMins || durationMins < 1) {
    alert("Please enter a valid meeting duration.");
    return;
  }

  const isRecurring = document.getElementById("recurring-yes").checked;
  let timesPerMonth = 1;
  let totalOccurrences = 1;

  if (isRecurring) {
    timesPerMonth = Number(document.getElementById("times-per-month").value);
    if (!timesPerMonth || timesPerMonth < 1) {
      alert("Please enter how many times per month the meeting recurs.");
      return;
    }
  } else {
    totalOccurrences = Math.max(1, Number(document.getElementById("total-occurrences").value) || 1);
  }

  const meetings = getMeetings();
  meetings.push({
    id: Date.now(),
    label: label || `Meeting ${meetings.length + 1}`,
    durationMins,
    isRecurring,
    timesPerMonth,
    totalOccurrences,
    excludedNames: [],
    attendedCounts: {},
    notes: document.getElementById("meeting-notes").value.trim(),
  });
  saveMeetings(meetings);

  // Reset form
  document.getElementById("meeting-label").value = "";
  document.getElementById("meeting-duration").value = "";
  document.getElementById("recurring-no").checked = true;
  document.getElementById("recurring-fields").style.display = "none";
  document.getElementById("times-per-month").value = "";
  document.getElementById("total-occurrences").value = "1";
  document.getElementById("meeting-notes").value = "";

  renderMeetings();
}

// -------------------------------------------------------
// removeMeeting(id, event)
// Removes a meeting. event.stopPropagation() prevents the
// remove button click from also toggling the accordion.
// -------------------------------------------------------
function removeMeeting(id, event) {
  event.stopPropagation();
  const meetings = getMeetings();
  const target = meetings.find(m => m.id === id);
  if (!target) return;
  saveUndoSnapshot(target.label);
  saveMeetings(meetings.filter((m) => m.id !== id));
  renderMeetings();
  showUndoToast(target.label);
}


// -------------------------------------------------------
// duplicateMeeting(id, event)
// Creates a copy of a meeting with a " (Copy)" suffix.
// -------------------------------------------------------
function duplicateMeeting(id, event) {
  event.stopPropagation();
  const meetings = getMeetings();
  const original = meetings.find((m) => m.id === id);
  if (!original) return;

  const copy = Object.assign({}, original, {
    id: Date.now(),
    label: original.label + " (Copy)",
    excludedNames: [...original.excludedNames],
    attendedCounts: Object.assign({}, original.attendedCounts),
  });

  meetings.push(copy);
  saveMeetings(meetings);
  renderMeetings();
}

// -------------------------------------------------------
// togglePerson(meetingId, personName, event)
// Toggles a person's exclusion from a meeting's cost.
// event.stopPropagation() ensures the row click doesn't
// bubble up and accidentally trigger the accordion header.
// -------------------------------------------------------
function togglePerson(meetingId, personName, event) {
  if (event) event.stopPropagation();

  const meetings = getMeetings();
  const meeting = meetings.find((m) => m.id === meetingId);
  if (!meeting) return;

  const idx = meeting.excludedNames.indexOf(personName);
  if (idx === -1) {
    meeting.excludedNames.push(personName); // exclude
  } else {
    meeting.excludedNames.splice(idx, 1); // re-include
  }

  saveMeetings(meetings);

  // Replace only this card so the rest of the accordion is undisturbed
  renderSingleMeeting(meeting, getPeople());
}


// -------------------------------------------------------
// updateAttended(meetingId, personName, value, event)
// Updates how many meetings a person attended this year.
// Clamps to [0, timesPerMonth * 12]. Stops propagation so
// the input click doesn't toggle the person row.
// -------------------------------------------------------
function updateAttended(meetingId, personName, value, event) {
  if (event) event.stopPropagation();
  const meetings = getMeetings();
  const meeting = meetings.find((m) => m.id === meetingId);
  if (!meeting) return;

  const max = meeting.isRecurring ? meeting.timesPerMonth * 12 : (meeting.totalOccurrences || 1);
  let count = parseInt(value, 10);
  if (isNaN(count) || count < 0) count = 0;
  if (count > max) count = max;

  if (!meeting.attendedCounts) meeting.attendedCounts = {};
  meeting.attendedCounts[personName] = count;

  saveMeetings(meetings);
  renderSingleMeeting(meeting, getPeople());
}

// -------------------------------------------------------
// calculateBreakdown(meeting, people)
// Returns per-person breakdowns and the included-only total.
//
// Formula (user-defined):
//   salMinute    = salary / 106000
//   personResult = durationMins * salMinute
//   if recurring: personResult *= timesPerMonth * 12
// -------------------------------------------------------
function calculateBreakdown(meeting, people) {
  var totalResult = 0;
  var message = "Cost";
  const excluded = meeting.excludedNames || [];
  const attendedCounts = meeting.attendedCounts || {};
  const maxMeetings = meeting.isRecurring
    ? meeting.timesPerMonth * 12
    : (meeting.totalOccurrences || 1);
  const isMultiSession = maxMeetings > 1;
  const breakdowns = [];

  if (meeting.isRecurring) {
    message = "Total Cost per year";
  } else if (maxMeetings > 1) {
    message = `Total Cost (${maxMeetings} sessions)`;
  }

  for (let i = 0; i < people.length; i++) {
    const isExcluded = excluded.includes(people[i].name);
    const salType = people[i].salaryType || 'annual';
    var salMinute = salType === 'hourly'
      ? people[i].salary / 60
      : people[i].salary / 106000;
    var personResult = meeting.durationMins * salMinute;

    if (isMultiSession) {
      const attended = attendedCounts[people[i].name] !== undefined
        ? attendedCounts[people[i].name]
        : maxMeetings;
      personResult = personResult * attended;
    }

    if (!isExcluded) totalResult += personResult;

    const attended = isMultiSession
      ? (attendedCounts[people[i].name] !== undefined ? attendedCounts[people[i].name] : maxMeetings)
      : null;

    breakdowns.push({
      name: people[i].name,
      salary: people[i].salary,
      salaryType: people[i].salaryType || 'annual',
      cost: personResult,
      isExcluded,
      attended,
    });
  }

  return { breakdowns, totalResult, message };
}

// -------------------------------------------------------
// buildAccordionItem(meeting, people, isOpen)
// Builds and returns one Bootstrap accordion item element
// for the given meeting.
// -------------------------------------------------------
function buildAccordionItem(meeting, people, isOpen) {
  const { breakdowns, totalResult, message } = calculateBreakdown(
    meeting,
    people,
  );
  const excluded = meeting.excludedNames || [];

  const collapseId = `collapse-meeting-${meeting.id}`;
  const headingId = `heading-meeting-${meeting.id}`;

  const tableHtml =
    people.length === 0
      ? `<p class="description text-muted mt-2">
         No people added. <a href="index.html">Add people</a> to see costs.
       </p>`
      : `<p class="person-toggle-hint">Click a person row to include or exclude them from this meeting.</p>
       <table class="table table-borderless mb-0">
         <thead>
           <tr>
             <th class="subheader">Name</th>
             <th class="subheader">Salary</th>
             ${(meeting.isRecurring || (meeting.totalOccurrences || 1) > 1) ? '<th class="subheader attended-col">Attended</th>' : ""}
             <th class="subheader">${message}</th>
           </tr>
         </thead>
         <tbody>
           ${breakdowns
             .map(
               (b) => `
             <tr class="person-row ${b.isExcluded ? "person-excluded" : "person-included"}"
                 onclick="togglePerson(${meeting.id}, '${b.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}', event)"
                 onkeydown="if(event.key==='Enter'||event.key===' '){togglePerson(${meeting.id}, '${b.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}', event)}"
                 tabindex="0"
                 title="${b.isExcluded ? "Click to include in cost" : "Click to exclude from cost"}">
               <td class="description">
                 <span class="person-toggle-indicator">${b.isExcluded ? "✕" : "✓"}</span>
                 ${b.name}
               </td>
               <td class="description">$${b.salary.toLocaleString()}${b.salaryType === 'hourly' ? '<span class="salary-rate-suffix">/hr</span>' : ''}</td>
               ${(meeting.isRecurring || (meeting.totalOccurrences || 1) > 1) ? `
               <td class="description attended-col" onclick="event.stopPropagation()">
                 <input type="number"
                   class="attended-input"
                   value="${b.attended}"
                   min="0"
                   max="${meeting.isRecurring ? meeting.timesPerMonth * 12 : (meeting.totalOccurrences || 1)}"
                   onchange="updateAttended(${meeting.id}, '${b.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}', this.value, event)"
                   onclick="event.stopPropagation()"
                   title="Meetings attended out of ${meeting.timesPerMonth * 12} total" />
                 <span class="attended-max">/${meeting.isRecurring ? meeting.timesPerMonth * 12 : (meeting.totalOccurrences || 1)}</span>
               </td>` : ""}
               <td class="description">${usdFormatter.format(b.cost)}</td>
             </tr>`,
             )
             .join("")}
         </tbody>
       </table>
       <hr />
       <p class="meeting-total mb-0">${message}: ${usdFormatter.format(totalResult)}</p>
       ${
         excluded.length > 0
           ? `<p class="excluded-note">${excluded.length} person${excluded.length > 1 ? "s" : ""} excluded from this total.</p>`
           : ""
       }`;

  const item = document.createElement("div");
  item.className = "accordion-item meeting-accordion-item";
  item.id = `meeting-${meeting.id}`;

  item.innerHTML = `
    <h2 class="accordion-header meeting-accordion-header" id="${headingId}">
      <button class="accordion-button meeting-accordion-btn ${isOpen ? "" : "collapsed"}"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#${collapseId}"
        aria-expanded="${isOpen ? "true" : "false"}"
        aria-controls="${collapseId}">
        <span class="meeting-accordion-label">
          <span class="meeting-accordion-title">
            ${meeting.label}
            ${meeting.isRecurring ? '<span class="meeting-recurring-badge">Recurring</span>' : ""}
            ${people.length > 0 ? `<span class="meeting-accordion-total">${usdFormatter.format(totalResult)}</span>` : ""}
          </span>
          <span class="meeting-accordion-detail">
            ${meeting.durationMins} min${meeting.isRecurring ? ` &middot; Recurring &middot; ${meeting.timesPerMonth}&times;/month` : (meeting.totalOccurrences > 1 ? ` &middot; ${meeting.totalOccurrences} sessions` : " &middot; One-time")}
          </span>
        </span>
      </button>
      <!-- Action buttons are siblings of the toggle button, not children,
           so clicks on them never reach the accordion toggle. -->
      <span class="meeting-accordion-actions">
        <span class="btn btn-sm btn-outline-secondary meeting-edit-btn"
          onclick="openEditMeeting(${meeting.id}, event)">Edit</span>
        <span class="btn btn-sm btn-outline-secondary meeting-dup-btn"
          onclick="duplicateMeeting(${meeting.id}, event)">Duplicate</span>
        <span class="meeting-accordion-remove btn btn-sm btn-outline-danger"
          onclick="removeMeeting(${meeting.id}, event)">Remove</span>
      </span>
    </h2>
    <div id="${collapseId}"
      class="accordion-collapse collapse ${isOpen ? "show" : ""}"
      aria-labelledby="${headingId}">
      <div class="accordion-body">
        ${meeting.notes ? `<p class="meeting-notes-text">${meeting.notes}</p>` : ""}
        ${tableHtml}
      </div>
    </div>
  `;

  return item;
}

// -------------------------------------------------------
// renderSingleMeeting(meeting, people)
// Replaces just one accordion item without rebuilding all.
// Preserves the open/closed state of the item being replaced.
// -------------------------------------------------------
function renderSingleMeeting(meeting, people) {
  const existing = document.getElementById(`meeting-${meeting.id}`);
  if (!existing) return;

  // Check whether this item is currently open before replacing it
  const collapseEl = document.getElementById(`collapse-meeting-${meeting.id}`);
  const isOpen = collapseEl ? collapseEl.classList.contains("show") : true;

  const newItem = buildAccordionItem(meeting, people, isOpen);
  existing.replaceWith(newItem);

  // Recalculate the grand total since this meeting's cost may have changed
  renderTotalCost(getMeetings(), people);
}

// -------------------------------------------------------
// renderTotalCost(meetings, people)
// Calculates the grand total across all meetings and shows
// or hides the total cost banner depending on meeting count.
// -------------------------------------------------------
function renderTotalCost(meetings, people) {
  const banner = document.getElementById("total-cost-banner");
  const valueEl = document.getElementById("total-cost-value");
  if (!banner || !valueEl) return;

  // Only show when there is more than one meeting
  if (meetings.length <= 1) {
    banner.style.display = "none";
    return;
  }

  // Sum up each meeting's total (excluded people already omitted inside calculateBreakdown)
  const grandTotal = meetings.reduce((sum, meeting) => {
    const { totalResult } = calculateBreakdown(meeting, people);
    return sum + totalResult;
  }, 0);

  valueEl.textContent = usdFormatter.format(grandTotal);
  banner.style.display = "flex";
}

// -------------------------------------------------------
// renderMeetings()
// Clears and rebuilds the full meetings accordion.
// -------------------------------------------------------
function renderMeetings() {
  const meetings = getMeetings();
  const people = getPeople();
  const container = document.getElementById("meetings-container");
  const emptyState = document.getElementById("empty-state");

  renderTotalCost(meetings, people);

  if (meetings.length === 0) {
    container.innerHTML = "";
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";
  container.innerHTML = "";

  meetings.forEach((meeting) => {
    const item = buildAccordionItem(meeting, people, false);
    container.appendChild(item);
  });
}

// -------------------------------------------------------
// renderPeopleSummary()
// Rebuilds the attendees list in the left panel.
// -------------------------------------------------------
function renderPeopleSummary() {
  const people = getPeople();
  const list = document.getElementById("people-summary-list");
  if (!list) return;

  if (people.length === 0) {
    list.innerHTML = '<li class="description small">No people added yet.</li>';
    return;
  }

  list.innerHTML = people
    .map(
      (p) => `
    <li class="people-summary-item d-flex justify-content-between">
      <span class="description small">${p.name}</span>
      <span class="description small">$${p.salary.toLocaleString()}${p.salaryType === 'hourly' ? '<span class="salary-rate-suffix">/hr</span>' : ''}</span>
    </li>
  `,
    )
    .join("");
}


// -------------------------------------------------------
// openEditMeeting(id, event)
// Populates the edit modal with the meeting's current data
// and opens it.
// -------------------------------------------------------
function openEditMeeting(id, event) {
  if (event) event.stopPropagation();
  const meetings = getMeetings();
  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) return;

  document.getElementById("edit-meeting-id").value = meeting.id;
  document.getElementById("edit-meeting-label").value = meeting.label;
  document.getElementById("edit-meeting-duration").value = meeting.durationMins;
  document.getElementById("edit-meeting-notes").value = meeting.notes || "";

  if (meeting.isRecurring) {
    document.getElementById("edit-recurring-yes").checked = true;
    document.getElementById("edit-recurring-fields").style.display = "block";
    document.getElementById("edit-one-time-fields").style.display = "none";
    document.getElementById("edit-times-per-month").value = meeting.timesPerMonth;
  } else {
    document.getElementById("edit-recurring-no").checked = true;
    document.getElementById("edit-recurring-fields").style.display = "none";
    document.getElementById("edit-one-time-fields").style.display = "block";
    document.getElementById("edit-total-occurrences").value = meeting.totalOccurrences || 1;
  }

  const modal = new bootstrap.Modal(document.getElementById("editMeetingModal"));
  modal.show();
}

// -------------------------------------------------------
// toggleEditRecurring()
// Shows/hides the times-per-month field inside the edit modal.
// -------------------------------------------------------
function toggleEditRecurring() {
  const isRecurring = document.getElementById("edit-recurring-yes").checked;
  document.getElementById("edit-recurring-fields").style.display = isRecurring ? "block" : "none";
  document.getElementById("edit-one-time-fields").style.display = isRecurring ? "none" : "block";
}

// -------------------------------------------------------
// saveEditMeeting()
// Validates the edit form, updates the meeting in storage,
// closes the modal, and re-renders.
// -------------------------------------------------------
function saveEditMeeting() {
  const id = Number(document.getElementById("edit-meeting-id").value);
  const label = document.getElementById("edit-meeting-label").value.trim();
  const durationMins = Number(document.getElementById("edit-meeting-duration").value);
  const isRecurring = document.getElementById("edit-recurring-yes").checked;
  const notes = document.getElementById("edit-meeting-notes").value.trim();

  if (!durationMins || durationMins < 1) {
    alert("Please enter a valid meeting duration.");
    return;
  }

  let timesPerMonth = 1;
  let totalOccurrences = 1;
  if (isRecurring) {
    timesPerMonth = Number(document.getElementById("edit-times-per-month").value);
    if (!timesPerMonth || timesPerMonth < 1) {
      alert("Please enter how many times per month the meeting recurs.");
      return;
    }
  } else {
    totalOccurrences = Math.max(1, Number(document.getElementById("edit-total-occurrences").value) || 1);
  }

  const meetings = getMeetings();
  const idx = meetings.findIndex((m) => m.id === id);
  if (idx === -1) return;

  const prev = meetings[idx];
  const prevMax = prev.isRecurring ? prev.timesPerMonth * 12 : (prev.totalOccurrences || 1);
  const newMax  = isRecurring ? timesPerMonth * 12 : totalOccurrences;
  const resetAttended = prevMax !== newMax;

  meetings[idx] = Object.assign({}, prev, {
    label: label || prev.label,
    durationMins,
    isRecurring,
    timesPerMonth,
    totalOccurrences,
    notes,
    attendedCounts: resetAttended ? {} : (prev.attendedCounts || {}),
  });

  saveMeetings(meetings);
  bootstrap.Modal.getInstance(document.getElementById("editMeetingModal")).hide();
  renderSingleMeeting(meetings[idx], getPeople());
}

// -------------------------------------------------------
// exportCSV()
// Downloads a CSV file summarising all meetings and their
// per-person cost breakdowns.
// -------------------------------------------------------
function exportCSV() {
  const meetings = getMeetings();
  const people = getPeople();

  if (meetings.length === 0) {
    alert("No meetings to export.");
    return;
  }

  const rows = [["Meeting", "Type", "Duration (min)", "Times/Month", "Notes", "Total Cost", "Period"]];

  meetings.forEach(m => {
    const { totalResult, message } = calculateBreakdown(m, people);
    rows.push([
      m.label,
      m.isRecurring ? "Recurring" : "One-time",
      m.durationMins,
      m.isRecurring ? m.timesPerMonth : "",
      m.notes || "",
      totalResult.toFixed(2),
      message,
    ]);
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meeting-costs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------
// Storage event — re-render when people change in another tab
// -------------------------------------------------------
window.addEventListener("storage", function (e) {
  if (e.key === "salaryFormData") {
    renderPeopleSummary();
    renderMeetings();
  }
});

// -------------------------------------------------------
// Page load
// -------------------------------------------------------
(function () {
  renderPeopleSummary();
  renderMeetings();
})();

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
  return saved ? decodeData(saved) || [] : [];
}

function saveMeetings(meetings) {
  localStorage.setItem("meetingsData", encodeData(meetings));
}

function getPeople() {
  const saved = localStorage.getItem("salaryFormData");
  return saved ? decodeData(saved) || [] : [];
}

// -------------------------------------------------------
// toggleRecurring()
// Shows/hides the times-per-month field.
// -------------------------------------------------------
function toggleRecurring() {
  const isRecurring = document.getElementById("recurring-yes").checked;
  document.getElementById("recurring-fields").style.display = isRecurring
    ? "block"
    : "none";
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

  if (isRecurring) {
    timesPerMonth = Number(document.getElementById("times-per-month").value);
    if (!timesPerMonth || timesPerMonth < 1) {
      alert("Please enter how many times per month the meeting recurs.");
      return;
    }
  }

  const meetings = getMeetings();
  meetings.push({
    id: Date.now(),
    label: label || `Meeting ${meetings.length + 1}`,
    durationMins,
    isRecurring,
    timesPerMonth,
    excludedNames: [], // names of people excluded from this meeting's cost
    attendedCounts: {}, // per-person override of meetings attended (recurring only)
  });
  saveMeetings(meetings);

  // Reset form
  document.getElementById("meeting-label").value = "";
  document.getElementById("meeting-duration").value = "";
  document.getElementById("recurring-no").checked = true;
  document.getElementById("recurring-fields").style.display = "none";
  document.getElementById("times-per-month").value = "";

  renderMeetings();
}

// -------------------------------------------------------
// removeMeeting(id, event)
// Removes a meeting. event.stopPropagation() prevents the
// remove button click from also toggling the accordion.
// -------------------------------------------------------
function removeMeeting(id, event) {
  event.stopPropagation();
  if (!confirm("Are you sure you want to delete this meeting?")) return;
  saveMeetings(getMeetings().filter((m) => m.id !== id));
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

  const max = meeting.timesPerMonth * 12;
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
  const maxMeetings = meeting.isRecurring ? meeting.timesPerMonth * 12 : 1;
  const breakdowns = []; // Stores { name, salary, cost, isExcluded, attended } for each person

  for (let i = 0; i < people.length; i++) {
    const isExcluded = excluded.includes(people[i].name);
    var salMinute = people[i].salary / 106000;
    var personResult = meeting.durationMins * salMinute;

    if (meeting.isRecurring) {
      const attended =
        attendedCounts[people[i].name] !== undefined
          ? attendedCounts[people[i].name]
          : maxMeetings;
      personResult = personResult * attended;
      message = "Total Cost per year";
    }

    if (!isExcluded) totalResult += personResult;

    const attended = meeting.isRecurring
      ? attendedCounts[people[i].name] !== undefined
        ? attendedCounts[people[i].name]
        : maxMeetings
      : null;

    breakdowns.push({
      name: people[i].name,
      salary: people[i].salary,
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
             ${meeting.isRecurring ? '<th class="subheader attended-col">Attended</th>' : ""}
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
               <td class="description">$${b.salary.toLocaleString()}</td>
               ${
                 meeting.isRecurring
                   ? `
               <td class="description attended-col" onclick="event.stopPropagation()">
                 <input type="number"
                   class="attended-input"
                   value="${b.attended}"
                   min="0"
                   max="${meeting.timesPerMonth * 12}"
                   onchange="updateAttended(${meeting.id}, '${b.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}', this.value, event)"
                   onclick="event.stopPropagation()"
                   title="Meetings attended out of ${meeting.timesPerMonth * 12} total" />
                 <span class="attended-max">/${meeting.timesPerMonth * 12}</span>
               </td>`
                   : ""
               }
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
    <h2 class="accordion-header" id="${headingId}">
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
            ${meeting.durationMins} min${meeting.isRecurring ? ` &middot; Recurring &middot; ${meeting.timesPerMonth}&times;/month &middot; ${meeting.timesPerMonth * 12} total meetings` : " &middot; One-time"}
          </span>
        </span>
        <!-- Remove button sits inside the header but stops propagation -->
        <span class="meeting-accordion-remove btn btn-sm btn-outline-danger"
          onclick="removeMeeting(${meeting.id}, event)">Remove</span>
      </button>
    </h2>
    <div id="${collapseId}"
      class="accordion-collapse collapse ${isOpen ? "show" : ""}"
      aria-labelledby="${headingId}">
      <div class="accordion-body">
        
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
      <span class="description small">$${p.salary.toLocaleString()}</span>
    </li>
  `,
    )
    .join("");
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

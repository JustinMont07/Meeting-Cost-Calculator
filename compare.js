// ============================================================
// compare.js
// Comparison mode — lets users explore what-if scenarios
// for any saved meeting without modifying the original.
// ============================================================

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// -------------------------------------------------------
// Data helpers (mirrors breakdown.js, read-only)
// -------------------------------------------------------
function decodeData(raw) {
  try { return JSON.parse(atob(raw)); } catch { return null; }
}

function getMeetings() {
  const saved = localStorage.getItem("meetingsData");
  return saved ? (decodeData(saved) || []) : [];
}

function getPeople() {
  const saved = localStorage.getItem("salaryFormData");
  return saved ? (decodeData(saved) || []) : [];
}

// -------------------------------------------------------
// calculateCost(meeting, people, excludedNames)
// Pure function — no side effects, no localStorage writes.
// Returns { totalResult, message, breakdowns }
// -------------------------------------------------------
function calculateCost(meeting, people, excludedNames) {
  const excluded = excludedNames || meeting.excludedNames || [];
  const attendedCounts = meeting.attendedCounts || {};
  const maxMeetings = meeting.isRecurring
    ? meeting.timesPerMonth * 12
    : (meeting.totalOccurrences || 1);
  const isMultiSession = maxMeetings > 1;
  let totalResult = 0;
  let message = meeting.isRecurring
    ? "Total Cost per year"
    : maxMeetings > 1 ? `Total Cost (${maxMeetings} sessions)` : "Cost";
  const breakdowns = [];

  for (let i = 0; i < people.length; i++) {
    const isExcluded = excluded.includes(people[i].name);
    const salType = people[i].salaryType || "annual";
    const salMinute = salType === "hourly"
      ? people[i].salary / 60
      : people[i].salary / 106000;
    let personResult = meeting.durationMins * salMinute;

    if (isMultiSession) {
      const attended = attendedCounts[people[i].name] !== undefined
        ? attendedCounts[people[i].name]
        : maxMeetings;
      personResult *= attended;
    }

    if (!isExcluded) totalResult += personResult;
    breakdowns.push({ name: people[i].name, salary: people[i].salary, salaryType: salType, cost: personResult, isExcluded });
  }

  return { totalResult, message, breakdowns };
}

// -------------------------------------------------------
// State
// -------------------------------------------------------
let selectedMeeting = null;
let allPeople = [];
let scenarioExcluded = [];

// -------------------------------------------------------
// renderMeetingList()
// Shows all meetings as selectable cards.
// -------------------------------------------------------
function renderMeetingList() {
  const meetings = getMeetings();
  const people = getPeople();
  const grid = document.getElementById("compare-meeting-cards");
  const empty = document.getElementById("compare-empty");

  if (meetings.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "flex";
    return;
  }

  empty.style.display = "none";
  grid.innerHTML = meetings.map(m => {
    const { totalResult, message } = calculateCost(m, people, m.excludedNames || []);
    const badge = m.isRecurring
      ? `<span class="cmp-card-badge cmp-badge-recurring">Recurring · ${m.timesPerMonth}×/mo</span>`
      : (m.totalOccurrences || 1) > 1
        ? `<span class="cmp-card-badge cmp-badge-fixed">Fixed · ${m.totalOccurrences} sessions</span>`
        : `<span class="cmp-card-badge cmp-badge-onetime">One-time</span>`;

    return `
      <div class="cmp-meeting-card card" onclick="openComparison(${m.id})">
        <div class="card-body">
          <div class="cmp-card-top">
            <span class="cmp-card-name subheader">${m.label}</span>
            ${badge}
          </div>
          <div class="cmp-card-detail description">${m.durationMins} min · ${people.length - (m.excludedNames || []).length} attendee${(people.length - (m.excludedNames || []).length) !== 1 ? "s" : ""}</div>
          <div class="cmp-card-cost">${usdFormatter.format(totalResult)}</div>
          <div class="cmp-card-period description">${message}</div>
          ${m.notes ? `<div class="cmp-card-notes" onclick="event.stopPropagation(); this.classList.toggle('expanded')" title="Click to expand">${m.notes}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

// -------------------------------------------------------
// openComparison(meetingId)
// Switches to the comparison view for the chosen meeting.
// -------------------------------------------------------
function openComparison(meetingId) {
  const meetings = getMeetings();
  selectedMeeting = meetings.find(m => m.id === meetingId);
  if (!selectedMeeting) return;

  allPeople = getPeople();

  // Deep-copy so selectedMeeting is a stable snapshot — mutations to
  // scenarioExcluded must never bleed back into the original reference.
  selectedMeeting = JSON.parse(JSON.stringify(selectedMeeting));

  // Reset scenario to match original
  scenarioExcluded = [...(selectedMeeting.excludedNames || [])];

  // Populate controls
  document.getElementById("compare-meeting-name").textContent = selectedMeeting.label;
  document.getElementById("cmp-duration").value = selectedMeeting.durationMins;

  if (selectedMeeting.isRecurring) {
    document.getElementById("cmp-recurring-yes").checked = true;
    document.getElementById("cmp-recurring-fields").style.display = "block";
    document.getElementById("cmp-one-time-fields").style.display = "none";
    document.getElementById("cmp-times-per-month").value = selectedMeeting.timesPerMonth;
  } else {
    document.getElementById("cmp-recurring-no").checked = true;
    document.getElementById("cmp-recurring-fields").style.display = "none";
    document.getElementById("cmp-one-time-fields").style.display = "block";
    document.getElementById("cmp-total-occurrences").value = selectedMeeting.totalOccurrences || 1;
  }

  renderAttendeesControl();
  runComparison();

  document.getElementById("compare-list-view").style.display = "none";
  document.getElementById("compare-detail-view").style.display = "flex";
  window.scrollTo(0, 0);
}

// -------------------------------------------------------
// closeComparison()
// Returns to the meeting list.
// -------------------------------------------------------
function closeComparison() {
  selectedMeeting = null;
  document.getElementById("compare-detail-view").style.display = "none";
  document.getElementById("compare-list-view").style.display = "flex";
  renderMeetingList();
}

// -------------------------------------------------------
// renderAttendeesControl()
// Renders the attendee toggle checkboxes in the controls col.
// -------------------------------------------------------
function renderAttendeesControl() {
  const list = document.getElementById("cmp-attendees-list");
  if (allPeople.length === 0) {
    list.innerHTML = `<p class="description" style="font-style:italic;font-size:0.85rem;">No attendees found.</p>`;
    return;
  }

  list.innerHTML = allPeople.map(p => {
    const isExcluded = scenarioExcluded.includes(p.name);
    const suffix = p.salaryType === "hourly" ? "/hr" : "/yr";
    return `
      <div class="cmp-attendee-row ${isExcluded ? "cmp-attendee-excluded" : ""}"
           onclick="toggleScenarioAttendee('${p.name.replace(/'/g, "\\'")}')">
        <span class="cmp-attendee-indicator">${isExcluded ? "✕" : "✓"}</span>
        <span class="cmp-attendee-name">${p.name}</span>
        <span class="cmp-attendee-salary">$${Number(p.salary).toLocaleString()}${suffix}</span>
      </div>
    `;
  }).join("");
}

// -------------------------------------------------------
// toggleScenarioAttendee(name)
// Includes/excludes a person from the scenario only.
// -------------------------------------------------------
function toggleScenarioAttendee(name) {
  const idx = scenarioExcluded.indexOf(name);
  if (idx === -1) {
    scenarioExcluded.push(name);
  } else {
    scenarioExcluded.splice(idx, 1);
  }
  renderAttendeesControl();
  runComparison();
}

// -------------------------------------------------------
// toggleCmpRecurring()
// Shows/hides times-per-month field and re-runs comparison.
// -------------------------------------------------------
function toggleCmpRecurring() {
  const isRecurring = document.getElementById("cmp-recurring-yes").checked;
  document.getElementById("cmp-recurring-fields").style.display = isRecurring ? "block" : "none";
  document.getElementById("cmp-one-time-fields").style.display = isRecurring ? "none" : "block";
  runComparison();
}

// -------------------------------------------------------
// buildScenarioMeeting()
// Assembles a temporary meeting object from the controls.
// Does NOT modify localStorage.
// -------------------------------------------------------
function buildScenarioMeeting() {
  const rawDuration = Number(document.getElementById("cmp-duration").value);
  const durationMins = rawDuration > 0 ? rawDuration : selectedMeeting.durationMins;
  const isRecurring = document.getElementById("cmp-recurring-yes").checked;

  const rawTimes = Number(document.getElementById("cmp-times-per-month").value);
  const timesPerMonth = isRecurring
    ? (rawTimes > 0 ? rawTimes : selectedMeeting.timesPerMonth)
    : 1;

  const rawOccurrences = Number(document.getElementById("cmp-total-occurrences").value);
  const totalOccurrences = isRecurring
    ? 1
    : (rawOccurrences > 0 ? rawOccurrences : (selectedMeeting.totalOccurrences || 1));

  // Reset attendedCounts if the total occurrence count changes
  const origMax = selectedMeeting.isRecurring
    ? selectedMeeting.timesPerMonth * 12
    : (selectedMeeting.totalOccurrences || 1);
  const newMax = isRecurring ? timesPerMonth * 12 : totalOccurrences;
  const attendedCounts = origMax !== newMax ? {} : (selectedMeeting.attendedCounts || {});

  return {
    ...selectedMeeting,
    durationMins,
    isRecurring,
    timesPerMonth,
    totalOccurrences,
    excludedNames: scenarioExcluded,
    attendedCounts,
  };
}

// -------------------------------------------------------
// renderCostPanel(costEl, tableEl, metaEl, meeting, people, excluded)
// Fills one side of the comparison.
// -------------------------------------------------------
function renderCostPanel(costEl, tableEl, metaEl, meeting, people, excluded) {
  const { totalResult, message, breakdowns } = calculateCost(meeting, people, excluded);

  // Meta line
  const recurrenceStr = meeting.isRecurring
    ? `Recurring · ${meeting.timesPerMonth}×/month`
    : "One-time";
  metaEl.innerHTML = `<span class="cmp-meta-pill">${meeting.durationMins} min</span><span class="cmp-meta-pill">${recurrenceStr}</span>`;

  // Big cost number
  costEl.innerHTML = `
    <div class="cmp-cost-number">${usdFormatter.format(totalResult)}</div>
    <div class="cmp-cost-label">${message}</div>
  `;

  // Breakdown table
  if (people.length === 0) {
    tableEl.innerHTML = `<p class="description" style="font-style:italic;font-size:0.85rem;text-align:center;">No attendees.</p>`;
    return;
  }

  tableEl.innerHTML = `
    <table class="table table-sm cmp-table">
      <thead>
        <tr>
          <th class="subheader">Name</th>
          <th class="subheader">Cost</th>
        </tr>
      </thead>
      <tbody>
        ${breakdowns.map(b => `
          <tr class="${b.isExcluded ? "cmp-row-excluded" : ""}">
            <td class="description">
              ${b.isExcluded ? '<span class="cmp-excluded-badge">excluded</span>' : ""}
              ${b.name}
            </td>
            <td class="description">${b.isExcluded ? "—" : usdFormatter.format(b.cost)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------
// runComparison()
// Calculates both sides and updates the savings banner.
// -------------------------------------------------------
function runComparison() {
  if (!selectedMeeting) return;

  // Original side — always uses the saved meeting's excluded list
  renderCostPanel(
    document.getElementById("original-cost"),
    document.getElementById("original-table"),
    document.getElementById("original-meta"),
    selectedMeeting,
    allPeople,
    selectedMeeting.excludedNames || []
  );

  // Scenario side
  const scenario = buildScenarioMeeting();
  renderCostPanel(
    document.getElementById("scenario-cost"),
    document.getElementById("scenario-table"),
    document.getElementById("scenario-meta"),
    scenario,
    allPeople,
    scenarioExcluded
  );

  // Savings banner — show if cost OR settings differ from original
  const origResult = calculateCost(selectedMeeting, allPeople, selectedMeeting.excludedNames || []).totalResult;
  const scenResult = calculateCost(scenario, allPeople, scenarioExcluded).totalResult;
  const diff = origResult - scenResult;
  const banner = document.getElementById("compare-savings-banner");
  const bannerText = document.getElementById("compare-savings-text");

  const settingsChanged =
    scenario.durationMins !== selectedMeeting.durationMins ||
    scenario.isRecurring !== selectedMeeting.isRecurring ||
    scenario.timesPerMonth !== selectedMeeting.timesPerMonth ||
    (scenario.totalOccurrences || 1) !== (selectedMeeting.totalOccurrences || 1) ||
    JSON.stringify([...scenarioExcluded].sort()) !== JSON.stringify([...(selectedMeeting.excludedNames || [])].sort());

  const saveBtn = document.getElementById("save-scenario-btn");

  if (!settingsChanged && Math.abs(diff) < 0.01) {
    banner.style.display = "none";
  } else {
    banner.style.display = "flex";
    if (diff > 0) {
      banner.className = "compare-savings-banner compare-savings-positive";
      bannerText.innerHTML = `This scenario reduces the cost by <strong>${usdFormatter.format(diff)}</strong>`;
    } else if (diff < -0.01) {
      banner.className = "compare-savings-banner compare-savings-negative";
      bannerText.innerHTML = `This scenario increases the cost by <strong>${usdFormatter.format(Math.abs(diff))}</strong>`;
    } else {
      banner.className = "compare-savings-banner compare-savings-neutral";
      bannerText.innerHTML = `The cost remains the same, but the meeting details have changed`;
    }
    if (saveBtn) {
      saveBtn.textContent = "Apply to meeting";
      saveBtn.disabled = false;
    }
  }
}

// -------------------------------------------------------
// saveScenario()
// Writes the current scenario settings back to the saved
// meeting in localStorage, then gives visual confirmation.
// -------------------------------------------------------
function saveScenario() {
  if (!selectedMeeting) return;

  const scenario = buildScenarioMeeting();
  const meetings = getMeetings();
  const idx = meetings.findIndex(m => m.id === selectedMeeting.id);
  if (idx === -1) return;

  // Preserve fields that aren't part of the scenario controls
  const prevMax = meetings[idx].isRecurring
    ? meetings[idx].timesPerMonth * 12
    : (meetings[idx].totalOccurrences || 1);
  const newMax = scenario.isRecurring ? scenario.timesPerMonth * 12 : (scenario.totalOccurrences || 1);
  const resetAttended = prevMax !== newMax;

  meetings[idx] = Object.assign({}, meetings[idx], {
    durationMins: scenario.durationMins,
    isRecurring: scenario.isRecurring,
    timesPerMonth: scenario.timesPerMonth,
    totalOccurrences: scenario.totalOccurrences,
    excludedNames: [...scenarioExcluded],      // copy, not the live reference
    attendedCounts: resetAttended ? {} : (meetings[idx].attendedCounts || {}),
  });

  localStorage.setItem("meetingsData", btoa(JSON.stringify(meetings)));

  // Deep-copy into selectedMeeting so no field shares a reference with
  // the live scenario state — otherwise future mutations to scenarioExcluded
  // would silently mutate selectedMeeting.excludedNames too.
  selectedMeeting = JSON.parse(JSON.stringify(meetings[idx]));

  // Brief button feedback
  const btn = document.getElementById("save-scenario-btn");
  if (btn) {
    btn.textContent = "✓ Applied!";
    btn.disabled = true;
    setTimeout(() => runComparison(), 2000);
  }
}


(function () {
  renderMeetingList();
})();

// ============================================================
// dashboard.js
// Total cost dashboard — shows all meetings, lets you filter
// them out, renders a bar chart and summary stats.
// ============================================================

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function decodeData(raw) {
  try { return JSON.parse(atob(raw)); } catch { return null; }
}
function getMeetings() {
  const s = localStorage.getItem("meetingsData");
  return s ? (decodeData(s) || []) : [];
}
function getPeople() {
  const s = localStorage.getItem("salaryFormData");
  return s ? (decodeData(s) || []) : [];
}

// -------------------------------------------------------
// calculateCost — mirrors breakdown.js logic
// -------------------------------------------------------
function calculateCost(meeting, people) {
  const excluded = meeting.excludedNames || [];
  const attendedCounts = meeting.attendedCounts || {};
  const maxMeetings = meeting.isRecurring
    ? meeting.timesPerMonth * 12
    : (meeting.totalOccurrences || 1);
  const isMultiSession = maxMeetings > 1;
  let total = 0;

  for (const p of people) {
    if (excluded.includes(p.name)) continue;
    const salMinute = (p.salaryType === "hourly") ? p.salary / 60 : p.salary / 106000;
    let cost = meeting.durationMins * salMinute;
    if (isMultiSession) {
      const attended = attendedCounts[p.name] !== undefined ? attendedCounts[p.name] : maxMeetings;
      cost *= attended;
    }
    total += cost;
  }
  return total;
}

// -------------------------------------------------------
// State — which meetings are currently included
// -------------------------------------------------------
let excludedMeetingIds = new Set();

function toggleMeeting(id) {
  if (excludedMeetingIds.has(id)) {
    excludedMeetingIds.delete(id);
  } else {
    excludedMeetingIds.add(id);
  }
  render();
}

let allDeselected = false;
function toggleAllMeetings() {
  const meetings = getMeetings();
  // Only operate on meetings visible under current type/cost filters
  const visible = meetings.filter(m => passesFilters(m, calculateCost(m, getPeople())));
  const allVisibleExcluded = visible.every(m => excludedMeetingIds.has(m.id));
  if (allVisibleExcluded) {
    visible.forEach(m => excludedMeetingIds.delete(m.id));
  } else {
    visible.forEach(m => excludedMeetingIds.add(m.id));
  }
  render();
}

// -------------------------------------------------------
// Filter helpers
// -------------------------------------------------------
function getTypeFilters() {
  return {
    recurring: document.getElementById("filter-recurring")?.checked ?? true,
    fixed:     document.getElementById("filter-fixed")?.checked ?? true,
    onetime:   document.getElementById("filter-onetime")?.checked ?? true,
  };
}

function getMinCost() {
  const val = parseFloat(document.getElementById("filter-min-cost")?.value);
  return isNaN(val) ? 0 : val;
}

function meetingType(m) {
  if (m.isRecurring) return "recurring";
  if ((m.totalOccurrences || 1) > 1) return "fixed";
  return "onetime";
}

function passesFilters(meeting, cost) {
  const types = getTypeFilters();
  if (!types[meetingType(meeting)]) return false;
  if (cost < getMinCost()) return false;
  return true;
}

function selectAllTypes() {
  ["filter-recurring", "filter-fixed", "filter-onetime"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = true;
  });
  saveFilterPrefs();
  render();
}

function resetAllFilters() {
  ["filter-recurring", "filter-fixed", "filter-onetime"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = true;
  });
  const minCost = document.getElementById("filter-min-cost");
  if (minCost) minCost.value = "";
  excludedMeetingIds.clear();
  saveFilterPrefs();
  render();
}


// -------------------------------------------------------
function saveFilterPrefs() {
  const prefs = {
    recurring: document.getElementById("filter-recurring")?.checked ?? true,
    fixed:     document.getElementById("filter-fixed")?.checked ?? true,
    onetime:   document.getElementById("filter-onetime")?.checked ?? true,
    minCost:   document.getElementById("filter-min-cost")?.value ?? "",
  };
  localStorage.setItem("dashboardFilterPrefs", JSON.stringify(prefs));
}

function restoreFilterPrefs() {
  try {
    const raw = localStorage.getItem("dashboardFilterPrefs");
    if (!raw) return;
    const prefs = JSON.parse(raw);
    const recurring = document.getElementById("filter-recurring");
    const fixed     = document.getElementById("filter-fixed");
    const onetime   = document.getElementById("filter-onetime");
    const minCost   = document.getElementById("filter-min-cost");
    if (recurring) recurring.checked = prefs.recurring ?? true;
    if (fixed)     fixed.checked     = prefs.fixed     ?? true;
    if (onetime)   onetime.checked   = prefs.onetime   ?? true;
    if (minCost)   minCost.value     = prefs.minCost   ?? "";
  } catch {}
}

// -------------------------------------------------------
// render()
// -------------------------------------------------------
function render() {
  const meetings = getMeetings();
  const people = getPeople();
  const empty = document.getElementById("dashboard-empty");
  const toggleBtn = document.querySelector(".dashboard-toggle-all-btn");

  if (meetings.length === 0) {
    empty.style.display = "flex";
    document.getElementById("dashboard-stat-row").innerHTML = "";
    document.getElementById("dashboard-chart").innerHTML = "";
    document.getElementById("dashboard-table-body").innerHTML = "";
    document.getElementById("dashboard-filter-list").innerHTML = "";
    return;
  }
  empty.style.display = "none";

  // Build costs for all meetings
  const costs = meetings.map(m => ({ meeting: m, cost: calculateCost(m, people) }));

  // Apply type + min-cost filters to determine which meetings are visible in the list
  const visibleCosts = costs.filter(({ meeting, cost }) => passesFilters(meeting, cost));

  // Update toggle-all button label based on visible meetings
  const allVisibleExcluded = visibleCosts.length > 0 && visibleCosts.every(({ meeting }) => excludedMeetingIds.has(meeting.id));
  if (toggleBtn) toggleBtn.textContent = allVisibleExcluded ? "Select all" : "Deselect all";

  // Included = visible AND not manually excluded
  const includedCosts = visibleCosts.filter(({ meeting }) => !excludedMeetingIds.has(meeting.id));
  const grandTotal = includedCosts.reduce((s, c) => s + c.cost, 0);
  const maxCost = Math.max(...visibleCosts.map(c => c.cost), 1);

  // ---- Filter sidebar (meeting list) — only show meetings passing type/cost filters ----
  const filterList = document.getElementById("dashboard-filter-list");
  if (visibleCosts.length === 0) {
    filterList.innerHTML = `<div class="dashboard-filter-empty">No meetings match the current filters.</div>`;
  } else {
    filterList.innerHTML = visibleCosts.map(({ meeting, cost }) => {
      const isIncluded = !excludedMeetingIds.has(meeting.id);
      return `
        <div class="dashboard-filter-row ${isIncluded ? "" : "dashboard-filter-excluded"}"
             onclick="toggleMeeting(${meeting.id})">
          <span class="dashboard-filter-check">${isIncluded ? "✓" : "✕"}</span>
          <span class="dashboard-filter-name">${meeting.label}</span>
          <span class="dashboard-filter-cost">${usdFormatter.format(cost)}</span>
        </div>`;
    }).join("");
  }

  // ---- Stat cards ----
  const includedMeetings = includedCosts.map(c => c.meeting);
  const recurringCount = includedMeetings.filter(m => m.isRecurring).length;
  const avgCost = includedMeetings.length > 0 ? grandTotal / includedMeetings.length : 0;
  const mostExpensive = includedCosts.length > 0
    ? includedCosts.reduce((a, b) => a.cost > b.cost ? a : b)
    : null;

  document.getElementById("dashboard-stat-row").innerHTML = `
    <div class="dashboard-stat-card card">
      <div class="dashboard-stat-label">Total Annual Cost</div>
      <div class="dashboard-stat-value">${usdFormatter.format(grandTotal)}</div>
      <div class="dashboard-stat-sub">${includedMeetings.length} meeting${includedMeetings.length !== 1 ? "s" : ""} included</div>
    </div>
    <div class="dashboard-stat-card card">
      <div class="dashboard-stat-label">Average Cost / Meeting</div>
      <div class="dashboard-stat-value">${usdFormatter.format(avgCost)}</div>
      <div class="dashboard-stat-sub">${recurringCount} recurring</div>
    </div>
    <div class="dashboard-stat-card card">
      <div class="dashboard-stat-label">Most Expensive</div>
      <div class="dashboard-stat-value dashboard-stat-value-sm">${mostExpensive ? mostExpensive.meeting.label : "—"}</div>
      <div class="dashboard-stat-sub">${mostExpensive ? usdFormatter.format(mostExpensive.cost) : ""}</div>
    </div>
  `;

  // ---- Bar chart — only visible meetings ----
  const chartEl = document.getElementById("dashboard-chart");
  if (visibleCosts.length === 0) {
    chartEl.innerHTML = `<p class="description" style="font-style:italic;font-size:0.85rem;color:var(--text-muted)">No meetings to display.</p>`;
  } else {
    chartEl.innerHTML = visibleCosts.map(({ meeting, cost }) => {
      const isExcluded = excludedMeetingIds.has(meeting.id);
      const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0;
      return `
        <div class="dashboard-bar-row ${isExcluded ? "dashboard-bar-excluded" : ""}">
          <div class="dashboard-bar-label">${meeting.label}</div>
          <div class="dashboard-bar-track">
            <div class="dashboard-bar-fill" style="width:${pct.toFixed(1)}%"></div>
          </div>
          <div class="dashboard-bar-value">${usdFormatter.format(cost)}</div>
        </div>`;
    }).join("");
  }

  // ---- Meeting type badge helper ----
  function meetingTypeBadge(meeting) {
    if (meeting.isRecurring) {
      return '<span class="cmp-card-badge cmp-badge-recurring">Recurring</span>';
    }
    if ((meeting.totalOccurrences || 1) > 1) {
      return '<span class="cmp-card-badge cmp-badge-fixed">Fixed sessions</span>';
    }
    return '<span class="cmp-card-badge cmp-badge-onetime">One-time</span>';
  }

  // ---- Table — only visible meetings ----
  const tbody = document.getElementById("dashboard-table-body");
  if (visibleCosts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="description text-center" style="padding:1.5rem;font-style:italic;color:var(--text-muted)">No meetings match the current filters.</td></tr>`;
  } else {
    tbody.innerHTML = visibleCosts.map(({ meeting, cost }) => {
      const isExcluded = excludedMeetingIds.has(meeting.id);
      const pctOfTotal = grandTotal > 0 ? (cost / grandTotal * 100) : 0;
      const occurrences = meeting.isRecurring
        ? `${meeting.timesPerMonth}×/mo`
        : ((meeting.totalOccurrences || 1) > 1 ? `${meeting.totalOccurrences} sessions` : "1");
      return `
        <tr class="${isExcluded ? "dashboard-row-excluded" : ""}">
          <td class="description">${meeting.label}</td>
          <td class="description">${meetingTypeBadge(meeting)}</td>
          <td class="description">${meeting.durationMins} min</td>
          <td class="description">${occurrences}</td>
          <td class="description"><strong>${usdFormatter.format(cost)}</strong></td>
          <td class="description">${isExcluded ? "—" : pctOfTotal.toFixed(1) + "%"}</td>
        </tr>`;
    }).join("");
  }
}

// -------------------------------------------------------
// Page load
// -------------------------------------------------------
(function () {
  restoreFilterPrefs();
  render();
})();

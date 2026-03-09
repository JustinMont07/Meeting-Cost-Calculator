// ============================================================
// persons.js
// Handles all logic for the person entry form on index.html.
// ============================================================

// Tracks total rows ever created so IDs stay unique even
// after rows are removed.
let personCount = 0;

// -------------------------------------------------------
// addPerson(name, salary)
// Creates a new person card and appends it to the container.
// Accepts optional values to pre-fill from localStorage.
// -------------------------------------------------------
function addPerson(name = "", salary = "") {
  personCount++;
  const container = document.getElementById("people-container");

  const row = document.createElement("div");
  row.className = "card";
  row.id = `person-${personCount}`;

  row.innerHTML = `
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="subheader mb-0 person-label">Person ${personCount}</h5>
        <button class="btn btn-sm btn-outline-danger" onclick="removePerson(${personCount})">Remove</button>
      </div>
      <div class="row g-3">
        <div class="col-sm-6">
          <label class="form-label description">Name</label>
          <input type="text" class="form-control" id="name-${personCount}"
            placeholder="Full name" value="${name}" />
        </div>
        <div class="col-sm-6">
          <label class="form-label description">Salary ($)</label>
          <input type="text" class="form-control" id="salary-${personCount}"
            placeholder="$0"
            value="${salary ? "$" + Number(salary).toLocaleString("en-US") : ""}"
            data-raw-value="${salary || ""}"
            oninput="formatSalaryInput(this)" />
        </div>
      </div>
    </div>
  `;

  container.appendChild(row);
  updateLabels();
}

// -------------------------------------------------------
// removePerson(id)
// Removes the card with the given ID and re-numbers labels.
// -------------------------------------------------------
function removePerson(id) {
  if (!confirm("Are you sure you want to remove this person?")) return;
  const row = document.getElementById(`person-${id}`);
  if (row) row.remove();
  updateLabels();
}

// -------------------------------------------------------
// updateLabels()
// Re-numbers "Person N" headings after adds or removes.
// -------------------------------------------------------
function updateLabels() {
  document.querySelectorAll("#people-container .card").forEach((row, i) => {
    row.querySelector(".person-label").textContent = `Person ${i + 1}`;
  });
}

// -------------------------------------------------------
// submitForm()
// Validates all fields, saves to localStorage, then
// navigates to the breakdown page.
// -------------------------------------------------------
function submitForm() {
  const rows = document.querySelectorAll("#people-container .card");
  const people = [];
  let valid = true;

  rows.forEach((row) => {
    const id = row.id.split("-")[1];
    const name = document.getElementById(`name-${id}`).value.trim();
    // Read the raw numeric value stored by formatSalaryInput, not the formatted display string
    const salaryInput = document.getElementById(`salary-${id}`);
    const salary = salaryInput.dataset.rawValue;
    if (!name || !salary) {
      valid = false;
    } else {
      people.push({ name, salary: Number(salary) });
    }
  });

  if (!valid) {
    alert("Please fill in all name and salary fields.");
    return;
  }
  if (people.length === 0) {
    alert("Please add at least one person.");
    return;
  }

  // Save people and navigate to the breakdown page
  localStorage.setItem("salaryFormData", JSON.stringify(people));
  window.location.href = "breakdown.html";
}

// -------------------------------------------------------
// resetForm()
// Clears all people and meeting data after confirmation.
// -------------------------------------------------------
function resetForm() {
  if (!confirm("Are you sure? This will clear all people and meeting data."))
    return;
  document.getElementById("people-container").innerHTML = "";
  personCount = 0;
  localStorage.removeItem("salaryFormData");
  localStorage.removeItem("meetingsData");
  addPerson();
}

// -------------------------------------------------------
// formatSalaryInput(input)
// Fires on every keystroke in a salary field. Strips all
// non-numeric characters, stores the raw number on the
// data-raw-value attribute, then re-displays it formatted
// as a dollar amount (e.g. $75,000). Preserves the cursor
// position so typing feels natural.
// -------------------------------------------------------
function formatSalaryInput(input) {
  // Strip everything except digits
  const raw = input.value.replace(/[^0-9]/g, "");

  // Store the raw number for form submission
  input.dataset.rawValue = raw;

  // Format as $1,234,567 or leave empty if nothing entered
  if (raw === "") {
    input.value = "";
  } else {
    input.value = "$" + Number(raw).toLocaleString("en-US");
  }
}

// -------------------------------------------------------
// Page load: restore saved people or start with one blank row
// -------------------------------------------------------
(function () {
  const saved = localStorage.getItem("salaryFormData");
  if (saved) {
    JSON.parse(saved).forEach((p) => addPerson(p.name, p.salary));
  } else {
    addPerson();
  }
})();

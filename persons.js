// ============================================================
// persons.js
// Two-section design:
//   1. Compact list of added people (read view, edit/remove)
//   2. Single persistent "Add Person" form at the bottom
// ============================================================

// -------------------------------------------------------
// encodeData / decodeData
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
// In-memory people array — source of truth while on this page
// -------------------------------------------------------
let people = [];

// -------------------------------------------------------
// renderPeopleList()
// Rebuilds the compact list of added people.
// -------------------------------------------------------
function renderPeopleList() {
  const list = document.getElementById("people-list");
  const empty = document.getElementById("people-list-empty");

  if (people.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    const badge = document.getElementById("people-count-badge");
    if (badge) badge.textContent = "";
    return;
  }

  empty.style.display = "none";
  const badge = document.getElementById("people-count-badge");
  if (badge) badge.textContent = `${people.length} ${people.length === 1 ? "person" : "people"}`;

  list.innerHTML = people.map((p, i) => `
    <div class="person-list-row" id="person-row-${i}">
      <div class="person-list-info">
        <span class="person-list-name">${p.name}</span>
        <span class="person-list-salary">
          $${Number(p.salary).toLocaleString()}
          <span class="person-list-type">${p.salaryType === 'hourly' ? '/hr' : '/yr'}</span>
        </span>
      </div>
      <div class="person-list-actions">
        <button class="btn btn-sm btn-outline-secondary" onclick="editPerson(${i})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="removePerson(${i})">Remove</button>
      </div>
    </div>
  `).join("");
}

// -------------------------------------------------------
// addPersonFromForm()
// Reads the add form, validates, pushes to people array,
// saves, re-renders list, and resets the form.
// -------------------------------------------------------
function addPersonFromForm() {
  const nameEl   = document.getElementById("add-name");
  const salaryEl = document.getElementById("add-salary");
  const name     = nameEl.value.trim();
  const salary   = salaryEl.dataset.rawValue;
  const salaryType = document.querySelector('input[name="add-salaryType"]:checked').value;

  if (!name) { nameEl.focus(); nameEl.classList.add("is-invalid"); return; }
  if (!salary) { salaryEl.focus(); salaryEl.classList.add("is-invalid"); return; }

  people.push({ name, salary: Number(salary), salaryType });
  savePeople();
  renderPeopleList();

  // Reset form
  nameEl.value = "";
  nameEl.classList.remove("is-invalid");
  salaryEl.value = "";
  salaryEl.dataset.rawValue = "";
  salaryEl.classList.remove("is-invalid");
  document.getElementById("add-annual").checked = true;
  updateAddFormLabels("annual");
  nameEl.focus();
}

// -------------------------------------------------------
// removePerson(index)
// Removes a person by index with confirmation.
// -------------------------------------------------------
function removePerson(index) {
  if (!confirm(`Remove ${people[index].name}?`)) return;
  people.splice(index, 1);
  savePeople();
  renderPeopleList();
}

// -------------------------------------------------------
// editPerson(index)
// Opens the edit modal pre-filled with the person's data.
// -------------------------------------------------------
function editPerson(index) {
  const p = people[index];
  document.getElementById("edit-person-index").value = index;
  document.getElementById("edit-person-name").value = p.name;

  const salaryInput = document.getElementById("edit-person-salary");
  salaryInput.value = "$" + Number(p.salary).toLocaleString("en-US");
  salaryInput.dataset.rawValue = p.salary;

  const typeId = p.salaryType === "hourly" ? "edit-hourly" : "edit-annual";
  document.getElementById(typeId).checked = true;
  updateEditFormLabels(p.salaryType || "annual");

  document.getElementById("edit-person-name").classList.remove("is-invalid");
  salaryInput.classList.remove("is-invalid");

  new bootstrap.Modal(document.getElementById("editPersonModal")).show();
}

// -------------------------------------------------------
// saveEditPerson()
// Validates the edit modal form and updates the person.
// -------------------------------------------------------
function saveEditPerson() {
  const index     = Number(document.getElementById("edit-person-index").value);
  const nameEl    = document.getElementById("edit-person-name");
  const salaryEl  = document.getElementById("edit-person-salary");
  const name      = nameEl.value.trim();
  const salary    = salaryEl.dataset.rawValue;
  const salaryType = document.querySelector('input[name="edit-salaryType"]:checked').value;

  let valid = true;
  if (!name)   { nameEl.classList.add("is-invalid");   valid = false; }
  if (!salary) { salaryEl.classList.add("is-invalid"); valid = false; }
  if (!valid) return;

  people[index] = { name, salary: Number(salary), salaryType };
  savePeople();
  renderPeopleList();
  bootstrap.Modal.getInstance(document.getElementById("editPersonModal")).hide();
}

// -------------------------------------------------------
// updateAddFormLabels(type) / updateEditFormLabels(type)
// Update salary label and placeholder when type toggles.
// -------------------------------------------------------
function updateAddFormLabels(type) {
  document.getElementById("add-salary-label").textContent =
    type === "hourly" ? "Hourly Rate ($/hr)" : "Annual Salary ($)";
  document.getElementById("add-salary").placeholder =
    type === "hourly" ? "$0.00/hr" : "$0";
}

function updateEditFormLabels(type) {
  document.getElementById("edit-salary-label").textContent =
    type === "hourly" ? "Hourly Rate ($/hr)" : "Annual Salary ($)";
  document.getElementById("edit-person-salary").placeholder =
    type === "hourly" ? "$0.00/hr" : "$0";
}

// -------------------------------------------------------
// formatSalaryInput(input)
// -------------------------------------------------------
function formatSalaryInput(input) {
  const raw = input.value.replace(/[^0-9]/g, "");
  input.dataset.rawValue = raw;
  input.classList.remove("is-invalid");
  input.value = raw === "" ? "" : "$" + Number(raw).toLocaleString("en-US");
}

// -------------------------------------------------------
// savePeople()
// Persists the in-memory people array to localStorage.
// -------------------------------------------------------
function savePeople() {
  localStorage.setItem("salaryFormData", encodeData(people));
}

// -------------------------------------------------------
// submitForm()
// Validates at least one person exists then navigates.
// -------------------------------------------------------
function submitForm() {
  if (people.length === 0) {
    alert("Please add at least one person.");
    return;
  }
  savePeople();
  window.location.href = "breakdown.html";
}

// -------------------------------------------------------
// resetForm()
// -------------------------------------------------------
function resetForm() {
  if (!confirm("Are you sure? This will clear all people and meeting data.")) return;
  people = [];
  localStorage.removeItem("salaryFormData");
  localStorage.removeItem("meetingsData");
  renderPeopleList();
  document.getElementById("add-name").focus();
}

// -------------------------------------------------------
// Page load
// -------------------------------------------------------
(function () {
  const saved = localStorage.getItem("salaryFormData");
  if (saved) {
    people = decodeData(saved) || [];
  }
  renderPeopleList();
  document.getElementById("add-name").focus();
})();

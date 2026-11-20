const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"/>',
  stethoscope: '<path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M10 12v2a6 6 0 0 0 12 0v-2"/><circle cx="20" cy="10" r="2"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M9 7h1M14 7h1M9 11h1M14 11h1M11 3v3M8 3v3M14 3v3"/>',
  chart: '<path d="M3 3v18h18M8 15l4-4 4 3 5-7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  bed: '<path d="M3 18V5M3 15h18v6M21 18V9H3M7 15v-4h5a4 4 0 0 1 4 4M7 8h3v3H7z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>'
};

document.querySelectorAll("[data-icon]").forEach((element) => {
  const name = element.dataset.icon;
  if (icons[name]) element.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
});

const initialOverviewMarkup = document.getElementById("pageContent").innerHTML;
const state = { role: "admin", page: "overview", overview: null, appointments: [], patients: [], doctors: [], patientData: null, user: null, authMode: "admin" };
const avatarColors = ["#ead8cc", "#d9e3da", "#e7d9c7", "#d8dfdf", "#e8d5d0", "#d5ded2", "#e9dfc9"];
const appointmentStatuses = ["Pending", "Confirmed", "Checked in", "In progress", "Completed", "Cancelled"];

function updateFooterYear() {
  document.getElementById("authYear").textContent = new Date().getFullYear();
  document.querySelectorAll(".page-footer span:first-child").forEach((span) => {
    span.textContent = `© ${new Date().getFullYear()} KIRANSUNDAR Hospital`;
  });
}

document.addEventListener("error", (event) => {
  const image = event.target;
  if (image instanceof HTMLImageElement && image.dataset.fallback && image.src !== new URL(image.dataset.fallback, location.href).href) {
    image.src = image.dataset.fallback;
  }
}, true);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && state.user) showAuth("Your session has expired. Please sign in again.");
    throw new Error(result.error || "Something went wrong.");
  }
  return result;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.getElementById("toastRegion").append(toast);
  window.setTimeout(() => toast.remove(), 3300);
}

function addKiranMessage(message, sender) {
  const item = document.createElement("p");
  item.className = `kiran-message ${sender === "patient" ? "kiran-user" : "kiran-bot"}`;
  item.textContent = message;
  const messages = document.getElementById("kiranMessages");
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

function answerKiran(message) {
  const text = message.toLowerCase();
  if (/\b(chest pain|can't breathe|cannot breathe|difficulty breathing|shortness of breath|unconscious|severe bleeding|heart attack|stroke|suicid|nenju vali|moochu thinaral|mayakkam)\b/.test(text)) {
    return "This could be urgent. Please call your local emergency number or go to the nearest emergency department now. Don’t wait for a reply here.";
  }
  if (/\b(appointment|visit|book|schedule)\b/.test(text)) {
    return "You can book a visit using “Book a visit” on your dashboard. To review existing bookings, open Appointments.";
  }
  if (/\b(reminder|medicine|medication|tablet|dose)\b/.test(text)) {
    return "Open Medicine reminders to add, pause, or remove a reminder. Please follow the instructions from your clinician or pharmacist; I can’t recommend or change medicines.";
  }
  if (/\b(report|result|lab|test|health record|history|pdf)\b/.test(text)) {
    return "Open Health reports to track results, or Medical history to review your record and print/save it as a PDF.";
  }
  if (/\b(consult|doctor|specialist|video|online)\b/.test(text)) {
    return "Open Online consultation to request a virtual visit with a specialist. If symptoms are severe or rapidly worsening, seek urgent in-person care.";
  }
  if (/\b(pay|payment|bill|fee|receipt)\b/.test(text)) {
    return "Open Payments to view the demo checkout and payment history. Demo payments do not charge real money.";
  }
  if (/\b(hello|hi|hey|vanakkam)\b/.test(text)) {
    return "Vanakkam! I can help you find appointments, reminders, reports, consultations, and payments. What would you like to do?";
  }
  if (/\b(pain|fever|symptom|sick|ill|hurt|medicine|diagnos|treatment)\b/.test(text)) {
    return "I’m not able to assess symptoms, diagnose, or suggest treatment. Please contact your clinician for medical advice. If you feel seriously unwell or symptoms are worsening quickly, seek urgent care.";
  }
  return "I can help you navigate appointments, medicine reminders, medical history, health reports, online consultations, and payments. Tell me which one you need.";
}

function openKiranPage(action) {
  const pages = { appointments: "appointments", reminders: "reminders", consultation: "consultation", reports: "reports", history: "history", payments: "payments" };
  if (pages[action]) setPage(pages[action]);
  document.getElementById("kiranChat").hidden = true;
  document.getElementById("kiranLauncher").setAttribute("aria-expanded", "false");
}

function setPage(page) {
  state.page = page;
  document.querySelectorAll(".nav-link[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  document.getElementById("breadcrumbCurrent").textContent = page[0].toUpperCase() + page.slice(1);
  document.getElementById("sidebar").classList.remove("open");
  if (page === "overview" && state.role === "patient") renderPatientOverview();
  else if (page === "overview") renderOverview();
  else if (state.role === "patient") renderPatientSection(page);
  else renderSection(page);
}

function imageUrl(image, width = 90) {
  return `https://images.unsplash.com/${encodeURIComponent(image)}?auto=format&fit=crop&w=${width}&q=80`;
}

function statusClass(status) {
  return `status-${status.toLowerCase().replace(/\s+/g, "-")}`;
}

function statusSelect(appointment) {
  const options = appointmentStatuses.map((status) =>
    `<option value="${status}"${status === appointment.status ? " selected" : ""}>${status}</option>`
  ).join("");
  return `<select class="status-select" data-appointment-status="${escapeHtml(appointment.id)}" data-current-status="${escapeHtml(appointment.status)}" aria-label="Update ${escapeHtml(appointment.patient)} appointment status">${options}</select>`;
}

function appointmentRows(appointments) {
  if (!appointments.length) return '<tr><td colspan="5"><div class="empty-state">No appointments to show yet.</div></td></tr>';
  return appointments.map((item, index) => {
    const doctor = state.doctors.find((person) => person.id === item.doctorId);
    const patient = state.patients.find((person) => person.id === item.patientId);
    const patientInitials = initials(item.patient);
    return `<tr>
      <td><div class="person-cell"><span class="person-avatar" style="background:${avatarColors[index % avatarColors.length]}">${escapeHtml(patientInitials)}</span><span><span class="person-name">${escapeHtml(item.patient)}</span><span class="person-sub">${escapeHtml(patient?.condition || item.type)}</span></span></div></td>
      <td><span class="doctor-cell">${doctor ? `<img class="doctor-mini" src="${imageUrl(doctor.image, 50)}" data-fallback="/images/doctor-portrait.svg" alt="" />` : ""}<span>${escapeHtml(item.doctor)}</span></span></td>
      <td><span class="time-cell">${escapeHtml(item.time)}</span></td>
      <td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td>${statusSelect(item)}</td>
    </tr>`;
  }).join("");
}

function renderOverview() {
  if (!document.getElementById("patientStat")) {
    document.getElementById("pageContent").innerHTML = initialOverviewMarkup;
    bindOverviewControls();
  }
  const overview = state.overview;
  if (!overview) return;
  document.getElementById("patientStat").textContent = overview.patients.toLocaleString();
  document.getElementById("appointmentStat").textContent = String(overview.appointmentsToday).padStart(2, "0");
  document.getElementById("doctorStat").textContent = overview.doctors;
  const appointments = state.appointments.filter((item) => item.date === new Date().toISOString().slice(0, 10)).slice(0, 5);
  const appointmentCount = document.querySelector('.nav-link[data-page="appointments"] .nav-count');
  if (appointmentCount) appointmentCount.textContent = state.appointments.length;
  document.getElementById("appointmentRows").innerHTML = appointmentRows(appointments);
  bindAppointmentMenus();
  document.getElementById("appointmentFooter").textContent = `${appointments.length} appointments shown · Updated just now`;
  document.getElementById("departmentList").innerHTML = overview.departments.map((department) => `<div class="dept-row"><span>${escapeHtml(department.name)}</span><span class="progress-track"><span class="progress-fill" style="width:${department.percent}%;background:${department.color}"></span></span><b>${department.count}</b></div>`).join("");
  document.getElementById("doctorStrip").innerHTML = state.doctors.slice(0, 5).map((doctor) => `<div class="doctor-card"><img src="${imageUrl(doctor.image, 80)}" data-fallback="/images/doctor-portrait.svg" alt="${escapeHtml(doctor.name)}" /><span class="doctor-info"><strong>${escapeHtml(doctor.name)}</strong><span>${escapeHtml(doctor.specialty)}</span></span></div>`).join("");
  document.getElementById("doctorSelect").innerHTML = '<option value="">Select a specialist</option>' + state.doctors.map((doctor) => `<option value="${escapeHtml(doctor.id)}">${escapeHtml(doctor.name)} · ${escapeHtml(doctor.specialty)}</option>`).join("");
}

function renderSection(page) {
  const content = document.getElementById("pageContent");
  const titles = {
    appointments: ["Appointments", "A calm, clear view of every patient visit."],
    patients: ["Patients", "Thoughtful care starts with knowing your patients."],
    doctors: ["Our doctors", "Meet the people who make exceptional care possible."],
    departments: ["Departments", "Connected specialists, centered around you."],
    reports: ["Reports & insights", "A clear picture of care across your hospital."],
    settings: ["Settings", "Manage your workspace preferences."]
  };
  const [title, subtitle] = titles[page] || titles.overview;
  const mainContent = page === "appointments" ? renderAppointmentPage() : page === "patients" ? renderPatientsPage() : page === "doctors" ? renderDoctorsPage() : page === "departments" ? renderDepartmentsPage() : page === "reports" ? renderReportsPage() : renderSettingsPage();
  content.innerHTML = `<div class="page-heading"><div><div class="eyebrow"><span class="live-dot"></span> KIRANSUNDAR HOSPITAL</div><h1>${title}</h1><p>${subtitle}</p></div>${page === "appointments" ? '<div class="heading-actions"><button class="button button-primary" id="newAppointment"><span>＋</span> New appointment</button></div>' : ""}</div>${mainContent}<footer class="page-footer"><span>© ${new Date().getFullYear()} KIRANSUNDAR Hospital</span><span><i></i> All systems operational</span></footer>`;
  const newButton = document.getElementById("newAppointment");
  if (newButton) newButton.addEventListener("click", openModal);
  const search = document.getElementById("sectionSearch");
  if (search) search.addEventListener("input", () => filterSection(search.value));
  const pageFilter = document.getElementById("appointmentFilter");
  if (pageFilter) pageFilter.addEventListener("change", renderAppointmentPageContent);
  if (page === "appointments") renderAppointmentPageContent();
  else if (page === "patients" || page === "doctors") filterSection("");
  updateFooterYear();
  document.querySelectorAll("#pageContent [data-icon]").forEach((element) => {
    const name = element.dataset.icon;
    if (icons[name]) element.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
  });
}

function renderAppointmentPage() {
  return `<section class="panel view-panel"><h2>Appointment schedule</h2><p>Manage and follow up on scheduled visits.</p><div class="view-toolbar"><input id="sectionSearch" type="search" placeholder="Search patients or doctors..." /><select id="appointmentFilter"><option value="all">All appointments</option><option>Confirmed</option><option>Checked in</option><option>In progress</option><option>Pending</option><option>Completed</option><option>Cancelled</option></select></div><div class="table-wrap"><table><thead><tr><th>PATIENT</th><th>DOCTOR</th><th>SPECIALTY</th><th>DATE & TIME</th><th>STATUS</th><th></th></tr></thead><tbody id="sectionRows"></tbody></table></div></section>`;
}

function renderAppointmentPageContent() {
  const searchValue = document.getElementById("sectionSearch")?.value.toLowerCase() || "";
  const filter = document.getElementById("appointmentFilter")?.value || "all";
  const list = state.appointments.filter((appointment) => {
    const matchesText = `${appointment.patient} ${appointment.doctor} ${appointment.specialty}`.toLowerCase().includes(searchValue);
    return matchesText && (filter === "all" || appointment.status === filter);
  });
  document.getElementById("sectionRows").innerHTML = list.length ? list.map((item, index) => {
    const patient = state.patients.find((entry) => entry.id === item.patientId);
    const doctor = state.doctors.find((entry) => entry.id === item.doctorId);
    return `<tr><td><div class="person-cell"><span class="person-avatar" style="background:${avatarColors[index % avatarColors.length]}">${initials(escapeHtml(item.patient))}</span><span><span class="person-name">${escapeHtml(item.patient)}</span><span class="person-sub">${escapeHtml(patient?.email || item.type)}</span></span></div></td><td><span class="doctor-cell">${doctor ? `<img class="doctor-mini" src="${imageUrl(doctor.image, 50)}" data-fallback="/images/doctor-portrait.svg" alt="" />` : ""}${escapeHtml(item.doctor)}</span></td><td>${escapeHtml(item.specialty)}</td><td><span class="time-cell">${escapeHtml(item.date)} · ${escapeHtml(item.time)}</span></td><td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${statusSelect(item)}</td></tr>`;
  }).join("") : '<tr><td colspan="6"><div class="empty-state">No appointments match your search.</div></td></tr>';
  bindAppointmentMenus();
}

function renderPatientsPage() {
  return `<section class="panel view-panel"><h2>Patient directory</h2><p>${state.patients.length} patients in your care network.</p><div class="view-toolbar"><input id="sectionSearch" type="search" placeholder="Search by name, email or condition..." /><span class="person-sub">Patient records are stored securely in this demo.</span></div><div class="data-grid" id="sectionCards"></div></section>`;
}

function renderDoctorsPage() {
  return `<section class="panel view-panel"><h2>Care team</h2><p>${state.doctors.length} specialists bringing thoughtful care to every patient.</p><div class="view-toolbar"><input id="sectionSearch" type="search" placeholder="Search doctors or specialties..." /></div><div class="data-grid" id="sectionCards"></div></section>`;
}

function renderDepartmentsPage() {
  const departments = state.overview.departments;
  return `<div class="data-grid">${departments.map((department, index) => `<article class="data-card"><span class="stat-icon ${["mint", "blue", "peach", "green"][index]}"><span class="nav-icon" data-icon="${["stethoscope", "chart", "users", "bed"][index]}"></span></span><h3>${escapeHtml(department.name)}</h3><p>${["Heart & Vascular", "Neuroscience", "Children's Health", "Bone & Joint"][index]}</p><div class="card-detail">${department.count} patient visits this month<br>${department.percent}% department capacity</div></article>`).join("")}</div>`;
}

function renderReportsPage() {
  return `<section class="panel view-panel"><h2>Hospital performance</h2><p>A useful snapshot of care delivery across your hospital.</p><div class="portal-cards"><div class="portal-card"><span>Patient visits this month</span><strong>1,284</strong></div><div class="portal-card"><span>Appointment completion</span><strong>94.8%</strong></div><div class="portal-card"><span>Patient satisfaction</span><strong>4.9 / 5</strong></div></div><div class="department-chart"><div class="donut-chart"><div class="donut-inner"><strong>94.8%</strong><span>completed</span></div></div><div class="chart-legend"><span><i class="legend-dot dot-teal"></i>Completed <b>1,218</b></span><span><i class="legend-dot dot-sage"></i>Upcoming <b>52</b></span><span><i class="legend-dot dot-peach"></i>Cancelled <b>14</b></span></div></div><p class="card-detail">Your team is delivering consistently excellent care. Appointment completion is up 6.2% compared to last month.</p></section>`;
}

function renderSettingsPage() {
  return `<section class="panel view-panel"><h2>Workspace settings</h2><p>Personalize your experience and manage hospital preferences.</p><div class="portal-cards"><div class="portal-card"><span>Workspace</span><strong>KIRANSUNDAR Hospital</strong></div><div class="portal-card"><span>Time zone</span><strong>Local time</strong></div><div class="portal-card"><span>Notifications</span><strong>Enabled</strong></div></div></section>`;
}

function filterSection(searchValue) {
  const value = searchValue.toLowerCase();
  if (state.page === "appointments") return renderAppointmentPageContent();
  if (state.page === "patients") {
    const list = state.patients.filter((patient) => `${patient.name} ${patient.email} ${patient.condition}`.toLowerCase().includes(value));
    document.getElementById("sectionCards").innerHTML = list.map((patient, index) => `<article class="data-card"><span class="person-avatar" style="background:${avatarColors[index % avatarColors.length]}">${initials(escapeHtml(patient.name))}</span><h3>${escapeHtml(patient.name)}</h3><p>${escapeHtml(patient.condition)}</p><div class="card-detail">${escapeHtml(patient.email || "Email not provided")}<br>${escapeHtml(patient.phone || "Phone not provided")}<br>Blood type ${escapeHtml(patient.bloodType)} · Last visit ${escapeHtml(patient.lastVisit)}</div></article>`).join("") || '<div class="empty-state">No patients found.</div>';
  }
  if (state.page === "doctors") {
    const list = state.doctors.filter((doctor) => `${doctor.name} ${doctor.specialty} ${doctor.department}`.toLowerCase().includes(value));
    document.getElementById("sectionCards").innerHTML = list.map((doctor) => `<article class="data-card"><img class="person-avatar" src="${imageUrl(doctor.image, 100)}" data-fallback="/images/doctor-portrait.svg" alt="${escapeHtml(doctor.name)}" /><h3>${escapeHtml(doctor.name)}</h3><p>${escapeHtml(doctor.specialty)}</p><div class="card-detail">${escapeHtml(doctor.department)}<br><span class="status-online"><i></i> Available today</span></div></article>`).join("") || '<div class="empty-state">No doctors found.</div>';
  }
}

function renderPatientOverview() {
  const content = document.getElementById("pageContent");
  const upcoming = state.appointments.filter((item) => item.date >= new Date().toISOString().slice(0, 10) && item.status !== "Cancelled").slice(0, 3);
  const name = escapeHtml(state.user?.name || "there");
  content.innerHTML = `
    <div class="page-heading">
      <div>
        <div class="eyebrow"><span class="live-dot"></span> YOUR KIRANSUNDAR HEALTHSPACE</div>
        <h1>Welcome, ${name} <span class="wave">✳</span></h1>
        <p>Your health journey, thoughtfully taken care of.</p>
      </div>
      <div class="heading-actions"><button class="button button-primary" id="newAppointment"><span>＋</span> Book a visit</button></div>
    </div>
    <section class="patient-hero">
      <div>
        <div class="eyebrow"><span class="live-dot"></span> YOUR CARE, ALL IN ONE PLACE</div>
        <h2>A healthier you starts here.</h2>
        <p>Book visits, meet your care team and stay in the know.</p>
      </div>
      <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=85" data-fallback="/images/care-team.svg" alt="Doctor talking with a patient at KIRANSUNDAR Hospital" />
    </section>
    <div class="portal-cards">
      <div class="portal-card"><span>Upcoming visits</span><strong>${upcoming.length}</strong></div>
      <div class="portal-card"><span>Your care team</span><strong>${state.doctors.length} specialists</strong></div>
      <div class="portal-card"><span>Health records</span><strong>Up to date</strong></div>
    </div>
    <div class="patient-feature-grid">
      <button class="patient-feature-card" data-page="health"><strong>Health dashboard</strong><span>Vitals and wellness overview →</span></button>
      <button class="patient-feature-card" data-page="history"><strong>Medical history</strong><span>Download your records as PDF →</span></button>
      <button class="patient-feature-card" data-page="consultation"><strong>Online consultation</strong><span>Request a virtual visit →</span></button>
      <button class="patient-feature-card" data-page="reminders"><strong>Medicine reminders</strong><span>Stay on schedule →</span></button>
      <button class="patient-feature-card" data-page="reports"><strong>Health report tracking</strong><span>Track results over time →</span></button>
      <button class="patient-feature-card" data-page="payments"><strong>Online payment</strong><span>Pay and view receipts →</span></button>
    </div>
    <section class="panel view-panel patient-appointments">
      <div class="panel-header"><div><h2>Your upcoming appointments</h2><p>A little care goes a long way.</p></div></div>
      ${upcoming.length ? upcoming.map((item) => `<div class="patient-appointment"><div class="patient-date">${new Date(`${item.date}T12:00:00`).getDate()}<small>${new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US", { month: "short" })}</small></div><div><h3>${escapeHtml(item.specialty)} visit</h3><p>${escapeHtml(item.doctor)} · ${escapeHtml(item.time)}</p></div><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>`).join("") : '<div class="empty-state">No upcoming visits — book one whenever you need us.</div>'}
    </section>
    <section class="schemes-section" aria-labelledby="schemeHeading">
      <div class="schemes-heading">
        <span class="scheme-kicker">GOVERNMENT OF INDIA · HEALTH SUPPORT</span>
        <h2 id="schemeHeading">Explore public health programmes</h2>
        <p>Find official information about healthcare support and digital health services.</p>
      </div>
      <div class="scheme-grid">
        <article class="scheme-card pmjay-card">
          <span class="scheme-badge">AYUSHMAN BHARAT · PM-JAY</span>
          <h3>Hospital cover for eligible families</h3>
          <p>Eligible families may receive cashless secondary and tertiary hospital care up to ₹5 lakh per family per year at empanelled hospitals, subject to scheme rules.</p>
          <a href="https://pmjay.gov.in/" target="_blank" rel="noopener noreferrer">Check official PM-JAY information <span>↗</span></a>
        </article>
        <article class="scheme-card abha-card">
          <span class="scheme-badge">AYUSHMAN BHARAT DIGITAL MISSION</span>
          <h3>Explore your ABHA health account</h3>
          <p>ABHA is an optional digital health account. Learn how to manage and share health records digitally with your consent.</p>
          <a href="https://abdm.gov.in/" target="_blank" rel="noopener noreferrer">Visit the official ABDM website <span>↗</span></a>
        </article>
      </div>
      <p class="scheme-disclaimer">Eligibility, benefits and hospital participation vary. KIRANSUNDAR’s PM-JAY empanelment is not confirmed here. Verify your eligibility and the hospital list through official government channels before relying on coverage.</p>
    </section>
    <footer class="page-footer"><span>© ${new Date().getFullYear()} KIRANSUNDAR Hospital</span><span><i></i> Your information is private</span></footer>`;
  updateFooterYear();
  document.getElementById("newAppointment").addEventListener("click", openModal);
}

function patientDoctorOptions() {
  return state.doctors.map((doctor) => `<option value="${escapeHtml(doctor.id)}">${escapeHtml(doctor.name)} · ${escapeHtml(doctor.specialty)}</option>`).join("");
}

function renderPatientSection(page) {
  const data = state.patientData || {};
  const patient = data.patient || {};
  const titles = {
    appointments: ["Your appointments", "Review your visits or book another appointment."],
    health: ["Personal health dashboard", "A clear overview of your latest care information."],
    history: ["Medical history", "Review and download your personal care record."],
    consultation: ["Online consultation", "Request a private virtual visit with a specialist."],
    reminders: ["Medicine reminders", "Create reminders and keep your medication schedule visible."],
    reports: ["Health report tracking", "Record and monitor changes in your health results."],
    payments: ["Online payment", "View payments and make a demo payment securely."]
  };
  const [title, subtitle] = titles[page];
  let body = "";
  if (page === "appointments") {
    const appointments = (data.appointments || []).filter((item) => item.status !== "Cancelled").sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
    body = `<section class="panel advanced-panel"><div class="advanced-header"><div><h2>Your visits</h2><p>Appointment status and schedule</p></div><button class="button button-primary" id="patientBookVisit" type="button">Book a visit</button></div>${appointments.map((item) => `<div class="advanced-row"><div><h3>${escapeHtml(item.specialty)} · ${escapeHtml(item.doctor)}</h3><p>${escapeHtml(item.date)} at ${escapeHtml(item.time)}</p></div><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>`).join("") || '<div class="empty-state">No appointments yet. Book a visit whenever you need us.</div>'}</section>`;
  } else if (page === "health") {
    const reports = data.reports || [];
    body = `<div class="health-metrics"><div class="health-metric"><span>Blood type</span><strong>${escapeHtml(patient.bloodType || "—")}</strong></div><div class="health-metric"><span>Appointments</span><strong>${(data.appointments || []).length}</strong></div><div class="health-metric"><span>Health reports</span><strong>${reports.length}</strong></div><div class="health-metric"><span>Active reminders</span><strong>${(data.reminders || []).filter((item) => item.enabled).length}</strong></div></div>
      <section class="panel advanced-panel"><h2>Recent health activity</h2>${reports.length ? reports.slice(0, 5).map((item) => `<div class="advanced-row"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.reportType)} · ${escapeHtml(item.date)}</p></div><strong>${escapeHtml(item.value)}</strong></div>`).join("") : '<div class="empty-state">No health reports recorded yet.</div>'}</section>`;
  } else if (page === "history") {
    body = `<section class="panel advanced-panel"><div class="advanced-header"><div><h2>Patient record</h2><p>Appointments, care details, reports and payments</p></div><button class="button button-primary" id="downloadMedicalPdf">Download PDF</button></div>
      <div class="history-print" id="medicalHistory"><h2>${escapeHtml(patient.name || state.user?.name)}</h2><p>${escapeHtml(patient.email || state.user?.email)} · ${escapeHtml(patient.phone || "No phone recorded")}</p><h3>Profile</h3><p>Blood type: ${escapeHtml(patient.bloodType || "—")}<br>Current condition: ${escapeHtml(patient.condition || "Not recorded")}</p><h3>Appointments</h3>${(data.appointments || []).map((item) => `<p>${escapeHtml(item.date)} ${escapeHtml(item.time)} — ${escapeHtml(item.specialty)} with ${escapeHtml(item.doctor)} (${escapeHtml(item.status)})</p>`).join("") || "<p>No appointments.</p>"}<h3>Health reports</h3>${(data.reports || []).map((item) => `<p>${escapeHtml(item.date)} — ${escapeHtml(item.title)}: ${escapeHtml(item.value)}</p>`).join("") || "<p>No reports.</p>"}</div></section>`;
  } else if (page === "consultation") {
    body = `<section class="panel advanced-panel"><div class="advanced-header"><div><h2>Request an online visit</h2><p>Your request will be reviewed by the care team.</p></div></div><form class="feature-form" id="consultationForm"><label>Specialist<select name="doctorId" required><option value="">Choose a specialist</option>${patientDoctorOptions()}</select></label><div class="form-row"><label>Date<input type="date" name="date" required /></label><label>Time<select name="time" required><option>09:00</option><option>09:30</option><option>10:00</option><option>10:30</option><option>11:00</option><option>14:00</option><option>14:30</option></select></label></div><label>Reason for visit<textarea name="reason" maxlength="300" placeholder="Briefly describe your concern"></textarea></label><button class="button button-primary" type="submit">Request consultation</button></form><h3 class="section-subtitle">Your consultation requests</h3>${(data.consultations || []).map((item) => `<div class="advanced-row"><div><h3>${escapeHtml(item.doctor)}</h3><p>${escapeHtml(item.specialty)} · ${escapeHtml(item.date)} ${escapeHtml(item.time)}</p></div><span class="status-pill status-pending">${escapeHtml(item.status)}</span></div>`).join("") || '<div class="empty-state">No online consultations requested.</div>'}</section>`;
  } else if (page === "reminders") {
    body = `<section class="panel advanced-panel"><div class="advanced-header"><div><h2>Add medicine reminder</h2><p>Reminders are stored in your patient account.</p></div></div><form class="feature-form" id="reminderForm"><div class="form-row"><label>Medicine<input name="medicine" maxlength="100" required placeholder="Medicine name" /></label><label>Dosage<input name="dosage" maxlength="100" required placeholder="e.g. 1 tablet" /></label></div><label>Reminder time<input type="time" name="time" required /></label><button class="button button-primary" type="submit">Add reminder</button></form><h3 class="section-subtitle">Scheduled medicines</h3>${(data.reminders || []).map((item) => `<div class="advanced-row"><div><h3>${escapeHtml(item.medicine)}</h3><p>${escapeHtml(item.dosage)} · ${escapeHtml(item.time)}</p></div><label class="reminder-toggle"><input type="checkbox" data-reminder-toggle="${escapeHtml(item.id)}" ${item.enabled ? "checked" : ""} /> Enabled</label><button class="text-button" data-reminder-delete="${escapeHtml(item.id)}">Remove</button></div>`).join("") || '<div class="empty-state">No medicine reminders yet.</div>'}</section>`;
  } else if (page === "reports") {
    body = `<section class="panel advanced-panel"><div class="advanced-header"><div><h2>Add health report</h2><p>Keep a personal timeline of important results.</p></div></div><form class="feature-form" id="reportForm"><div class="form-row"><label>Report name<input name="title" maxlength="100" required placeholder="Blood pressure" /></label><label>Report type<input name="reportType" maxlength="60" required placeholder="Vital / Lab / Imaging" /></label></div><div class="form-row"><label>Result<input name="value" maxlength="100" required placeholder="120/80 mmHg" /></label><label>Date<input type="date" name="date" required /></label></div><button class="button button-primary" type="submit">Save report</button></form><h3 class="section-subtitle">Tracked reports</h3>${(data.reports || []).map((item) => `<div class="advanced-row"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.reportType)} · ${escapeHtml(item.date)}</p></div><strong>${escapeHtml(item.value)}</strong></div>`).join("") || '<div class="empty-state">No health reports tracked.</div>'}</section>`;
  } else if (page === "payments") {
    body = `<section class="panel advanced-panel"><div class="advanced-header"><div><h2>Make a payment</h2><p>Demo checkout — no real money will be charged.</p></div></div><form class="feature-form" id="paymentForm"><div class="form-row"><label>Amount (₹)<input type="number" name="amount" min="1" max="100000" step="0.01" required /></label><label>Description<input name="description" maxlength="120" required placeholder="Consultation / service fee" /></label></div><button class="button button-primary" type="submit">Pay securely</button></form><h3 class="section-subtitle">Payment history</h3>${(data.payments || []).map((item) => `<div class="advanced-row"><div><h3>${escapeHtml(item.description)}</h3><p>${escapeHtml(new Date(item.createdAt).toLocaleString())}</p></div><strong>₹${Number(item.amount).toLocaleString("en-IN")}</strong><span class="status-pill status-confirmed">${escapeHtml(item.status)}</span></div>`).join("") || '<div class="empty-state">No payments yet.</div>'}</section>`;
  }
  document.getElementById("pageContent").innerHTML = `<div class="page-heading"><div><div class="eyebrow"><span class="live-dot"></span> PATIENT SERVICES</div><h1>${title}</h1><p>${subtitle}</p></div></div>${body}<footer class="page-footer"><span>© ${new Date().getFullYear()} KIRANSUNDAR Hospital</span><span><i></i> Your information is private</span></footer>`;
  bindPatientSectionEvents(page);
  updateFooterYear();
}

function bindPatientSectionEvents(page) {
  if (page === "appointments") {
    document.getElementById("patientBookVisit")?.addEventListener("click", openModal);
  }
  if (page === "history") {
    document.getElementById("downloadMedicalPdf")?.addEventListener("click", () => {
      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) return showToast("Allow pop-ups to download the medical history PDF.");
      const history = document.getElementById("medicalHistory").innerHTML;
      printWindow.document.write(`<!doctype html><html><head><title>Medical History</title><style>body{font-family:Arial,sans-serif;color:#211e1c;padding:40px}h1,h2,h3{color:#b94d0a}p{line-height:1.6}@media print{button{display:none}}</style></head><body><h1>KIRANSUNDAR Hospital</h1>${history}<script>window.onload=()=>{window.print()}<\/script></body></html>`);
      printWindow.document.close();
    });
  }
  if (page === "consultation") {
    document.getElementById("consultationForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      form.elements.date.min = new Date().toISOString().slice(0, 10);
      try {
        await api("/api/patient/consultations", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
        await refreshData();
        showToast("Your online consultation request has been sent.");
      } catch (error) { showToast(error.message); }
    });
  }
  if (page === "reminders") {
    document.getElementById("reminderForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await api("/api/patient/reminders", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
        await refreshData();
        showToast("Medicine reminder added.");
      } catch (error) { showToast(error.message); }
    });
    document.querySelectorAll("[data-reminder-toggle]").forEach((input) => input.addEventListener("change", async () => {
      try {
        await api(`/api/patient/reminders/${encodeURIComponent(input.dataset.reminderToggle)}`, { method: "PATCH", body: JSON.stringify({ enabled: input.checked }) });
        await refreshData();
        showToast(input.checked ? "Reminder enabled." : "Reminder paused.");
      } catch (error) { showToast(error.message); }
    }));
    document.querySelectorAll("[data-reminder-delete]").forEach((button) => button.addEventListener("click", async () => {
      try {
        await api(`/api/patient/reminders/${encodeURIComponent(button.dataset.reminderDelete)}`, { method: "DELETE" });
        await refreshData();
        showToast("Medicine reminder removed.");
      } catch (error) { showToast(error.message); }
    }));
  }
  if (page === "reports") {
    document.getElementById("reportForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      form.elements.date.max = new Date().toISOString().slice(0, 10);
      try {
        await api("/api/patient/reports", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
        await refreshData();
        showToast("Health report saved.");
      } catch (error) { showToast(error.message); }
    });
  }
  if (page === "payments") {
    document.getElementById("paymentForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await api("/api/patient/payments", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
        await refreshData();
        showToast("Demo payment completed successfully.");
      } catch (error) { showToast(error.message); }
    });
  }
}

function bindAppointmentMenus() {
  document.querySelectorAll("[data-appointment-status]").forEach((select) => select.addEventListener("change", async () => {
    const item = state.appointments.find((appointment) => appointment.id === select.dataset.appointmentStatus);
    if (!item || select.value === item.status) return;
    const next = select.value;
    select.disabled = true;
    try {
      await api(`/api/appointments/${encodeURIComponent(item.id)}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      await refreshData();
      showToast(`${item.patient}’s appointment updated to ${next.toLowerCase()}.`);
    } catch (error) {
      select.value = item.status;
      showToast(error.message);
    } finally {
      if (select.isConnected) select.disabled = false;
    }
  }));
}

function openModal() {
  const form = document.getElementById("appointmentForm");
  form.reset();
  form.elements.date.min = new Date().toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  form.elements.date.value = today;
  const patientFields = document.getElementById("bookingPatientFields");
  const isPatient = state.role === "patient";
  patientFields.hidden = isPatient;
  patientFields.querySelectorAll("input").forEach((input) => { input.disabled = isPatient; });
  document.getElementById("patientBookingNote").hidden = !isPatient;
  document.getElementById("modalTitle").textContent = isPatient ? "Book a visit" : "Book an appointment";
  document.getElementById("modalDescription").textContent = isPatient ? "Choose a specialist and a time that works for you." : "Choose a time that works for your patient.";
  document.getElementById("modalBackdrop").hidden = false;
  (isPatient ? form.elements.doctorId : form.elements.patient).focus();
}

function closeModal() {
  document.getElementById("modalBackdrop").hidden = true;
}

function setAuthMode(mode) {
  state.authMode = mode;
  const patientMode = mode === "patient";
  document.getElementById("loginForm").elements.password.value = "";
  document.getElementById("registerForm").elements.password.value = "";
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    const active = tab.dataset.authMode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.getElementById("authEyebrow").textContent = patientMode ? "PATIENT PORTAL ACCESS" : "STAFF & ADMIN ACCESS";
  document.getElementById("loginTitle").textContent = patientMode ? "Welcome to your care space." : "Care begins with you.";
  document.getElementById("loginDescription").textContent = patientMode ? "Sign in to your KIRANSUNDAR patient portal." : "Sign in to your KIRANSUNDAR workspace.";
  document.getElementById("loginForm").hidden = false;
  document.getElementById("registerForm").hidden = true;
  document.getElementById("registerPrompt").hidden = !patientMode;
  document.getElementById("loginPrompt").hidden = true;
  document.getElementById("loginError").classList.remove("visible");
  document.getElementById("registerError").classList.remove("visible");
}

function showRegistration() {
  if (state.authMode !== "patient") return;
  document.getElementById("loginTitle").textContent = "Your care journey starts here.";
  document.getElementById("loginDescription").textContent = "Create a secure account for your patient portal.";
  document.getElementById("loginForm").hidden = true;
  document.getElementById("registerForm").hidden = false;
  document.getElementById("registerPrompt").hidden = true;
  document.getElementById("loginPrompt").hidden = false;
  document.getElementById("loginError").classList.remove("visible");
  document.getElementById("registerError").classList.remove("visible");
  document.getElementById("registerForm").elements.name.focus();
}

function exportReport() {
  const rows = [["Patient", "Doctor", "Specialty", "Date", "Time", "Status"], ...state.appointments.map((appointment) => [appointment.patient, appointment.doctor, appointment.specialty, appointment.date, appointment.time, appointment.status])];
  const csv = rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "kiransundar-appointments.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Your appointment report has been exported.");
}

function bindOverviewControls() {
  document.getElementById("newAppointment")?.addEventListener("click", openModal);
  document.getElementById("exportButton")?.addEventListener("click", exportReport);
}

function showAuth(message = "") {
  state.user = null;
  state.role = "admin";
  document.getElementById("appShell").hidden = true;
  document.getElementById("appShell").classList.remove("patient-session");
  document.getElementById("authScreen").hidden = false;
  document.getElementById("patientLogoutButton").hidden = true;
  document.getElementById("kiranAssistant").hidden = true;
  document.getElementById("registerForm").reset();
  setAuthMode("admin");
  const error = document.getElementById("loginError");
  error.textContent = message;
  error.classList.toggle("visible", Boolean(message));
  document.getElementById("loginForm").elements.password.value = "";
  if (!message) document.getElementById("loginForm").elements.email.focus();
}

function showApp(user) {
  state.user = user;
  state.role = user.role;
  document.getElementById("profileName").textContent = user.name || user.email;
  document.getElementById("profileRole").textContent = user.role === "admin" ? "Administrator" : "Patient";
  document.getElementById("appShell").classList.toggle("patient-session", user.role === "patient");
  document.querySelectorAll(".patient-nav").forEach((button) => { button.hidden = user.role !== "patient"; });
  ["patients", "doctors", "departments", "reports", "settings"].forEach((page) => {
    document.querySelectorAll(`.nav-link[data-page="${page}"]`).forEach((button) => { button.hidden = user.role === "patient"; });
  });
  document.getElementById("patientLogoutButton").hidden = user.role !== "patient";
  document.getElementById("kiranAssistant").hidden = user.role !== "patient";
  document.getElementById("authScreen").hidden = true;
  document.getElementById("appShell").hidden = false;
  state.page = "overview";
  document.getElementById("breadcrumbCurrent").textContent = "Overview";
}

async function refreshData() {
  if (state.role === "patient") {
    const [appointments, doctors, patientData] = await Promise.all([
      api("/api/patient/appointments"),
      api("/api/doctors"),
      api("/api/patient/dashboard")
    ]);
    state.appointments = appointments;
    state.doctors = doctors;
    state.patientData = patientData;
    if (state.page === "overview") renderPatientOverview();
    else renderPatientSection(state.page);
    return;
  }
  const [overview, appointments, patients, doctors] = await Promise.all([
    api("/api/overview"), api("/api/appointments"), api("/api/patients"), api("/api/doctors")
  ]);
  state.overview = overview;
  state.appointments = appointments;
  state.patients = patients;
  state.doctors = doctors;
  if (state.page === "overview") renderOverview();
  else renderSection(state.page);
}

document.querySelectorAll(".nav-link[data-page]").forEach((button) => button.addEventListener("click", () => setPage(button.dataset.page)));
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (button && !button.classList.contains("nav-link")) setPage(button.dataset.page);
});
bindOverviewControls();
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("modalBackdrop").addEventListener("click", (event) => { if (event.target.id === "modalBackdrop") closeModal(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.getElementById("globalSearch").focus(); }
});
document.getElementById("appointmentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const input = Object.fromEntries(form.entries());
  try {
    await api("/api/appointments", { method: "POST", body: JSON.stringify(input) });
    closeModal();
    await refreshData();
    showToast("Appointment booked. We look forward to seeing you.");
  } catch (error) { showToast(error.message); }
});
document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("supportButton").addEventListener("click", () => showToast("Contact KIRANSUNDAR Hospital support for assistance."));
document.getElementById("globalSearch").addEventListener("input", (event) => {
  if (event.target.value.trim()) {
    if (!["patients", "doctors", "appointments"].includes(state.page)) setPage("patients");
    const sectionSearch = document.getElementById("sectionSearch");
    if (sectionSearch) {
      sectionSearch.value = event.target.value;
      filterSection(event.target.value);
    }
  }
});

document.querySelectorAll(".auth-tab").forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)));
document.getElementById("showRegister").addEventListener("click", showRegistration);
document.getElementById("showLogin").addEventListener("click", () => setAuthMode("patient"));

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const values = new FormData(form);
  button.disabled = true;
  button.innerHTML = "Signing in securely…";
  try {
    const result = await api("/api/login", { method: "POST", body: JSON.stringify({ ...Object.fromEntries(values.entries()), role: state.authMode }) });
    showApp(result.user);
    await refreshData();
  } catch (error) {
    const message = error.message === "Failed to fetch" ? "Unable to reach the server. Please try again." : error.message;
    const loginError = document.getElementById("loginError");
    loginError.textContent = message;
    loginError.classList.add("visible");
    form.elements.password.value = "";
    form.elements.password.focus();
  } finally {
    button.disabled = false;
    button.innerHTML = 'Sign in securely <span>→</span>';
  }
});

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const error = document.getElementById("registerError");
  button.disabled = true;
  error.classList.remove("visible");
  try {
    const result = await api("/api/register", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
    form.reset();
    showApp(result.user);
    await refreshData();
  } catch (requestError) {
    error.textContent = requestError.message === "Failed to fetch" ? "Unable to reach the server. Please try again." : requestError.message;
    error.classList.add("visible");
  } finally {
    button.disabled = false;
  }
});

async function logout() {
  try {
    await api("/api/logout", { method: "POST" });
    showAuth();
  } catch (error) {
    showToast(`Could not sign out: ${error.message}`);
  }
}

document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("patientLogoutButton").addEventListener("click", logout);

document.getElementById("kiranLauncher").addEventListener("click", () => {
  const chat = document.getElementById("kiranChat");
  chat.hidden = !chat.hidden;
  document.getElementById("kiranLauncher").setAttribute("aria-expanded", String(!chat.hidden));
  if (!chat.hidden) document.getElementById("kiranMessageInput").focus();
});
document.getElementById("closeKiranChat").addEventListener("click", () => {
  document.getElementById("kiranChat").hidden = true;
  document.getElementById("kiranLauncher").setAttribute("aria-expanded", "false");
  document.getElementById("kiranLauncher").focus();
});
document.getElementById("kiranChatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("kiranMessageInput");
  const message = input.value.trim();
  if (!message) return;
  addKiranMessage(message, "patient");
  input.value = "";
  window.setTimeout(() => addKiranMessage(answerKiran(message), "assistant"), 250);
});
document.getElementById("kiranQuickActions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-kiran-action]");
  if (button) openKiranPage(button.dataset.kiranAction);
});

async function initializeApp() {
  try {
    const session = await api("/api/session");
    if (!session.authenticated) return showAuth();
    showApp(session.user);
    await refreshData();
  } catch (error) {
    showAuth(error.message === "Failed to fetch" ? "Unable to reach the server. Please refresh to try again." : error.message);
  }
}

initializeApp().catch((error) => {
  showAuth(`Could not initialize the application: ${error.message}`);
});
updateFooterYear();

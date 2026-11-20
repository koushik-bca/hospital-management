const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes, randomUUID, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "data.json");
const today = new Date().toISOString().slice(0, 10);
const scryptAsync = promisify(scrypt);
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
const registrationAttempts = new Map();
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const initialData = {
  users: [],
  patients: [
    { id: "p-1001", name: "Olivia Rhye", email: "olivia.rhye@example.com", phone: "+1 (555) 014-2391", bloodType: "A+", lastVisit: "2025-11-18", condition: "Regular checkup" },
    { id: "p-1002", name: "Phoenix Baker", email: "phoenix.baker@example.com", phone: "+1 (555) 018-4230", bloodType: "O+", lastVisit: "2025-11-18", condition: "Cardiology follow-up" },
    { id: "p-1003", name: "Lana Steiner", email: "lana.steiner@example.com", phone: "+1 (555) 017-8011", bloodType: "B+", lastVisit: "2025-11-17", condition: "Annual physical" },
    { id: "p-1004", name: "Demi Wilkinson", email: "demi.wilkinson@example.com", phone: "+1 (555) 013-6422", bloodType: "AB+", lastVisit: "2025-11-17", condition: "Dermatology" },
    { id: "p-1005", name: "Candice Wu", email: "candice.wu@example.com", phone: "+1 (555) 016-5721", bloodType: "O-", lastVisit: "2025-11-16", condition: "Pediatrics" },
    { id: "p-1006", name: "Natali Craig", email: "natali.craig@example.com", phone: "+1 (555) 019-3384", bloodType: "A-", lastVisit: "2025-11-16", condition: "Orthopedics" },
    { id: "p-1007", name: "Drew Cano", email: "drew.cano@example.com", phone: "+1 (555) 010-5904", bloodType: "B-", lastVisit: "2025-11-15", condition: "Neurology" }
  ],
  doctors: [
    { id: "d-101", name: "Dr. Priya Sharma", specialty: "Cardiology", department: "Heart & Vascular", color: "#f8d6bd", initials: "PS", image: "photo-1559839734-2b71ea197ec2" },
    { id: "d-102", name: "Dr. Arjun Mehta", specialty: "Neurology", department: "Neuroscience", color: "#d8dfe5", initials: "AM", image: "photo-1612349317150-e413f6a5b16d" },
    { id: "d-103", name: "Dr. Ananya Iyer", specialty: "Pediatrics", department: "Children's Health", color: "#f5dfc9", initials: "AI", image: "photo-1594824476967-48c8b964273f" },
    { id: "d-104", name: "Dr. Rohan Nair", specialty: "Orthopedics", department: "Bone & Joint", color: "#dce5e3", initials: "RN", image: "photo-1622253692010-333f2da6031d" },
    { id: "d-105", name: "Dr. Meera Kapoor", specialty: "Dermatology", department: "Skin & Wellness", color: "#f3d9d0", initials: "MK", image: "photo-1551601651-2a8555f1a136" }
  ],
  appointments: [
    { id: "a-5001", patient: "Olivia Rhye", patientId: "p-1001", doctor: "Dr. Olivia Rhye", doctorId: "d-101", specialty: "Cardiology", date: today, time: "09:00", type: "Consultation", status: "Confirmed" },
    { id: "a-5002", patient: "Phoenix Baker", patientId: "p-1002", doctor: "Dr. Phoenix Baker", doctorId: "d-102", specialty: "Neurology", date: today, time: "09:30", type: "Follow-up", status: "Checked in" },
    { id: "a-5003", patient: "Lana Steiner", patientId: "p-1003", doctor: "Dr. Lana Steiner", doctorId: "d-103", specialty: "Pediatrics", date: today, time: "10:00", type: "Consultation", status: "Confirmed" },
    { id: "a-5004", patient: "Demi Wilkinson", patientId: "p-1004", doctor: "Dr. Demi Wilkinson", doctorId: "d-104", specialty: "Orthopedics", date: today, time: "10:30", type: "Follow-up", status: "In progress" },
    { id: "a-5005", patient: "Candice Wu", patientId: "p-1005", doctor: "Dr. Lana Steiner", doctorId: "d-103", specialty: "Pediatrics", date: today, time: "11:00", type: "Consultation", status: "Confirmed" },
    { id: "a-5006", patient: "Natali Craig", patientId: "p-1006", doctor: "Dr. Demi Wilkinson", doctorId: "d-104", specialty: "Orthopedics", date: today, time: "11:30", type: "Follow-up", status: "Pending" },
    { id: "a-5007", patient: "Drew Cano", patientId: "p-1007", doctor: "Dr. Phoenix Baker", doctorId: "d-102", specialty: "Neurology", date: today, time: "13:00", type: "Consultation", status: "Confirmed" }
  ]
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return structuredClone(initialData);
  } catch (error) {
    console.error("Could not load hospital data:", error);
    throw error;
  }
}

let data = loadData();
if (!Array.isArray(data.users)) {
  data.users = [];
  saveData();
}
for (const key of ["healthReminders", "healthReports", "consultations", "payments", "notifications"]) {
  if (!Array.isArray(data[key])) data[key] = [];
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const doctorProfiles = new Map(initialData.doctors.map((doctor) => [doctor.id, doctor]));
let doctorDataChanged = false;
for (const doctor of data.doctors || []) {
  const profile = doctorProfiles.get(doctor.id);
  if (!profile) continue;
  for (const field of ["name", "specialty", "department", "color", "initials", "image"]) {
    if (doctor[field] !== profile[field]) {
      doctor[field] = profile[field];
      doctorDataChanged = true;
    }
  }
}
for (const appointment of data.appointments || []) {
  const doctor = doctorProfiles.get(appointment.doctorId);
  if (!doctor) continue;
  if (appointment.doctor !== doctor.name || appointment.specialty !== doctor.specialty) doctorDataChanged = true;
  appointment.doctor = doctor.name;
  appointment.specialty = doctor.specialty;
}
if (doctorDataChanged) saveData();

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  response.end(JSON.stringify(value));
}

function getCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? ["", ""] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }).filter(([name]) => name));
}

function getSessionUser(request) {
  const token = getCookies(request).kiransundar_session;
  const session = token && sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return data.users.find((user) => user.id === session.userId) || null;
}

function sessionCookie(token, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `kiransundar_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function verifyPassword(password, user) {
  const actual = await scryptAsync(password, Buffer.from(user.salt, "hex"), 64, SCRYPT_OPTIONS);
  const expected = Buffer.from(user.passwordHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error("Request body is too large."));
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function serveStatic(request, response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.resolve(PUBLIC_DIR, `.${requestedPath}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`) && filePath !== path.join(PUBLIC_DIR, "index.html")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const extension = path.extname(filePath);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
    response.writeHead(200, {
      "Content-Type": types[extension] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=3600"
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const route = url.pathname;
  try {
    if (route.startsWith("/api/")) {
      if (request.method === "GET" && route === "/api/health") return sendJson(response, 200, { status: "ok" });
      if (request.method === "GET" && route === "/api/session") {
        const user = getSessionUser(request);
        return sendJson(response, 200, { authenticated: Boolean(user), user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null });
      }
      if (request.method === "POST" && route === "/api/login") {
        const address = request.socket.remoteAddress || "unknown";
        const attempts = loginAttempts.get(address);
        if (attempts?.blockedUntil > Date.now()) return sendJson(response, 429, { error: "Too many sign-in attempts. Try again in 15 minutes." });

        const input = await readBody(request);
        const email = String(input.email || "").trim().toLowerCase();
        const password = typeof input.password === "string" ? input.password : "";
        const user = validEmail(email) ? data.users.find((candidate) => candidate.email === email) : null;
        const roleMatches = input.role === "admin" || input.role === "patient" ? user?.role === input.role : Boolean(user);
        const valid = user && roleMatches && password.length <= 1024 && await verifyPassword(password, user);
        if (!valid) {
          const current = attempts?.windowStartedAt > Date.now() - 15 * 60 * 1000
            ? attempts
            : { count: 0, windowStartedAt: Date.now() };
          current.count += 1;
          if (current.count >= 5) current.blockedUntil = Date.now() + 15 * 60 * 1000;
          loginAttempts.set(address, current);
          return sendJson(response, 401, { error: "Invalid email or password." });
        }

        loginAttempts.delete(address);
        const token = randomBytes(32).toString("hex");
        sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS });
        return sendJson(response, 200, { authenticated: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } }, {
          "Set-Cookie": sessionCookie(token, SESSION_TTL_MS / 1000)
        });
      }
      if (request.method === "POST" && route === "/api/register") {
        const address = request.socket.remoteAddress || "unknown";
        const now = Date.now();
        const registration = registrationAttempts.get(address);
        if (registration?.windowStartedAt > now - 60 * 60 * 1000 && registration.count >= 5) {
          return sendJson(response, 429, { error: "Too many account registration attempts. Please try again later." });
        }
        const input = await readBody(request);
        const name = typeof input.name === "string" ? input.name.trim() : "";
        const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
        const phone = typeof input.phone === "string" ? input.phone.trim() : "";
        const password = typeof input.password === "string" ? input.password : "";
        if (name.length < 2 || name.length > 100 || !validEmail(email) || password.length < 12 || password.length > 1024 || phone.length > 40) {
          return sendJson(response, 400, { error: "Enter your name, a valid email address, and a password of at least 12 characters." });
        }
        if (data.users.some((user) => user.email === email)) {
          return sendJson(response, 409, { error: "An account with that email already exists. Please sign in instead." });
        }
        if (data.patients.some((record) => record.email && record.email.toLowerCase() === email)) {
          return sendJson(response, 409, { error: "This email is already linked to a patient record. Please contact the hospital to activate portal access." });
        }
        const patient = {
          id: `p-${randomUUID().slice(0, 8)}`,
          name,
          email,
          phone,
          bloodType: "—",
          lastVisit: today,
          condition: "New patient"
        };
        data.patients.unshift(patient);
        const salt = randomBytes(16);
        const passwordHash = await scryptAsync(password, salt, 64, SCRYPT_OPTIONS);
        const user = {
          id: `u-${randomUUID()}`,
          name,
          email,
          role: "patient",
          patientId: patient.id,
          salt: salt.toString("hex"),
          passwordHash: passwordHash.toString("hex")
        };
        data.users.push(user);
        saveData();
        const currentRegistration = registration?.windowStartedAt > now - 60 * 60 * 1000
          ? registration
          : { count: 0, windowStartedAt: now };
        currentRegistration.count += 1;
        registrationAttempts.set(address, currentRegistration);
        const token = randomBytes(32).toString("hex");
        sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS });
        return sendJson(response, 201, { authenticated: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } }, {
          "Set-Cookie": sessionCookie(token, SESSION_TTL_MS / 1000)
        });
      }
      if (request.method === "POST" && route === "/api/logout") {
        const token = getCookies(request).kiransundar_session;
        if (token) sessions.delete(token);
        return sendJson(response, 200, { authenticated: false }, { "Set-Cookie": sessionCookie("", 0) });
      }

      const sessionUser = getSessionUser(request);
      if (!sessionUser) return sendJson(response, 401, { error: "Please sign in to continue." });
      if (request.method === "GET" && route === "/api/doctors") return sendJson(response, 200, data.doctors);
      if (request.method === "GET" && route === "/api/patient/appointments" && sessionUser.role === "patient") {
        return sendJson(response, 200, data.appointments.filter((item) => item.patientId === sessionUser.patientId));
      }
      const patientRoute = route.startsWith("/api/patient/");
      if (patientRoute && sessionUser.role !== "patient") {
        return sendJson(response, 403, { error: "Patient access is required for this resource." });
      }
      if (request.method === "GET" && route === "/api/patient/dashboard" && sessionUser.role === "patient") {
        const patientId = sessionUser.patientId;
        const patient = data.patients.find((record) => record.id === patientId);
        const matches = (item) => item.patientId === patientId;
        return sendJson(response, 200, {
          patient,
          appointments: data.appointments.filter(matches),
          reminders: data.healthReminders.filter(matches),
          reports: data.healthReports.filter(matches),
          consultations: data.consultations.filter(matches),
          payments: data.payments.filter(matches),
          notifications: data.notifications.filter(matches)
        });
      }
      if (request.method === "POST" && route === "/api/patient/reminders" && sessionUser.role === "patient") {
        const input = await readBody(request);
        const medicine = String(input.medicine || "").trim();
        const time = String(input.time || "");
        const dosage = String(input.dosage || "").trim();
        if (medicine.length < 2 || medicine.length > 100 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || dosage.length > 100) {
          return sendJson(response, 400, { error: "Enter a medicine name, dosage, and valid reminder time." });
        }
        const reminder = { id: `r-${randomUUID().slice(0, 8)}`, patientId: sessionUser.patientId, medicine, dosage, time, enabled: true, createdAt: new Date().toISOString() };
        data.healthReminders.unshift(reminder);
        saveData();
        return sendJson(response, 201, reminder);
      }
      const reminderMatch = route.match(/^\/api\/patient\/reminders\/([^/]+)$/);
      if (reminderMatch && ["PATCH", "DELETE"].includes(request.method) && sessionUser.role === "patient") {
        const index = data.healthReminders.findIndex((item) => item.id === reminderMatch[1] && item.patientId === sessionUser.patientId);
        if (index < 0) return sendJson(response, 404, { error: "Medicine reminder not found." });
        if (request.method === "DELETE") {
          const removed = data.healthReminders.splice(index, 1)[0];
          saveData();
          return sendJson(response, 200, removed);
        }
        const input = await readBody(request);
        data.healthReminders[index].enabled = Boolean(input.enabled);
        saveData();
        return sendJson(response, 200, data.healthReminders[index]);
      }
      if (request.method === "POST" && route === "/api/patient/consultations" && sessionUser.role === "patient") {
        const input = await readBody(request);
        const doctor = data.doctors.find((item) => item.id === String(input.doctorId || ""));
        const date = String(input.date || "");
        const time = String(input.time || "");
        if (!doctor || !validDate(date) || date < new Date().toISOString().slice(0, 10) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
          return sendJson(response, 400, { error: "Choose a doctor and provide a valid consultation date and time." });
        }
        const consultation = { id: `c-${randomUUID().slice(0, 8)}`, patientId: sessionUser.patientId, doctorId: doctor.id, doctor: doctor.name, specialty: doctor.specialty, date, time, reason: String(input.reason || "").trim().slice(0, 300), status: "Requested", createdAt: new Date().toISOString() };
        data.consultations.unshift(consultation);
        saveData();
        return sendJson(response, 201, consultation);
      }
      if (request.method === "POST" && route === "/api/patient/reports" && sessionUser.role === "patient") {
        const input = await readBody(request);
        const title = String(input.title || "").trim();
        const reportType = String(input.reportType || "").trim();
        const value = String(input.value || "").trim();
        const date = String(input.date || "");
        if (title.length < 2 || title.length > 100 || !reportType || !validDate(date) || value.length > 100) {
          return sendJson(response, 400, { error: "Enter a report name, type, date, and result." });
        }
        const report = { id: `h-${randomUUID().slice(0, 8)}`, patientId: sessionUser.patientId, title, reportType, value, date, createdAt: new Date().toISOString() };
        data.healthReports.unshift(report);
        saveData();
        return sendJson(response, 201, report);
      }
      if (request.method === "POST" && route === "/api/patient/payments" && sessionUser.role === "patient") {
        const input = await readBody(request);
        const amount = Number(input.amount);
        const description = String(input.description || "").trim();
        if (!Number.isFinite(amount) || amount <= 0 || amount > 100000 || description.length < 2 || description.length > 120) {
          return sendJson(response, 400, { error: "Enter a valid payment amount and description." });
        }
        const payment = { id: `pay-${randomUUID().slice(0, 8)}`, patientId: sessionUser.patientId, amount: Math.round(amount * 100) / 100, description, method: "Demo payment", status: "Paid", createdAt: new Date().toISOString() };
        data.payments.unshift(payment);
        saveData();
        return sendJson(response, 201, payment);
      }
      if (sessionUser.role !== "admin" && sessionUser.role !== "patient") return sendJson(response, 403, { error: "This account does not have permission to access this resource." });
      if (sessionUser.role === "patient" && route === "/api/patient/appointments") {
        // Patient appointment reads are handled above.
      } else if (sessionUser.role === "patient" && route !== "/api/patient/appointments" && !(request.method === "POST" && route === "/api/appointments") && !patientRoute) {
        return sendJson(response, 403, { error: "Administrator access is required for this resource." });
      }
      if (request.method === "GET" && route === "/api/overview") {
        const today = new Date().toISOString().slice(0, 10);
        const appointmentsToday = data.appointments.filter((item) => item.date === today).length;
        const completed = data.appointments.filter((item) => item.status === "Completed").length;
        return sendJson(response, 200, {
          patients: data.patients.length,
          doctors: data.doctors.length,
          appointmentsToday,
          occupancy: 78,
          appointments: data.appointments.slice(0, 8),
          completed,
          departments: [
            { name: "Cardiology", count: 48, percent: 84, color: "#347d78" },
            { name: "Neurology", count: 36, percent: 68, color: "#8da59b" },
            { name: "Pediatrics", count: 29, percent: 54, color: "#d5a77e" },
            { name: "Orthopedics", count: 22, percent: 39, color: "#b7c8bb" }
          ]
        });
      }
      if (request.method === "GET" && route === "/api/appointments") return sendJson(response, 200, data.appointments);
      if (request.method === "GET" && route === "/api/patients") return sendJson(response, 200, data.patients);

      const appointmentMatch = route.match(/^\/api\/appointments\/([^/]+)$/);
      if (appointmentMatch && request.method === "PATCH") {
        if (sessionUser.role !== "admin") return sendJson(response, 403, { error: "Only administrators can update appointment status." });
        const appointment = data.appointments.find((item) => item.id === appointmentMatch[1]);
        if (!appointment) return sendJson(response, 404, { error: "Appointment not found." });
        const { status } = await readBody(request);
        const allowedStatuses = ["Confirmed", "Checked in", "In progress", "Completed", "Cancelled", "Pending"];
        if (!allowedStatuses.includes(status)) return sendJson(response, 400, { error: "Invalid appointment status." });
        appointment.status = status;
        saveData();
        return sendJson(response, 200, appointment);
      }

      if (request.method === "POST" && route === "/api/appointments") {
        const input = await readBody(request);
        const doctor = data.doctors.find((item) => item.id === input.doctorId);
        const date = String(input.date || "");
        const time = String(input.time || "");
        if (!doctor || !validDate(date) || date < new Date().toISOString().slice(0, 10) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
          return sendJson(response, 400, { error: "Choose a doctor and provide a valid date and time." });
        }
        const conflictingAppointment = data.appointments.find((item) =>
          item.doctorId === doctor.id && item.date === date && item.time === time && item.status !== "Cancelled"
        );
        if (conflictingAppointment) return sendJson(response, 409, { error: "That doctor is already booked at this time. Please choose another time." });
        let patient;
        if (sessionUser.role === "patient") {
          patient = data.patients.find((record) => record.id === sessionUser.patientId);
          if (!patient) return sendJson(response, 403, { error: "Patient profile was not found. Please contact the hospital." });
        } else {
          const patientName = String(input.patient || "").trim();
          if (patientName.length < 2 || patientName.length > 100) return sendJson(response, 400, { error: "Enter a patient name between 2 and 100 characters." });
          patient = data.patients.find((item) => item.name.toLowerCase() === patientName.toLowerCase());
          if (!patient) {
            patient = { id: `p-${randomUUID().slice(0, 8)}`, name: patientName, email: String(input.email || "").trim(), phone: String(input.phone || "").trim(), bloodType: "—", lastVisit: date, condition: doctor.specialty };
            data.patients.unshift(patient);
          }
        }
        const appointment = {
          id: `a-${randomUUID().slice(0, 8)}`,
          patient: patient.name,
          patientId: patient.id,
          doctor: doctor.name,
          doctorId: doctor.id,
          specialty: doctor.specialty,
          date,
          time,
          type: String(input.type || "Consultation"),
          status: "Pending"
        };
        data.appointments.unshift(appointment);
        saveData();
        return sendJson(response, 201, appointment);
      }
      return sendJson(response, 404, { error: "API route not found." });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      return response.end("Method not allowed");
    }
    return serveStatic(request, response, route);
  } catch (error) {
    console.error("Request failed:", error);
    if (!response.headersSent) sendJson(response, 500, { error: "The request could not be completed." });
    else response.end();
  }
});

server.listen(PORT, () => {
  console.log(`KIRANSUNDAR Hospital is ready at http://localhost:${PORT}`);
});

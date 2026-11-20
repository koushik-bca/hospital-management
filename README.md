# KIRANSUNDAR Hospital Management

A responsive KIRANSUNDAR Hospital management demo with an administrator dashboard, patient registration and login, a private patient portal, and a persistent Node.js API. It uses only Node.js built-ins; no package installation is required.

## Run locally

```powershell
node server.js
```

Open [http://localhost:3000](http://localhost:3000) and choose Staff login or Patient login. Staff sign in with the administrator account provisioned for this installation. Patients can register with their email and password, or sign into an existing portal account. The server creates `data.json` with sample records on first start and saves appointment changes and salted password hashes there.

To provision another administrator, pass the password on standard input (not as a command-line argument):

```powershell
$password = Read-Host "Admin password" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
try {
  $plainText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  $plainText | node scripts\create-admin.js admin@example.com "Hospital Administrator"
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $plainText = $null
}
```

## Included

- Admin overview, appointment schedule and status updates, patient and doctor directories, departments, reports, and CSV export.
- Patient registration and login; patient appointments and bookings are limited to the signed-in patient's own profile.
- Patient information cards for Ayushman Bharat PM-JAY and the Ayushman Bharat Digital Mission, linked to official government websites.
- Demo doctor directory uses fictional Indian doctor names. Appointment conflicts for the same doctor, date, and time are rejected, and admins can choose appointment statuses directly.
- The orange, white, and black interface uses locally hosted hospital illustrations and image fallbacks so key visuals remain available when external photo services are unreachable.
- Admin login/logout with expiring, HTTP-only, SameSite session cookies and rate-limited password checks.
- JSON API: public `GET /api/health` and `/api/session`, `POST /api/login`, `/api/register`, and `/api/logout`; authenticated admin `GET /api/overview`, `/api/appointments`, `/api/patients`, `/api/doctors`; patient `GET /api/patient/appointments` and `/api/doctors`; `POST /api/appointments`; admin-only `PATCH /api/appointments/:id`.

This is a local demo, not a production medical-record system. Patient sign-up does not include email verification, password recovery, or staff identity checks; existing patient records cannot be claimed through self-registration. Scheme eligibility and participating hospitals must be verified with the relevant government portal; this app does not claim that KIRANSUNDAR is PM-JAY empanelled. Do not enter real patient or other sensitive health information.

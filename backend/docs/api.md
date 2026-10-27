# API notes

All application endpoints are under `/api/v1`.

## Auth

- `POST /auth/register` — `{ "fullName": "Example Patient", "email": "patient@example.com", "password": "at-least-8-characters" }`
- `POST /auth/login` — `{ "email": "patient@example.com", "password": "..." }`
- `POST /auth/refresh` — reads the HttpOnly refresh cookie and rotates it.
- `POST /auth/logout` — revokes the presented refresh token when one exists and clears cookies.
- `GET /auth/me` — requires the access cookie and returns the account ID, name, and role.

## Admin account management

These routes require an authenticated `hospitalAdmin` or `superadmin` account. Admins can manage patient and doctor accounts only; they cannot create or change other staff/admin roles.

- `GET /admin/accounts` — list patient and doctor accounts without password or token data.
- `POST /admin/accounts` — create an active account. Patient body: `{ "fullName": "Example Patient", "email": "patient@example.com", "password": "initial-password", "role": "patient" }`. Doctor accounts additionally require `specialty` and numeric `appointmentFee`.
- `PATCH /admin/accounts/:id/status` — enable or disable a patient/doctor account with `{ "isActive": false }`. Disabling revokes refresh tokens and immediately blocks future authenticated requests.

## Appointments

Patient booking, availability, list, and cancellation routes require an authenticated patient account. Doctor appointment listing and completion routes require an authenticated doctor account.

- `GET /appointments/doctors` — list active doctors available for booking, exposing only a doctor ID, specialty, appointment fee, and currency (INR); names are not returned.
- `GET /appointments/availability?doctorId=...&startAt=...&endAt=...` — list booked times for the selected doctor and local calendar day. The start and end values must include timezone offsets.
- `GET /appointments` — list appointments belonging to the signed-in patient.
- `GET /appointments/doctor` — list appointments assigned to the signed-in doctor, including patient details and any linked health record. The doctor dashboard uses these appointments to write or update patient reports after visits are completed.
- `POST /appointments` — begin booking a 30-minute appointment for the signed-in patient. Body: `{ "doctorId": "...", "scheduledAt": "2026-10-28T09:00:00+05:30", "reason": "Optional" }`. Times must be in the future, on the hour or half-hour, and no more than six months ahead. For a paid visit, the server creates a Razorpay order using the doctor's stored fee and reserves the slot for 10 minutes; no appointment is created yet. A zero-fee visit is booked directly.
- `POST /appointments/verify-payment` — confirm a paid booking using `{ "orderId": "...", "paymentId": "...", "signature": "..." }` returned by Razorpay Checkout. The server verifies the HMAC signature and payment against Razorpay, captures authorized payments, and creates the appointment only after payment is captured. Failed or expired payments do not create appointments. If a captured payment cannot be matched to an available reservation, the server requests a refund instead of confirming the appointment.
- `PATCH /appointments/:id/cancel` — cancel an upcoming appointment belonging to the signed-in patient. Cancelling a paid appointment does not automatically issue a refund.
- `PATCH /appointments/:id/complete` — the assigned doctor can mark an appointment complete only after its 30-minute scheduled duration has elapsed.

Paid appointment checkout requires backend `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` values configured with Razorpay Test Mode credentials for development. The public key ID is returned to the frontend for Checkout; the secret remains server-side. Do not configure production credentials in a development environment.

## Health records

Patients can view their own health records. The doctor dashboard exposes a patient reports section for assigned appointments. Only the doctor assigned to an appointment can create or update its health record, and only after the appointment's 30-minute scheduled duration has elapsed and the doctor has marked it complete. Records cannot be deleted through the API. Earlier patient-entered notes remain read-only for compatibility and are marked as legacy notes in the frontend.

- `GET /health-records` — patient-only list of the signed-in patient's records.
- `POST /health-records` — doctor-only create for a completed appointment. Body: `{ "appointmentId": "...", "title": "Annual check-up", "type": "visit", "recordDate": "2026-10-27", "notes": "Optional" }`. Supported types are `visit`, `lab`, `prescription`, `vaccination`, and `other`. One health record is allowed per appointment.
- `PATCH /health-records/:id` — doctor-only update for a record linked to an appointment assigned to that doctor and marked complete.

Successful login/register responses return user profile fields in JSON and set HttpOnly cookies. They never return token strings to JavaScript.

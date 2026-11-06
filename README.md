## Demo video

[Watch the MediSync demo] => https://drive.google.com/file/d/1WnIa0vvJe9lok0PVcZDdNGI0a0vw9nCn/view
# MediSync frontend

MediSync is a full-stack healthcare platform that connects patients, doctors, and hospital administrators. Patients can manage appointments and view their health records, doctors can manage visits and author records, and administrators can manage patient and doctor accounts. The responsive frontend communicates with a REST API and uses HttpOnly cookies for authentication.

## Tech stack

- **Frontend:** React 19, Vite 7, JavaScript
- **Backend:** Node.js, Express 5
- **Database:** MongoDB with Mongoose
- **Authentication and validation:** JSON Web Tokens, bcrypt, Zod
- **Payments:** Razorpay


## Deploy

For Vercel frontend and Render backend deployment settings, follow the [root deployment guide](../README.md#deploy-on-vercel-and-render). The production API URL is configured in `.env.production`.

## Run locally

1. Start the backend from the repository's `backend` directory:

   ```bash
   npm install
   npm run dev
   ```

2. From the repository's `backend` directory, seed synthetic demo accounts and sample patient data:

   ```powershell
   $env:SEED_DEMO_DATA = "true"
   $env:SEED_DEMO_PASSWORD = "choose-a-demo-password-at-least-12-characters"
   npm run seed
   Remove-Item Env:\SEED_DEMO_DATA
   Remove-Item Env:\SEED_DEMO_PASSWORD
   ```

   The seed is idempotent and disabled in production. Newly created demo accounts share the supplied password; existing demo account passwords are not changed. The seed prepares four upcoming visits and one completed visit with a synthetic doctor-authored record.

3. Start the frontend from the repository's `frontend` directory:

   ```bash
   npm install
   npm run dev
   ```

4. Open the Vite URL (normally `http://localhost:5173`). The frontend defaults to the deployed Render API; copy `.env.example` to `.env` to use the local API at `http://localhost:5000/api/v1`.

## Seeded demo accounts

The patient account and doctor accounts all use the shared password supplied to the seed command when first created. Seeded account passwords are not printed by the script.

| Account | Email | Specialty | Consultation fee |
|---|---|---|---:|
| Demo patient | `patient@medisync.test` | — | — |
| Demo doctor | `doctor@medisync.test` | General Medicine | ₹500 |
| Cardiology | `doctor.cardiology@medisync.test` | Cardiology | ₹1,200 |
| Dermatology | `doctor.dermatology@medisync.test` | Dermatology | ₹800 |
| Pediatrics | `doctor.pediatrics@medisync.test` | Pediatrics | ₹700 |
| Demo hospital admin | `hospitaladmin@medisync.test` | Account management | — |

The demo hospital admin can manage patient and doctor accounts. The admin account uses the shared `SEED_DEMO_PASSWORD` when first created, or `SEED_ADMIN_PASSWORD` when that variable is supplied to the seed command. Setting `SEED_ADMIN_PASSWORD` also updates the demo admin password without changing other existing demo passwords. Password values are never printed by the seeder.

To set or reset the demo admin password locally, run the seed from the repository's `backend` directory with both environment variables set in that PowerShell process:

```powershell
$env:SEED_DEMO_DATA = "true"
$env:SEED_DEMO_PASSWORD = "your-demo-password-at-least-12-characters"
$env:SEED_ADMIN_PASSWORD = "your-admin-password-at-least-12-characters"
npm run seed
Remove-Item Env:\SEED_DEMO_DATA
Remove-Item Env:\SEED_DEMO_PASSWORD
Remove-Item Env:\SEED_ADMIN_PASSWORD
```

Each doctor has seeded appointments to demonstrate the assigned-doctor workflow. The completed General Medicine appointment includes a synthetic record; upcoming appointments can be completed after their scheduled duration.

Set `VITE_API_URL` in a local `.env` file to use a different backend API URL. See `.env.example`.

Production API requests use a same-origin Netlify proxy to the Render backend so browser authentication cookies remain first-party. `VITE_API_URL` is set to `/api/v1` in `.env.production`; update the proxy destination in `netlify.toml` if the backend URL changes. In Netlify, use `npm run build` as the build command and `dist` as the publish directory. If `VITE_API_URL` is set in Netlify environment variables, set it to `/api/v1`. Authentication cookies are HttpOnly and are never read by JavaScript.
Paid appointment checkout requires Razorpay Test Mode keys in the backend environment (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`).

## Available frontend flows

- Patient sign-up and sign-in
- Session restoration using the access and rotating refresh cookies
- Sign-out through the backend
- Appointment booking with active doctors, 30-minute available time slots, Razorpay checkout, and appointment confirmation only after verified payment
- Appointment cancellation; paid appointment cancellations do not automatically issue a refund
- Patient read-only access to health records authored by the doctor assigned to a completed appointment
- Doctor appointment workflow to complete an elapsed visit and add or update its linked health record
- Hospital admin account management to provision patient/doctor accounts and disable or re-enable them

Public registration creates a patient account; selecting a staff role is not supported.
Health records can only be created or updated by the assigned doctor after completing an appointment. Patients have read-only access; earlier patient-entered notes remain visible as legacy notes. File uploads are not supported.

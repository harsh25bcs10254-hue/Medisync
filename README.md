# MediSync

MediSync is a web application for coordinating patient appointments and doctor-authored visit reports. It brings appointment selection, consultation payments, and records from completed visits into one role-based workflow.

## The problem

Patients often have to manage appointments, payment confirmations, and health information across disconnected services or paper records. This can make it difficult to find an appointment time, know whether a booking is confirmed, and access visit information later.

Care teams also need clear boundaries around appointment and record management. A patient should not be able to reserve the same doctor's slot as someone else, and a doctor should only be able to write reports for patients they actually saw.

MediSync addresses these problems with:

- A patient dashboard for choosing a doctor specialty, seeing consultation fees, finding an available time, and managing appointments.
- Razorpay Test Mode checkout for paid appointments. An appointment is confirmed only after the backend verifies the payment.
- Doctor and patient dashboards that share appointment-linked records while enforcing role and appointment ownership.
- An admin dashboard for provisioning and enabling or disabling patient and doctor accounts.

MediSync is a software demonstration, not a medical device or a substitute for clinical judgment. Demo accounts and seeded records are synthetic.

## Main workflows

### Patient

1. Register or sign in.
2. Select a doctor by specialty and consultation fee.
3. Choose an available 30-minute appointment slot.
4. Pay through Razorpay Checkout when the appointment has a fee.
5. View the appointment after the backend verifies the payment, and view reports added by the assigned doctor.

Failed or abandoned checkout does not create a paid appointment. A pending checkout reserves its slot for up to 10 minutes. A zero-fee appointment does not require payment. Cancelling a paid appointment does not automatically issue a refund.

### Doctor

1. View appointments assigned to the signed-in doctor.
2. Mark an appointment complete after its scheduled 30-minute duration.
3. Write or update the report linked to that appointment.

The backend checks doctor identity, appointment ownership, completion status, and timing before accepting a report.

### Hospital administrator

An authorized administrator can list patient and doctor accounts, create accounts, and enable or disable them. Public registration creates patient accounts only.

## Technology

| Area | Technology |
|---|---|
| Frontend | React 19, JavaScript ES modules, CSS |
| Frontend tooling | Vite 7 |
| Backend | Node.js, Express 5, JavaScript ES modules |
| API validation | Zod |
| Database and data models | MongoDB with Mongoose 8 |
| Authentication | JWT access and refresh tokens in HttpOnly cookies; bcrypt password hashing |
| Payment processing | Razorpay Checkout and server-side order/payment verification |
| HTTP security | Helmet, role-based authorization, request validation, and rate limits |
| Automated checks | Node.js test runner and Vite production build |

## Architecture

The repository root contains separate backend and frontend applications:

```text
backend/
  src/
    config/       Environment, MongoDB, and Razorpay setup
    controllers/  HTTP request and response handlers
    middleware/   Authentication, authorization, validation, and errors
    models/       Mongoose schemas and database indexes
    routes/       Versioned API endpoints
    services/     Appointment, payment, account, and record workflows
    utils/        Shared errors, token, and signature helpers
  docs/           API, architecture, data model, and scope documentation
  test/           Backend tests
frontend/
  src/            React dashboard, API client, and styles
```

The API is mounted under `/api/v1`. MongoDB stores users, appointments, health records, refresh tokens, and appointment payment reservations in separate collections. Appointments and health records reference their patient and doctor users; user virtuals populate these related records without copying them into user documents.

The backend is authoritative for sensitive decisions:

- Appointment fees are read from the stored doctor account, not from a client-supplied amount.
- Unique database indexes prevent two active appointments or pending payment reservations from claiming the same doctor and time.
- Razorpay payment signatures are checked server-side, payment details are fetched from Razorpay, and an authorized payment is captured before a paid appointment is created.
- If a captured payment cannot be matched to a valid reservation, the backend requests a refund rather than confirming an appointment.
- Only the doctor assigned to a completed appointment can write or update its report. Patients can view their own records but cannot modify or delete them.
- Authentication tokens are stored in HttpOnly cookies and are not exposed to frontend JavaScript.

## Deploy on Vercel and Render

The frontend is hosted on Vercel and the API on Render. Configure the Vercel project with `frontend` as its root directory, `npm run build` as its build command, and `dist` as its output directory. The production API URL is set in `frontend/.env.production`:

```text
VITE_API_URL=https://medisync-1-ewin.onrender.com/api/v1
```

The Render service requires `NODE_ENV=production`, `MONGODB_URI`, and a private, randomly generated `JWT_ACCESS_SECRET` of at least 32 characters. Keep these and Razorpay credentials in Render's environment settings, not in frontend variables or source control. The `render.yaml` blueprint generates the JWT secret and leaves database/payment secrets for manual configuration. When changing a deployed service's environment, apply the blueprint or update its Render environment and redeploy.

The frontend sends cookies with `credentials: 'include'`. Production auth cookies are `HttpOnly; Secure; SameSite=None`. CORS is disabled in this deployment, so a browser cannot call the separate Render API origin from Vercel; API calls require a same-origin proxy. This also avoids third-party-cookie restrictions.

The frontend's production API URL is set in `frontend/.env.production`. Because it points directly at Render while CORS is disabled, deploy a same-origin API proxy before expecting browser login or session restoration to work.

Create a MongoDB Atlas database and user if you do not already have one. Add the Render service’s outbound IP addresses to Atlas network access where supported; for a demo, a broader allow-list may be required, but use a strong unique database password. Razorpay Test Mode supports testing only; configure production payment credentials only when ready to accept real payments. Render’s free service may sleep when idle, so its first request after inactivity can take longer.

## Run locally

### Requirements

- Node.js and npm
- A MongoDB database
- Razorpay Test Mode credentials to exercise paid appointment checkout

### Backend

From `backend`, install dependencies and create a local `.env` file:

```powershell
npm install
```

Configure the backend environment with the following values:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_ACCESS_SECRET=replace-with-a-random-secret-at-least-32-characters
RAZORPAY_KEY_ID=your-razorpay-test-key-id
RAZORPAY_KEY_SECRET=your-razorpay-test-key-secret
```

Keep `.env` and all credentials private; never commit them. For local authentication-only work, Razorpay values can be omitted, but paid appointment checkout will be unavailable until valid Test Mode keys are configured.

Start the API:

```powershell
npm run dev
```

The API health endpoint is `http://localhost:5000/api/v1/health`.

### Seed synthetic demo accounts

In another PowerShell terminal, from `backend`, set a demo password and run the idempotent development seeder:

```powershell
$env:SEED_DEMO_DATA = "true"
$env:SEED_DEMO_PASSWORD = "choose-a-demo-password-at-least-12-characters"
npm run seed
Remove-Item Env:\SEED_DEMO_DATA
Remove-Item Env:\SEED_DEMO_PASSWORD
```

The seeded patient and doctor accounts use the supplied password when first created. See [`frontend/README.md`](./frontend/README.md) for demo account emails and optional administrator-password setup. The seeder refuses to run in production.

### Frontend

From `frontend`:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`. To use another API URL, set `VITE_API_URL`; the default is `http://localhost:5000/api/v1`. A separate local API origin is subject to browser CORS enforcement.

## Tests and checks

Run backend syntax checks and tests from `backend`:

```powershell
npm run check
npm test
```

Build the frontend from `frontend`:

```powershell
npm run build
```

## Further documentation

- [Frontend setup and demo accounts](./frontend/README.md)
- [Backend API reference](./backend/docs/api.md)
- [Architecture](./backend/docs/architecture.md)
- [Database design](./backend/docs/database-design.md)
- [Feature scope](./backend/docs/feature-scope.md)

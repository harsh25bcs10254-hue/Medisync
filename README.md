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
| HTTP security | Helmet, CORS allow-list, role-based authorization, request validation, and rate limits |
| Automated checks | Node.js test runner and Vite production build |

## Architecture

The project is in [`medisync/`](./medisync/), with separate backend and frontend applications:

```text
medisync/
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

## Deploy on Render

The repository includes a Render Blueprint at [`render.yaml`](./render.yaml) that creates the API and static frontend together.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/harsh25bcs10254-hue/Medisync)

1. Push this repository to GitHub.
2. Create a MongoDB Atlas database and database user. Copy the application connection string; URL-encode any special characters in the database password.
3. In Render, choose **New → Blueprint**, connect this GitHub repository, and select the `main` branch.
4. When prompted, provide `MONGODB_URI` and your Razorpay **Test Mode** `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Render generates the JWT secret.
5. Wait for both services to deploy. Open `https://medisync-web.onrender.com`; check the API at `https://medisync-api.onrender.com/api/v1/health`.

The Blueprint configures the frontend API URL and the backend's allowed frontend origin for those service names. If Render assigns different service URLs, update `VITE_API_URL` on `medisync-web` and `CLIENT_ORIGIN` on `medisync-api` to match, then redeploy both services.

For Atlas connectivity, add the Render service's outbound IP addresses to the Atlas network access list when using a plan with stable outbound IPs. For a quick demo without stable outbound IPs, Atlas may require a broader IP allow-list; use a strong unique database password and restrict access where possible. Do not commit Atlas or Razorpay credentials. Razorpay Test Mode supports testing only; configure production payment credentials only when you are ready to accept real payments.

The free Render web service may sleep when idle, so the first API request after inactivity can take longer. The frontend is a static site and remains available.

## Run locally

### Requirements

- Node.js and npm
- A MongoDB database
- Razorpay Test Mode credentials to exercise paid appointment checkout

### Backend

From `medisync/backend`, install dependencies and create a local `.env` file:

```powershell
npm install
```

Configure the backend environment with the following values:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=your-mongodb-connection-string
CLIENT_ORIGIN=http://localhost:5173
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

In another PowerShell terminal, from `medisync/backend`, set a demo password and run the idempotent development seeder:

```powershell
$env:SEED_DEMO_DATA = "true"
$env:SEED_DEMO_PASSWORD = "choose-a-demo-password-at-least-12-characters"
npm run seed
Remove-Item Env:\SEED_DEMO_DATA
Remove-Item Env:\SEED_DEMO_PASSWORD
```

The seeded patient and doctor accounts use the supplied password when first created. See [`medisync/frontend/README.md`](./medisync/frontend/README.md) for demo account emails and optional administrator-password setup. The seeder refuses to run in production.

### Frontend

From `medisync/frontend`:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`. To use another API URL, set `VITE_API_URL`; the default is `http://localhost:5000/api/v1`. The backend development configuration allows the equivalent `localhost` and `127.0.0.1` origins on the same port.

## Tests and checks

Run backend syntax checks and tests from `medisync/backend`:

```powershell
npm run check
npm test
```

Build the frontend from `medisync/frontend`:

```powershell
npm run build
```

## Further documentation

- [Frontend setup and demo accounts](./medisync/frontend/README.md)
- [Backend API reference](./medisync/backend/docs/api.md)
- [Architecture](./medisync/backend/docs/architecture.md)
- [Database design](./medisync/backend/docs/database-design.md)
- [Feature scope](./medisync/backend/docs/feature-scope.md)

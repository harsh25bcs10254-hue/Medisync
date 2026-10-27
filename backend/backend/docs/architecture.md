# MediSync architecture

The backend uses a conventional MVC layout with a small service layer for business logic:

- `routes/`: API endpoint definitions
- `middleware/`: JWT authentication, authorization, validation, rate limits, and error handling
- `controllers/`: HTTP request and response handling
- `services/`: reusable business rules and cross-model workflows
- `models/`: Mongoose schemas and indexes
- `config/`: environment, database, and external-service configuration
- `utils/`: reusable helpers and token generation

The React frontend is in `../frontend` and uses credentialed requests with the backend's HttpOnly authentication cookies. API routes are versioned under `/api/v1`.

Patient-owned appointments and doctor-authored health records are stored in separate MongoDB collections and reference users by ObjectId. The user schema exposes virtual populated relationships for patient and doctor appointments and for patient-owned and doctor-authored health records, so these values are fetched from the related collections without duplicating them in user documents. Service methods scope operations to the authenticated patient or the doctor assigned to an appointment. Only the assigned doctor may complete an appointment after its scheduled time and create or update its linked health record. Patients can view but cannot modify or delete records. Historical patient-entered notes remain read-only for compatibility.

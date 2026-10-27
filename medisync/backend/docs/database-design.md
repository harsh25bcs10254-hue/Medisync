# Database design (initial)

Implemented models:

- `User`: account identity, role, active status and bcrypt password hash.
- `RefreshToken`: hashed opaque refresh tokens, expiry, token family, revocation and replacement metadata.

Planned models, to be added as workflows are implemented: Patient, Doctor, Department, DoctorSchedule, Appointment, HealthPackage, PackagePurchase, Payment, Refund, MedicalRecord, Prescription, LabOrder, Notification and AuditLog.

# SaludPlus

REST API for the **SaludPlus** medical clinic network, built with a hybrid persistence architecture:

- **PostgreSQL (Supabase)** → Structured data with strong relational integrity  
  (patients, doctors, insurers, treatments, appointments).
- **MongoDB Atlas** → Patient medical histories as documents, optimized for fast reads.

The project loads data from a CSV file into both databases, exposes REST endpoints, and supports fully resetting and rebuilding the schema and data.

---

## 1. General Overview

### Features

- Relational schema in 3NF (patients, doctors, insurers, treatments, appointments).
- MongoDB `patienthistories` collection with embedded appointments.
- Bulk migration from CSV (deduplication + normalization).
- REST API with endpoints for:
  - Full CRUD for doctors, patients, treatments, and insurers.
  - Appointment creation synchronized between PostgreSQL and MongoDB.
  - Revenue report by insurance provider.
  - Patient medical history.
- **Full reset script** (drops SQL tables and MongoDB collection).
- Idempotent migration: can be run multiple times without duplicating data.
- Data status endpoint (`/api/status`) to check whether the schema is initialized and whether records exist.

### Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 4.x
- **Relational DB:** PostgreSQL (Supabase)
- **Document DB:** MongoDB Atlas
- **Language:** JavaScript (ES6+)
- **Package manager:** npm

---

## 2. Architecture Decisions

### Why PostgreSQL (Supabase)?

- Strong **referential integrity** (foreign keys between patients, doctors, insurers, treatments, and appointments).
- **ACID guarantees** for financial data (`amount_paid`, `treatment.cost`).
- **Efficient aggregations** for reports (revenue by insurer, date range filters).

### Why MongoDB Atlas?

- Medical histories are read as a **single complete document** (all appointments at once).
- Embedded appointments avoid JOINs and reduce latency for history queries.
- The schema can evolve freely (extra fields, notes, attachments) without migrations.

### SQL Normalization (1NF → 3NF)

- **1NF:** Each column holds atomic values; no repeating groups.
- **2NF:** All non-key attributes depend on the full primary key.
- **3NF:** No transitive dependencies:
  - Treatment data (`code`, `description`, `cost`) lives in `treatments`.
  - Insurer data (`name`, `coverage_percentage`) lives in `insurances`.
  - Appointments reference these entities only via foreign keys.

### Embedded vs. Referenced in MongoDB

Each `patienthistories` document contains:
- `patientEmail`, `patientName`
- `appointments[]` (embedded subdocuments)

This strategy was chosen because:
- History is always retrieved by **patient email**.
- The number of appointments per patient is manageable.
- Embedding enables **single-document reads** and simpler queries.

---

## 3. Database Schemas

### PostgreSQL Schema (Supabase)

**Main tables:**

`patients`
- `id` (PK), `name`, `email` (UNIQUE), `phone`, `address`, `created_at`

`doctors`
- `id` (PK), `name`, `email` (UNIQUE), `specialty`, `created_at`

`insurances`
- `id` (PK), `name` (UNIQUE), `coverage_percentage`, `created_at`

`treatments`
- `id` (PK), `code` (UNIQUE), `description`, `cost`, `created_at`

`appointments`
- `id` (PK), `appointment_id` (UNIQUE), `appointment_date`, `patient_id` (FK), `doctor_id` (FK), `treatment_id` (FK), `insurance_id` (FK), `amount_paid`, `created_at`

**Main indexes:**
- `patients(email)`
- `doctors(email)`
- `doctors(specialty)`
- `appointments(patient_id)`
- `appointments(doctor_id)`
- `appointments(appointment_date)`
- `appointments(insurance_id)`

### MongoDB Collection: `patienthistories`

Example document:

```json
{
  "patientEmail": "valeria.g@mail.com",
  "patientName": "Valeria Gomez",
  "appointments": [
    {
      "appointmentId": "APT-1001",
      "date": "2024-01-07",
      "doctorName": "Dr. Carlos Ruiz",
      "doctorEmail": "c.ruiz@saludplus.com",
      "specialty": "Cardiology",
      "treatmentCode": "TRT-007",
      "treatmentDescription": "Skin Treatment",
      "treatmentCost": 200000,
      "insuranceProvider": "ProteccionMedica",
      "coveragePercentage": 60,
      "amountPaid": 80000
    }
  ]
}
```

Index: `patientEmail` (unique).

---

## 4. Requirements

### Common Requirements

- Node.js 18+ and npm
- Supabase project with a PostgreSQL connection string
- MongoDB Atlas cluster with a connection string (Node.js driver) and IP access configured

### CSV File

- Name: `simulacro_saludplus_data.csv`
- Required location: `./data/simulacro_saludplus_data.csv`

---

## 5. Setup Instructions

### 5.1 Clone & Install

```bash
git clone https://github.com/maryhug/saludplus-api.git
cd saludplus-api
npm install
```

### 5.2 Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```text
PORT=3000

# PostgreSQL (Supabase)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/postgres

# MongoDB Atlas
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net
MONGODB_DB=saludplus

# CSV
SIMULACRO_CSV_PATH=./data/simulacro_saludplus_data.csv
```

### 5.3 Place the CSV

```bash
mkdir -p data
# Copy your CSV file into this folder:
# ./data/simulacro_saludplus_data.csv
```

### 5.4 MongoDB Atlas Network Access

1. Go to **Security → Network Access → IP Access List**.
2. Click **Add IP Address**.
3. Add your current IP or use `0.0.0.0/0` for testing.

---

## 6. NPM Scripts & Workflow

### 6.1 Start the Server (auto-creates schema)

```bash
npm run dev
```

This will:
- Connect to PostgreSQL (Supabase) and MongoDB.
- Run `initSchema()` to create tables and indexes if they don't exist.
- Start Express at `http://localhost:3000`.

### 6.2 Check Schema & Data Status (`/api/status`)

**GET /api/status**

Three possible responses:

**Schema NOT initialized** (need to run `npm run dev`):
```json
{
  "ok": true,
  "schemaReady": false,
  "message": "PostgreSQL schema not initialized. Run \"npm run dev\" or initSchema() first."
}
```

**Schema created but no data** (tables are empty):
```json
{
  "ok": true,
  "schemaReady": true,
  "postgres": {
    "patients": 0,
    "doctors": 0,
    "appointments": 0,
    "treatments": 0,
    "insurances": 0
  },
  "mongodb": { "histories": 0 },
  "hasData": false,
  "isEmpty": true,
  "message": "Schema is created but there is no data yet. You can run \"npm run migrate\"."
}
```

**Schema created with data loaded:**
```json
{
  "ok": true,
  "schemaReady": true,
  "postgres": { "...": "..." },
  "mongodb": { "...": "..." },
  "hasData": true,
  "isEmpty": false,
  "message": "Schema and data are present."
}
```

This endpoint helps determine whether to run `npm run dev`, `npm run migrate`, or `npm run reset`.

### 6.3 Run Migration via API (recommended)

```text
POST http://localhost:3000/api/simulacro/migrate
Content-Type: application/json

{
  "clearBefore": true
}
```

- Optionally clears existing data.
- Loads CSV into PostgreSQL and MongoDB using upserts (idempotent).

### 6.4 Run Migration via CLI (optional)

```bash
npm run migrate
```

### 6.5 Full Reset

```bash
npm run reset
```

Drops tables `appointments`, `treatments`, `patients`, `doctors`, `insurances` in PostgreSQL and the `patienthistories` collection in MongoDB.

Then to rebuild:

```bash
npm run dev
# Recreates the schema

# Then run the migration:
# POST /api/simulacro/migrate { "clearBefore": true }
```

---

## 7. API Documentation

**Base URL:** `http://localhost:3000`

---

### 7.1 Simulacro / Migration

**GET /api/simulacro**
Returns API info and a list of main endpoints.

**POST /api/simulacro/migrate**
Body: `{ "clearBefore": true }`

---

### 7.2 Data Status

**GET /api/status**

Returns:
- `schemaReady`: whether the tables exist.
- Table and history record counts.
- `hasData` and `isEmpty` to determine whether to migrate or reset.

---

### 7.3 Patients (SQL + MongoDB history)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | List all patients |
| GET | `/api/patients/:id` | Get patient by numeric ID |
| POST | `/api/patients` | Create patient (`name`, `email` required; `email` unique) |
| PUT | `/api/patients/:id` | Update patient |
| GET | `/api/patients/:email/history` | Medical history from MongoDB (appointments + summary) |

---

### 7.4 Doctors (CRUD + MongoDB sync)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctors` | List all doctors (optional `?specialty=`) |
| GET | `/api/doctors/:id` | Get doctor by ID |
| POST | `/api/doctors` | Create doctor (`name`, `email`, `specialty` required; `email` unique) |
| PUT | `/api/doctors/:id` | Update doctor and propagate name/email changes to MongoDB histories |
| DELETE | `/api/doctors/:id` | Delete doctor (only if no related appointments) |

---

### 7.5 Treatments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/treatments` | List all treatments |
| GET | `/api/treatments/:id` | Get treatment by ID |
| POST | `/api/treatments` | Create treatment (`code`, `description`, `cost`; `code` unique, `cost > 0`) |

---

### 7.6 Insurances

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/insurances` | List all insurances |
| GET | `/api/insurances/:id` | Get insurance by ID |
| POST | `/api/insurances` | Create insurance (`name`, `coverage_percentage` 0–100; `name` unique) |

---

### 7.7 Appointments (SQL + MongoDB sync)

**POST /api/appointments**

Validates required fields and foreign keys (`patient_id`, `doctor_id`, `treatment_id`, `insurance_id`), inserts the appointment into PostgreSQL, and adds a subdocument to `patienthistories.appointments` (upsert by `patientEmail`).

```json
{
  "appointment_id": "APT-9999",
  "appointment_date": "2024-05-01",
  "patient_id": 1,
  "doctor_id": 1,
  "treatment_id": 1,
  "insurance_id": 1,
  "amount_paid": 50000
}
```

---

### 7.8 Revenue Report

**GET /api/reports/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD**

Returns:
- `totalRevenue` (sum of `amount_paid`)
- `byInsurance`: total and appointment count per insurer
- `period` used for filtering

```json
{
  "ok": true,
  "report": {
    "totalRevenue": 50000000,
    "byInsurance": [
      {
        "insuranceName": "ProteccionMedica",
        "totalAmount": 20000000,
        "appointmentCount": 150
      }
    ],
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-03-31"
    }
  }
}
```

---

## 8. Suggested Postman Collection

**Environment variable:** `baseUrl = http://localhost:3000`

Suggested requests:
- `GET {{baseUrl}}/api/status`
- `GET {{baseUrl}}/api/simulacro`
- `POST {{baseUrl}}/api/simulacro/migrate`
- `GET {{baseUrl}}/api/patients`
- `GET {{baseUrl}}/api/patients/:id`
- `POST {{baseUrl}}/api/patients`
- `PUT {{baseUrl}}/api/patients/:id`
- `GET {{baseUrl}}/api/patients/:email/history`
- `GET {{baseUrl}}/api/doctors`
- `GET {{baseUrl}}/api/doctors/:id`
- `POST {{baseUrl}}/api/doctors`
- `PUT {{baseUrl}}/api/doctors/:id`
- `DELETE {{baseUrl}}/api/doctors/:id`
- `GET {{baseUrl}}/api/treatments`
- `GET {{baseUrl}}/api/treatments/:id`
- `POST {{baseUrl}}/api/treatments`
- `GET {{baseUrl}}/api/insurances`
- `GET {{baseUrl}}/api/insurances/:id`
- `POST {{baseUrl}}/api/insurances`
- `POST {{baseUrl}}/api/appointments`
- `GET {{baseUrl}}/api/reports/revenue`
- `GET {{baseUrl}}/api/reports/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

---

## 9. Getting Started from Scratch (For the Instructor)

1. Clone the repo and install dependencies (`npm install`).
2. Create `.env` from `.env.example` and configure Supabase, MongoDB, and the CSV path.
3. Copy the CSV to `./data/simulacro_saludplus_data.csv`.
4. Configure IP access in MongoDB Atlas.
5. Run:

```bash
npm run dev
```

6. Check `GET /api/status`:
  - If `schemaReady: false` → verify `.env` / PostgreSQL connection.
  - If `schemaReady: true` and `isEmpty: true` → run the migration.

7. Run the migration:

```text
POST /api/simulacro/migrate
{
  "clearBefore": true
}
```

8. Check `GET /api/status` again to verify record counts.
9. Test the endpoints from Section 7 (patients, doctors, histories, reports).

To fully reset and start over:

```bash
npm run reset
npm run dev
# POST /api/simulacro/migrate { "clearBefore": true }
```

---

## 10. Notes & Best Practices

- The `.env` file is **never** committed to Git (listed in `.gitignore`).
- All operations use `async/await` and return appropriate HTTP status codes (`400`, `404`, `500`…).
- SQL migration and CSV loading are **idempotent** — re-running will not duplicate patients, doctors, insurers, treatments, or appointments.
- MongoDB uses `findOneAndUpdate` with `upsert` to keep patient histories in sync with new appointments.
# SaludPlus Hybrid Persistence API

API REST para la red de clínicas médicas **SaludPlus**, con arquitectura de persistencia híbrida:

- **PostgreSQL (Supabase)** → Datos estructurados con relaciones fuertes  
  (pacientes, médicos, aseguradoras, tratamientos, citas).
- **MongoDB Atlas** → Historias clínicas de pacientes en documentos, optimizadas para lecturas rápidas.

El proyecto carga datos desde un archivo CSV en ambas bases de datos, expone endpoints REST y permite reiniciar y reconstruir completamente el esquema y los datos.

---

## 1. Descripción General

### Funcionalidades

- Esquema relacional en 3FN (pacientes, médicos, aseguradoras, tratamientos, citas).
- Colección MongoDB `patient_histories` con citas embebidas.
- Migración masiva desde CSV (deduplicación + normalización).
- API REST con endpoints para:
    - CRUD de médicos (lectura/actualización).
    - Reporte de ingresos por aseguradora.
    - Historia clínica de pacientes.
- **Script de reset completo** (elimina tablas SQL y colección MongoDB).
- Migración idempotente: se puede ejecutar múltiples veces sin duplicar datos.

### Stack Tecnológico

- **Runtime:** Node.js 18+
- **Framework:** Express 4.x
- **BD Relacional:** PostgreSQL (Supabase)
- **BD Documental:** MongoDB Atlas
- **Lenguaje:** JavaScript (ES6+)
- **Gestor de paquetes:** npm

---

## 2. Decisiones de Arquitectura

### ¿Por qué PostgreSQL (Supabase)?

- **Integridad referencial** sólida (claves foráneas entre pacientes, médicos, aseguradoras, tratamientos y citas).
- Garantías **ACID** para datos financieros (`amount_paid`, `treatment.cost`).
- **Agregaciones eficientes** para reportes (ingresos por aseguradora, filtros por rango de fechas).

### ¿Por qué MongoDB Atlas?

- Las historias clínicas se leen como un **documento completo** (todas las citas a la vez).
- Las citas embebidas evitan JOINs y reducen la latencia en consultas de historial.
- El esquema puede evolucionar (campos extra, notas, adjuntos) sin migraciones.

### Normalización SQL (1FN → 3FN)

- **1FN:** Cada columna contiene valores atómicos; sin grupos repetidos.
- **2FN:** Todos los atributos no clave dependen de la clave primaria completa.
- **3FN:** Sin dependencias transitivas:
    - Información de tratamientos (`code`, `description`, `cost`) vive en `treatments`.
    - Información de aseguradoras (`name`, `coverage_percentage`) vive en `insurances`.
    - Las citas solo referencian estas entidades mediante claves foráneas.

### Embebido vs. Referenciado en MongoDB

- Cada documento `patient_histories` contiene:
    - `patientEmail`, `patientName`
    - `appointments[]` (subdocumentos embebidos)
- Se eligió esta estrategia porque:
    - El historial siempre se recupera por **email del paciente**.
    - La cantidad de citas por paciente es manejable.
    - El embebido permite **lecturas de un solo documento** y consultas más simples.

---

## 3. Esquemas de Base de Datos

### Esquema PostgreSQL (Supabase)

```text
patients
  id (PK)
  name
  email (UNIQUE)
  phone
  address
  created_at

doctors
  id (PK)
  name
  email (UNIQUE)
  specialty
  created_at

insurances
  id (PK)
  name (UNIQUE)
  coverage_percentage
  created_at

treatments
  id (PK)
  code (UNIQUE)
  description
  cost
  created_at

appointments
  id (PK)
  appointment_id (UNIQUE)
  appointment_date
  patient_id   (FK → patients.id)
  doctor_id    (FK → doctors.id)
  treatment_id (FK → treatments.id)
  insurance_id (FK → insurances.id)
  amount_paid
  created_at
```

**Índices:**
- `patients(email)`
- `doctors(email)`
- `doctors(specialty)`
- `appointments(patient_id)`
- `appointments(doctor_id)`
- `appointments(appointment_date)`
- `appointments(insurance_id)`
- `appointments(treatment_id)`

### Colección MongoDB: `patienthistories`

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

Índice: `patientEmail` (único).

---

## 4. Requisitos

### Requisitos Comunes (Windows y Linux)

- Node.js 18+
- npm
- Proyecto en Supabase con:
    - Cadena de conexión a la base de datos (URI de PostgreSQL)
- Clúster en MongoDB Atlas con:
    - Cadena de conexión (Driver: Node.js)
    - Acceso por IP configurado

### Archivo CSV

- Nombre: `simulacro_saludplus_data.csv`
- Ubicación requerida: `./data/simulacro_saludplus_data.csv`

---

## 5. Instrucciones de Configuración

### 5.1 Clonar e Instalar

```bash
git clone https://github.com/TU_USUARIO/saludplus-api.git
cd saludplus-api
npm install
```

### 5.2 Variables de Entorno

Crear `.env` a partir del ejemplo:

```bash
cp .env.example .env
```

Editar `.env`:

```text
PORT=3000

# URI de PostgreSQL en Supabase (Configuración → Base de datos → Cadena de conexión → URI)
DATABASE_URL=postgresql://USUARIO:CONTRASEÑA@HOST:PUERTO/postgres

# URI de MongoDB Atlas (Conectar → Drivers → Copiar cadena de conexión)
MONGODB_URI=mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net
MONGODB_DB=saludplus

# Ruta del CSV
SIMULACRO_CSV_PATH=./data/simulacro_saludplus_data.csv
DATA_DIR=./data
```

### 5.3 Colocar el CSV

```bash
mkdir -p data
# Copia tu archivo CSV en esta carpeta y renómbralo:
# data/simulacro_saludplus_data.csv
```

---

## 6. MongoDB Atlas: Acceso de Red

Para permitir la conexión desde este proyecto:

1. Abre tu proyecto en MongoDB Atlas.
2. Ve a **Security → Network Access → IP Access List**.
3. Haz clic en **Add IP Address**.
4. Para desarrollo, puedes:
    - Usar `0.0.0.0/0` (Permitir acceso desde cualquier lugar), o
    - Usar **Add current IP address**.
5. Confirma y espera 1–2 minutos.

---

## 7. Scripts NPM (Flujo de Trabajo)

### 7.1 Iniciar el Servidor (crea el esquema automáticamente)

```bash
npm run dev
```

- Se conecta a Supabase y MongoDB.
- Ejecuta la creación del esquema SQL (`initSchema()`).
- Inicia Express en `http://localhost:3000`.

### 7.2 Ejecutar Migración vía API (recomendado)

Usando Postman o cualquier cliente REST:

```text
POST http://localhost:3000/api/simulacro/migrate
Content-Type: application/json

{
  "clearBefore": true
}
```

Respuesta de ejemplo:

```json
{
  "ok": true,
  "message": "Migration completed successfully",
  "result": {
    "patients": 10,
    "doctors": 6,
    "insurances": 4,
    "treatments": 8,
    "appointments": 100,
    "histories": 10,
    "csvPath": "./data/simulacro_saludplus_data.csv"
  }
}
```

### 7.3 Ejecutar Migración vía CLI (opcional)

```bash
npm run migrate
```

- Se conecta a ambas bases de datos.
- Asegura que el esquema exista.
- Limpia los datos (con `clearBefore: true` dentro del script).
- Carga el CSV en ambas bases de datos.

---

## 8. Script de Reset Completo (Eliminar Todo)

Para limpiar completamente ambas bases de datos (tablas + colección) y empezar desde cero:

```bash
npm run reset
```

Este script:

- Se conecta a MongoDB y Supabase.
- Elimina las tablas de PostgreSQL en orden seguro (respetando FK):
    - `appointments`, `treatments`, `patients`, `doctors`, `insurances`.
- Elimina la colección MongoDB `patienthistories`.

Después del reset:

```bash
npm run dev           # Recrea el esquema (tablas) automáticamente
# Luego ejecuta la migración nuevamente:
# POST /api/simulacro/migrate con {"clearBefore": true}
```

---

## 9. Documentación de la API

**URL Base:**

```
http://localhost:3000
```

### 9.1 Simulacro / Migración

**GET /api/simulacro**  
Retorna información de la API y los endpoints disponibles.

**POST /api/simulacro/migrate**  
Cuerpo:

```json
{
  "clearBefore": true
}
```

Comportamiento:
- Opcionalmente limpia los datos existentes.
- Deduplica pacientes, médicos, aseguradoras y tratamientos.
- Inserta citas con las FK correspondientes.
- Construye/actualiza `patienthistories` en MongoDB.

---

### 9.2 Médicos

**GET /api/doctors**  
Parámetros de consulta:
- `specialty` (opcional, filtro sin distinción de mayúsculas/minúsculas).

Respuesta:

```json
{
  "ok": true,
  "doctors": [
    {
      "id": 1,
      "name": "Dr. Carlos Ruiz",
      "email": "c.ruiz@saludplus.com",
      "specialty": "Cardiology",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**GET /api/doctors/:id**  
Retorna `200` con los datos del médico, o `404` si no existe.

**PUT /api/doctors/:id**  
Cuerpo:

```json
{
  "name": "Dr. Carlos Ruiz Actualizado",
  "email": "c.ruiz.nuevo@saludplus.com",
  "specialty": "Cardiology"
}
```

Comportamiento:
- Valida que el email sea único.
- Actualiza el médico en PostgreSQL.
- Propaga los cambios de nombre/email a `patienthistories.appointments` en MongoDB.

---

### 9.3 Reporte de Ingresos

**GET /api/reports/revenue**  
Parámetros de consulta (opcionales):
- `startDate` (YYYY-MM-DD)
- `endDate` (YYYY-MM-DD)

Respuesta:

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
      "endDate": "2024-12-31"
    }
  }
}
```

---

### 9.4 Historia Clínica del Paciente

**GET /api/patients/:email/history**  
Ejemplo:

```
GET /api/patients/valeria.g@mail.com/history
```

Respuesta:

```json
{
  "ok": true,
  "patient": {
    "email": "valeria.g@mail.com",
    "name": "Valeria Gomez"
  },
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
  ],
  "summary": {
    "totalAppointments": 5,
    "totalSpent": 500000,
    "mostFrequentSpecialty": "Cardiology"
  }
}
```

Retorna `404` si el paciente no existe.

---

## 10. Colección de Postman (Sugerida)

Crea una colección en Postman llamada **SaludPlus API** con las siguientes solicitudes:

- `GET  {{baseUrl}}/api/simulacro`
- `POST {{baseUrl}}/api/simulacro/migrate`
- `GET  {{baseUrl}}/api/doctors`
- `GET  {{baseUrl}}/api/doctors/:id`
- `PUT  {{baseUrl}}/api/doctors/:id`
- `GET  {{baseUrl}}/api/reports/revenue`
- `GET  {{baseUrl}}/api/reports/revenue?startDate=...&endDate=...`
- `GET  {{baseUrl}}/api/patients/:email/history`

Variables de entorno:

```text
baseUrl      = http://localhost:3000
patientEmail = valeria.g@mail.com
```

---

## 11. Cómo Comenzar desde Cero (Para el Docente)

1. Clona el repositorio e instala las dependencias.
2. Crea el archivo `.env` a partir de `.env.example` y completa las credenciales de Supabase y MongoDB.
3. Asegúrate de que el archivo CSV esté en `./data/simulacro_saludplus_data.csv`.
4. Permite tu IP o `0.0.0.0/0` en **MongoDB Atlas Network Access**.
5. Ejecuta:

```bash
npm run dev
```

Las tablas e índices se crean automáticamente en Supabase.

6. Ejecuta la migración (vía Postman o CLI):

```text
POST /api/simulacro/migrate  { "clearBefore": true }
```

7. Usa los endpoints de la API o los dashboards (Supabase / Atlas) para inspeccionar los datos.

Para limpiar completamente ambas bases de datos y reiniciar:

```bash
npm run reset    # Elimina todas las tablas y la colección MongoDB
npm run dev      # Recrea el esquema
# POST /api/simulacro/migrate   # Carga los datos nuevamente
```

---

## 12. Notas y Buenas Prácticas

- El archivo `.env` **nunca** se sube a Git (ver `.gitignore`).
- Todas las operaciones de escritura usan `async/await` y manejan errores con los códigos de estado HTTP apropiados.
- Las migraciones SQL y el procesamiento del CSV están diseñados para ser **idempotentes**:
    - Volver a ejecutar la migración **no** duplicará pacientes, médicos, aseguradoras, tratamientos ni citas.
- MongoDB utiliza `findOneAndUpdate` con `upsert` para mantener las historias clínicas sincronizadas.
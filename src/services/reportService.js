// src/services/reportService.js

// Importa la función query para ejecutar consultas agregadas en PostgreSQL.
const { query } = require('../config/postgres');

// Genera un reporte de ingresos totales y por aseguradora, con filtro opcional de fechas.
const getRevenueReport = async ({ startDate, endDate } = {}) => {
    const params = [];
    let whereClause = '';

    // Construye dinámicamente el WHERE según los parámetros recibidos.
    if (startDate && endDate) {
        whereClause = 'WHERE a.appointment_date BETWEEN $1 AND $2';
        params.push(startDate, endDate);
    } else if (startDate) {
        whereClause = 'WHERE a.appointment_date >= $1';
        params.push(startDate);
    } else if (endDate) {
        whereClause = 'WHERE a.appointment_date <= $1';
        params.push(endDate);
    }

    // Consulta 1: total de ingresos (suma de amount_paid) en el período.
    const totalSql = `
    SELECT COALESCE(SUM(a.amount_paid), 0) AS total
    FROM appointments a ${whereClause}
  `;

    // Consulta 2: ingresos agrupados por aseguradora.
    const byInsuranceSql = `
    SELECT
      COALESCE(i.name, 'SinSeguro') AS insurance_name,
      SUM(a.amount_paid)            AS total_amount,
      COUNT(a.id)                   AS appointment_count
    FROM appointments a
    LEFT JOIN insurances i ON a.insurance_id = i.id
    ${whereClause}
    GROUP BY i.name
    ORDER BY total_amount DESC
  `;

    // Ejecuta ambas consultas en paralelo para optimizar tiempo de respuesta.
    const [totalRes, byInsRes] = await Promise.all([
        query(totalSql, params),
        query(byInsuranceSql, params),
    ]);

    // Estructura de respuesta del reporte: total, detalle por aseguradora y período usado.
    return {
        totalRevenue: parseFloat(totalRes.rows[0].total),
        byInsurance: byInsRes.rows.map(r => ({
            insuranceName:    r.insurance_name,
            totalAmount:      parseFloat(r.total_amount),
            appointmentCount: parseInt(r.appointment_count),
        })),
        period: { startDate: startDate || null, endDate: endDate || null },
    };
};

// Exporta la función para ser usada en la ruta /api/reports/revenue.
module.exports = { getRevenueReport };

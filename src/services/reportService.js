const { query } = require('../config/postgres');

const getRevenueReport = async ({ startDate, endDate } = {}) => {
    const params = [];
    let whereClause = '';

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

    const totalSql = `
    SELECT COALESCE(SUM(a.amount_paid), 0) AS total
    FROM appointments a ${whereClause}
  `;

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

    const [totalRes, byInsRes] = await Promise.all([
        query(totalSql, params),
        query(byInsuranceSql, params),
    ]);

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

module.exports = { getRevenueReport };

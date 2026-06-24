const doQuery = require("../query");

async function createComplaint(
  userId,
  complaintType,
  vehicleLicensePlate,
  ownerId,
  title,
  description,
  images,
) {
  const query = `
    INSERT INTO complaints 
    (userId, complaintType, vehicleLicensePlate, ownerId, title, description, images)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  return doQuery(query, [
    userId,
    complaintType,
    vehicleLicensePlate,
    ownerId,
    title,
    description,
    images,
  ]);
}

async function getComplaintsByUserId(userId) {
  const query = `
    SELECT 
      c.complaintId,
      c.complaintType,
      c.vehicleLicensePlate,
      c.ownerId,
      c.title,
      c.description,
      c.images,
      c.status,
      c.adminNotes,
      c.createdAt,
      v.modelId,
      cm.modelName,
      cb.brandName,
      u.firstName AS ownerFirstName,
      u.lastName AS ownerLastName
    FROM complaints c
    LEFT JOIN vehicles v ON c.vehicleLicensePlate = v.licensePlate
    LEFT JOIN carModels cm ON v.modelId = cm.modelId
    LEFT JOIN carBrands cb ON cm.brandId = cb.brandId
    LEFT JOIN users u ON c.ownerId = u.userId
    WHERE c.userId = ?
    ORDER BY c.createdAt DESC
  `;

  return doQuery(query, [userId]);
}

// --- UPDATED: Added status filtering, limit, and offset ---
async function getAllComplaints(status, limit, offset) {
  let whereClause = "WHERE 1=1";
  const values = [];

  if (status && status !== "all") {
    whereClause += " AND c.status = ?";
    values.push(status);
  }

  const query = `
    SELECT 
      c.complaintId,
      c.complaintType,
      c.vehicleLicensePlate,
      c.ownerId,
      c.title,
      c.description,
      c.images,
      c.status,
      c.adminNotes,
      c.createdAt,
      v.modelId,
      cm.modelName,
      cb.brandName,
      u.firstName AS ownerFirstName,
      u.lastName AS ownerLastName,
      complainer.firstName AS complainerFirstName,
      complainer.lastName AS complainerLastName,
      complainer.email AS complainerEmail,
      complainer.phone AS complainerPhone,
      vehicleOwner.firstName AS vehicleOwnerFirstName,
      vehicleOwner.lastName AS vehicleOwnerLastName,
      vehicleOwner.email AS vehicleOwnerEmail,
      vehicleOwner.phone AS vehicleOwnerPhone
    FROM complaints c
    LEFT JOIN vehicles v ON c.vehicleLicensePlate = v.licensePlate
    LEFT JOIN carModels cm ON v.modelId = cm.modelId
    LEFT JOIN carBrands cb ON cm.brandId = cb.brandId
    LEFT JOIN users u ON c.ownerId = u.userId
    LEFT JOIN users complainer ON c.userId = complainer.userId
    LEFT JOIN users vehicleOwner ON v.ownerId = vehicleOwner.userId
    ${whereClause}
    ORDER BY c.createdAt DESC
    LIMIT ? OFFSET ?
  `;

  values.push(limit, offset);
  return doQuery(query, values);
}

//  Gets total count for pagination
async function countAllComplaints(status) {
  let whereClause = "WHERE 1=1";
  const values = [];
  if (status && status !== "all") {
    whereClause += " AND status = ?";
    values.push(status);
  }
  const result = await doQuery(
    `SELECT COUNT(*) as total FROM complaints ${whereClause}`,
    values,
  );
  return result[0].total;
}

//  Gets stats for the top cards
async function getComplaintStats() {
  const query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as review,
      SUM(CASE WHEN status = 'resolved'  THEN 1 ELSE 0 END) as resolved
    FROM complaints
  `;
  const result = await doQuery(query);
  return result[0];
}

async function updateComplaintStatus(complaintId, status, adminNotes) {
  const query = `
    UPDATE complaints 
    SET status = ?, adminNotes = ?
    WHERE complaintId = ?
  `;

  return doQuery(query, [status, adminNotes, complaintId]);
}

async function getComplaintChartData(startDate, endDate) {
  const query = `
    SELECT 
      DATE_FORMAT(createdAt, '%Y-%m') as monthKey,
      COUNT(*) as cases
    FROM complaints
    WHERE createdAt >= ? AND createdAt <= ?
    GROUP BY YEAR(createdAt), MONTH(createdAt), monthKey
    ORDER BY monthKey ASC
  `;
  return doQuery(query, [startDate, endDate]);
}

module.exports = {
  createComplaint,
  getComplaintsByUserId,
  getAllComplaints,
  countAllComplaints,
  getComplaintStats,
  updateComplaintStatus,
  getComplaintChartData,
};

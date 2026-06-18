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

async function getAllComplaints() {
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
    ORDER BY c.createdAt DESC
  `;

  return doQuery(query);
}

async function updateComplaintStatus(complaintId, status, adminNotes) {
  const query = `
    UPDATE complaints 
    SET status = ?, adminNotes = ?
    WHERE complaintId = ?
  `;

  return doQuery(query, [status, adminNotes, complaintId]);
}

module.exports = {
  createComplaint,
  getComplaintsByUserId,
  getAllComplaints,
  updateComplaintStatus,
};

const path = require("path");
const STATUS_CODE = require("../constants/statusCodes");
const { validateAuthenticatedUser } = require("../utils/validsController");
const { withTransaction } = require("../database/withTransaction");
const { getVehicleByLicensePlate } = require("../database/queries/vehicleQueries");
const { createActivity } = require("../database/queries/activityQueries");
const { createSystemHistory } = require("../database/queries/systemHistoryQueries");
const {
  createNotification,
} = require("../database/queries/notificationQueries");
const {
  ALL_DOCUMENT_TYPES,
  USER_DOCUMENT_TYPES,
  VEHICLE_DOCUMENT_TYPES,
  REJECTION_CODES,
  ALLOWED_DOCUMENT_STATUSES,
  isUserScopedDocumentType,
  isVehicleScopedDocumentType,
  validateStoredDocumentFile,
  deletePrivateDocumentFile,
  absolutePrivatePath,
} = require("../utils/documentFile");
const {
  validateDocumentMetadata,
} = require("../utils/documentMetadata");
const {
  getOwnedLicensePlates,
  getDocumentById,
  getUserScopedDocuments,
  getVehicleScopedDocumentsForPlates,
  findUserScopedDocumentOnConnection,
  findVehicleScopedDocumentOnConnection,
  insertDocumentOnConnection,
  replaceDocumentFileOnConnection,
  getAdminDocuments,
  getAdminDocumentById,
  getAdminDocumentStats,
  getUserDocumentStatusSummary,
  lockDocumentByIdOnConnection,
  applyAdminReviewOnConnection,
  getVehicleForGovernmentCompare,
  getVehicleGovernmentCheck,
  getVehicleGovernmentChecksForPlates,
  upsertVehicleGovernmentCheck,
} = require("../database/queries/documentQueries");
const doQuery = require("../database/query");
const govApiService = require("../services/govApiService");

function toPublicDocument(row) {
  return {
    documentId: row.documentId,
    documentType: row.documentType,
    status: row.status,
    licensePlate: row.licensePlate == null ? null : String(row.licensePlate),
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    documentNumber: row.documentNumber,
    insuranceCompany: row.insuranceCompany,
    startDate: row.startDate,
    expirationDate: row.expirationDate,
    verificationMethod: row.verificationMethod,
    rejectionCode: row.rejectionCode,
    rejectionReasonText: row.rejectionReasonText,
    reviewedAt: row.reviewedAt,
    hasLastVerifiedFile: Boolean(row.lastVerifiedFilePath),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function emptySlot(documentType, licensePlate = null) {
  return {
    documentType,
    status: "not_uploaded",
    licensePlate,
    documentId: null,
  };
}

function canAccessDocument(sessionUser, documentRow, ownedPlates) {
  if (!sessionUser) return false;
  if (sessionUser.role === "admin") return true;
  if (isUserScopedDocumentType(documentRow.documentType)) {
    return Number(documentRow.userId) === Number(sessionUser.userId);
  }
  const plate = documentRow.licensePlate;
  return ownedPlates.some((owned) => String(owned) === String(plate));
}

async function uploadOrReplaceDocument_controller(req, res, next) {
  let storedFilename = req.file?.filename || null;
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) {
      if (storedFilename) deletePrivateDocumentFile(storedFilename);
      return;
    }

    if (!req.file) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "A document file is required.",
      });
    }

    const userId = req.session.user.userId;
    const documentType = String(req.body.documentType || "").trim();
    if (!ALL_DOCUMENT_TYPES.includes(documentType)) {
      deletePrivateDocumentFile(storedFilename);
      storedFilename = null;
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid document type.",
      });
    }

    const magic = validateStoredDocumentFile(storedFilename, req.file.mimetype);
    if (!magic.ok) {
      deletePrivateDocumentFile(storedFilename);
      storedFilename = null;
      return res.status(STATUS_CODE.BAD_REQUEST).json({ message: magic.message });
    }

    const metadataValidation = validateDocumentMetadata(documentType, req.body);
    if (!metadataValidation.ok) {
      deletePrivateDocumentFile(storedFilename);
      storedFilename = null;
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: metadataValidation.message,
        field: metadataValidation.field,
        metadataErrors: metadataValidation.errors,
      });
    }
    const {
      documentNumber,
      insuranceCompany,
      startDate,
      expirationDate,
    } = metadataValidation.metadata;

    let licensePlate = null;
    if (isVehicleScopedDocumentType(documentType)) {
      const rawPlate = String(req.body.licensePlate || "").trim();
      if (!rawPlate) {
        deletePrivateDocumentFile(storedFilename);
        storedFilename = null;
        return res.status(STATUS_CODE.BAD_REQUEST).json({
          message: "licensePlate is required for this document type.",
        });
      }
      const vehicle = await getVehicleByLicensePlate(rawPlate);
      if (!vehicle) {
        deletePrivateDocumentFile(storedFilename);
        storedFilename = null;
        return res.status(STATUS_CODE.NOT_FOUND).json({
          message: "Vehicle not found",
        });
      }
      if (Number(vehicle.ownerId) !== Number(userId)) {
        deletePrivateDocumentFile(storedFilename);
        storedFilename = null;
        return res.status(STATUS_CODE.FORBIDDEN).json({
          message: "You can only upload documents for vehicles you own.",
        });
      }
      licensePlate = vehicle.licensePlate;
    } else if (req.body.licensePlate) {
      deletePrivateDocumentFile(storedFilename);
      storedFilename = null;
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "licensePlate is not allowed for this document type.",
      });
    }

    const originalFilename = String(req.file.originalname || "document").slice(
      0,
      255,
    );

    const { savedRow, replaced, previousUnverifiedFile, obsoleteVerifiedFile } =
      await withTransaction(async (connection) => {
        const existing = isUserScopedDocumentType(documentType)
          ? await findUserScopedDocumentOnConnection(
              connection,
              userId,
              documentType,
            )
          : await findVehicleScopedDocumentOnConnection(
              connection,
              licensePlate,
              documentType,
            );

        if (!existing) {
          const insertResult = await insertDocumentOnConnection(connection, {
            userId,
            licensePlate,
            documentType,
            filePath: storedFilename,
            originalFilename,
            mimeType: magic.mimeType,
            fileSize: req.file.size,
            documentNumber,
            insuranceCompany,
            startDate,
            expirationDate,
          });
          return {
            savedRow: { documentId: insertResult.insertId },
            replaced: false,
            previousUnverifiedFile: null,
            obsoleteVerifiedFile: null,
          };
        }

        const wasVerified = existing.status === "verified";
        let lastVerifiedFilePath = existing.lastVerifiedFilePath || null;
        let lastVerifiedAt = existing.lastVerifiedAt || null;
        let previousUnverifiedFile = null;
        let obsoleteVerifiedFile = null;

        if (wasVerified) {
          if (
            existing.lastVerifiedFilePath &&
            existing.lastVerifiedFilePath !== existing.filePath
          ) {
            obsoleteVerifiedFile = existing.lastVerifiedFilePath;
          }
          lastVerifiedFilePath = existing.filePath;
          lastVerifiedAt = existing.reviewedAt || new Date();
        } else if (
          existing.filePath &&
          existing.filePath !== existing.lastVerifiedFilePath
        ) {
          previousUnverifiedFile = existing.filePath;
        }

        await replaceDocumentFileOnConnection(connection, existing.documentId, {
          filePath: storedFilename,
          originalFilename,
          mimeType: magic.mimeType,
          fileSize: req.file.size,
          documentNumber,
          insuranceCompany,
          startDate,
          expirationDate,
          lastVerifiedFilePath,
          lastVerifiedAt,
        });

        return {
          savedRow: { documentId: existing.documentId },
          replaced: true,
          previousUnverifiedFile,
          obsoleteVerifiedFile,
        };
      });

    if (previousUnverifiedFile) {
      deletePrivateDocumentFile(previousUnverifiedFile);
    }
    if (obsoleteVerifiedFile) {
      deletePrivateDocumentFile(obsoleteVerifiedFile);
    }
    storedFilename = null;

    const persisted = await getDocumentById(savedRow.documentId);
    const eventName = replaced ? "document_replaced" : "document_uploaded";
    const historyCategory = isVehicleScopedDocumentType(documentType)
      ? "vehicle"
      : "user";
    const historyEntityType = historyCategory;
    const historyEntityId = isVehicleScopedDocumentType(documentType)
      ? String(licensePlate)
      : String(persisted.documentId);

    await createActivity(
      userId,
      replaced ? "Document Replaced" : "Document Uploaded",
      `${replaced ? "Replaced" : "Uploaded"} ${documentType}`.slice(0, 255),
      persisted.documentId,
    );
    await createSystemHistory(
      userId,
      historyCategory,
      replaced ? "update" : "create",
      eventName,
      historyEntityType,
      historyEntityId,
      null,
      isVehicleScopedDocumentType(documentType) ? licensePlate : null,
      `${replaced ? "Replaced" : "Uploaded"} ${documentType}`.slice(0, 255),
    );

    try {
      const admins = await doQuery(
        "SELECT userId FROM users WHERE role = 'admin'",
      );
      const typeLabel = documentType.replace(/_/g, " ");
      const title = replaced
        ? "Document Replaced"
        : "New Document Pending Review";
      const message = replaced
        ? `A ${typeLabel} was replaced and needs review.`
        : `A ${typeLabel} was uploaded and needs review.`;
      for (const admin of admins) {
        await createNotification(
          admin.userId,
          null,
          "document_admin",
          title,
          message.slice(0, 255),
        );
      }
    } catch (notifyError) {
      console.error(
        "Failed to notify admins about document upload:",
        notifyError.message,
      );
    }

    return res.status(replaced ? STATUS_CODE.OK : STATUS_CODE.CREATED).json({
      message: replaced
        ? "Document replaced and is pending review."
        : "Document uploaded and is pending review.",
      document: toPublicDocument(persisted),
    });
  } catch (error) {
    if (storedFilename) deletePrivateDocumentFile(storedFilename);
    next(error);
  }
}

async function getMyDocuments_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const userId = req.session.user.userId;
    const ownedPlates = await getOwnedLicensePlates(userId);
    const userRows = await getUserScopedDocuments(userId);
    const vehicleRows = await getVehicleScopedDocumentsForPlates(ownedPlates);
    const govRows = await getVehicleGovernmentChecksForPlates(ownedPlates);
    const govByPlate = Object.fromEntries(
      govRows.map((row) => [String(row.licensePlate), row]),
    );

    const userByType = Object.fromEntries(
      userRows.map((row) => [row.documentType, row]),
    );
    const identity = USER_DOCUMENT_TYPES.map((type) =>
      userByType[type]
        ? toPublicDocument(userByType[type])
        : emptySlot(type),
    );

    const vehicleByPlate = {};
    for (const plate of ownedPlates) {
      vehicleByPlate[String(plate)] = {};
    }
    for (const row of vehicleRows) {
      const key = String(row.licensePlate);
      if (!vehicleByPlate[key]) vehicleByPlate[key] = {};
      vehicleByPlate[key][row.documentType] = toPublicDocument(row);
    }

    const vehicles = ownedPlates.map((plate) => {
      const key = String(plate);
      const current = vehicleByPlate[key] || {};
      const gov = govByPlate[key];
      return {
        licensePlate: key,
        documents: VEHICLE_DOCUMENT_TYPES.map((type) =>
          current[type] ? current[type] : emptySlot(type, key),
        ),
        governmentCheck: toGovernmentCheckPublic(gov),
      };
    });

    return res.status(STATUS_CODE.OK).json({
      message: "Documents fetched successfully",
      documents: [...userRows, ...vehicleRows].map(toPublicDocument),
      overview: { identity, vehicles },
    });
  } catch (error) {
    next(error);
  }
}

async function getDocumentById_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const documentId = Number(req.params.documentId);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid document ID",
      });
    }
    const row = await getDocumentById(documentId);
    if (!row) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Document not found",
      });
    }
    const ownedPlates = await getOwnedLicensePlates(req.session.user.userId);
    if (!canAccessDocument(req.session.user, row, ownedPlates)) {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "You are not allowed to view this document.",
      });
    }
    return res.status(STATUS_CODE.OK).json({
      message: "Document fetched successfully",
      document: toPublicDocument(row),
    });
  } catch (error) {
    next(error);
  }
}

async function getDocumentFile_controller(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const documentId = Number(req.params.documentId);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid document ID",
      });
    }
    const row = await getDocumentById(documentId);
    if (!row) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Document not found",
      });
    }
    const ownedPlates = await getOwnedLicensePlates(req.session.user.userId);
    if (!canAccessDocument(req.session.user, row, ownedPlates)) {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "You are not allowed to view this document.",
      });
    }
    const absolutePath = absolutePrivatePath(row.filePath);
    if (!absolutePath) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Document file not found",
      });
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", row.mimeType || "application/octet-stream");
    const downloadName = row.originalFilename || path.basename(row.filePath);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${String(downloadName).replace(/"/g, "")}"`,
    );
    return res.sendFile(absolutePath, (err) => {
      if (err && !res.headersSent) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
}

function expirationValidity(expirationDate) {
  if (!expirationDate) return "n_a";
  const value = new Date(expirationDate);
  if (Number.isNaN(value.getTime())) return "n_a";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  value.setHours(0, 0, 0, 0);
  return value >= today ? "valid" : "expired";
}

function parseJsonField(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function toJsonColumn(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseLicensePlateParam(raw) {
  const text = String(raw ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  return text;
}

function toGovernmentCheckPublic(row, { includeSnapshot = false } = {}) {
  if (!row) {
    return {
      status: "not_checked",
      checkedAt: null,
      matchedFields: [],
      mismatchedFields: [],
      displayOnly: null,
      errorMessage: null,
      governmentSource: null,
    };
  }
  const snapshot = parseJsonField(row.governmentDataSnapshot, null);
  const result = {
    status: row.status || "not_checked",
    checkedAt: row.checkedAt || null,
    matchedFields: parseJsonField(row.matchedFields, []),
    mismatchedFields: parseJsonField(row.mismatchedFields, []),
    displayOnly: snapshot?.displayOnly || null,
    errorMessage: row.errorMessage || null,
    governmentSource: row.governmentSource || null,
  };
  if (includeSnapshot) {
    result.governmentDataSnapshot = snapshot;
  }
  return result;
}

function toAdminDocument(row) {
  const publicDoc = toPublicDocument(row);
  return {
    ...publicDoc,
    userId: row.userId,
    reviewedBy: row.reviewedBy,
    account: {
      userId: row.userId,
      firstName: row.accountFirstName,
      lastName: row.accountLastName,
      email: row.accountEmail,
      phone: row.accountPhone,
      birthDate: row.accountBirthDate,
    },
    reviewer: row.reviewedBy
      ? {
          userId: row.reviewedBy,
          firstName: row.reviewerFirstName,
          lastName: row.reviewerLastName,
          email: row.reviewerEmail,
        }
      : null,
    vehicle: row.licensePlate
      ? {
          licensePlate: String(row.licensePlate),
          brandName: row.brandName || null,
          modelName: row.modelName || null,
          year: row.vehicleYear || null,
          color: row.vehicleColor || null,
          ownerId: row.vehicleOwnerId || null,
        }
      : null,
    governmentCheck: toGovernmentCheckPublic({
      status: row.governmentCheckStatus || "not_checked",
      checkedAt: row.governmentCheckedAt || null,
    }),
    expirationCheck: expirationValidity(row.expirationDate),
  };
}

function parseDocumentId(raw) {
  const documentId = Number(raw);
  if (!Number.isInteger(documentId) || documentId <= 0) return null;
  return documentId;
}

async function requireAdmin(req, res) {
  if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) {
    return false;
  }
  if (req.session.user.role !== "admin") {
    res.status(STATUS_CODE.FORBIDDEN).json({
      message: "You are not authorized to review documents",
    });
    return false;
  }
  return true;
}

async function getAdminDocuments_controller(req, res, next) {
  try {
    if (!(await requireAdmin(req, res))) return;
    const status = String(req.query.status || "all");
    if (status !== "all" && !ALLOWED_DOCUMENT_STATUSES.includes(status)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid document status filter",
      });
    }
    const documentType = req.query.documentType
      ? String(req.query.documentType).trim()
      : null;
    if (documentType && !ALL_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid document type",
      });
    }
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = (page - 1) * limit;
    const userId = req.query.userId ? Number(req.query.userId) : null;
    if (req.query.userId && (!Number.isInteger(userId) || userId <= 0)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid user ID",
      });
    }
    const licensePlate = req.query.licensePlate
      ? String(req.query.licensePlate).trim()
      : null;

    const { rows, total } = await getAdminDocuments({
      status,
      documentType,
      userId,
      licensePlate,
      limit,
      offset,
    });
    const stats = await getAdminDocumentStats();
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return res.status(STATUS_CODE.OK).json({
      message: "Documents fetched successfully",
      documents: rows.map(toAdminDocument),
      stats,
      pagination: {
        totalDocuments: total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminDocumentById_controller(req, res, next) {
  try {
    if (!(await requireAdmin(req, res))) return;
    const documentId = parseDocumentId(req.params.documentId);
    if (!documentId) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid document ID",
      });
    }
    const row = await getAdminDocumentById(documentId);
    if (!row) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Document not found",
      });
    }

    const relatedStatuses = await getUserDocumentStatusSummary(row.userId);
    const identityStatus =
      relatedStatuses.find((d) =>
        ["identity_card", "passport"].includes(d.documentType),
      )?.status || "not_uploaded";
    const driverLicenseStatus =
      relatedStatuses.find((d) => d.documentType === "driver_license")
        ?.status || "not_uploaded";

    await createSystemHistory(
      req.session.user.userId,
      "admin",
      "other",
      "document_viewed_by_admin",
      isVehicleScopedDocumentType(row.documentType) ? "vehicle" : "user",
      String(row.documentId),
      null,
      row.licensePlate || null,
      `Admin viewed document #${row.documentId}`,
    );

    const document = toAdminDocument(row);
    if (row.licensePlate) {
      const govRow = await getVehicleGovernmentCheck(row.licensePlate);
      document.governmentCheck = toGovernmentCheckPublic(govRow, {
        includeSnapshot: true,
      });
    }

    return res.status(STATUS_CODE.OK).json({
      message: "Document fetched successfully",
      document,
      related: {
        identityStatus,
        driverLicenseStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function reviewDocument(req, res, decision) {
  const documentId = parseDocumentId(req.params.documentId);
  if (!documentId) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: "Invalid document ID",
    });
  }

  let rejectionCode = null;
  let rejectionReasonText = null;
  if (decision === "rejected") {
    rejectionCode = String(req.body.rejectionCode || "").trim();
    if (!REJECTION_CODES.includes(rejectionCode)) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "A valid rejection reason is required",
      });
    }
    rejectionReasonText =
      typeof req.body.rejectionReasonText === "string"
        ? req.body.rejectionReasonText.trim()
        : "";
    if (rejectionCode === "other" && !rejectionReasonText) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Please explain the rejection reason",
      });
    }
    if (!rejectionReasonText) rejectionReasonText = null;
  }

  const adminId = req.session.user.userId;
  const result = await withTransaction(async (connection) => {
    const existing = await lockDocumentByIdOnConnection(connection, documentId);
    if (!existing) return { missing: true };
    if (existing.status !== "pending_review") {
      return { conflict: true, existing };
    }
    if (decision === "verified") {
      const metadataValidation = validateDocumentMetadata(
        existing.documentType,
        existing,
      );
      if (!metadataValidation.ok) {
        return { invalidMetadata: metadataValidation };
      }
    }
    const updateResult = await applyAdminReviewOnConnection(connection, documentId, {
      status: decision,
      verificationMethod: decision === "verified" ? "admin" : null,
      reviewedBy: adminId,
      rejectionCode,
      rejectionReasonText,
    });
    if (updateResult.affectedRows === 0) {
      const latest = await lockDocumentByIdOnConnection(connection, documentId);
      return { conflict: true, existing: latest };
    }
    return { ok: true };
  });

  if (result.missing) {
    return res.status(STATUS_CODE.NOT_FOUND).json({
      message: "Document not found",
    });
  }
  if (result.conflict) {
    const latest = await getAdminDocumentById(documentId);
    return res.status(STATUS_CODE.CONFLICT).json({
      message: "This document has already been reviewed.",
      status: latest?.status || result.existing.status,
      reviewedAt: latest?.reviewedAt || result.existing.reviewedAt,
      reviewer: latest?.reviewedBy
        ? {
            userId: latest.reviewedBy,
            firstName: latest.reviewerFirstName,
            lastName: latest.reviewerLastName,
            email: latest.reviewerEmail,
          }
        : null,
    });
  }
  if (result.invalidMetadata) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: `This document cannot be verified. ${result.invalidMetadata.message}`,
      field: result.invalidMetadata.field,
      metadataErrors: result.invalidMetadata.errors,
    });
  }

  const saved = await getAdminDocumentById(documentId);
  const eventName =
    decision === "verified" ? "document_verified" : "document_rejected";
  await createSystemHistory(
    adminId,
    "admin",
    decision === "verified" ? "approve" : "reject",
    eventName,
    isVehicleScopedDocumentType(saved.documentType) ? "vehicle" : "user",
    String(saved.documentId),
    null,
    saved.licensePlate || null,
    `Document #${saved.documentId} ${decision}`.slice(0, 255),
  );
  await createActivity(
    adminId,
    decision === "verified" ? "Document Verified" : "Document Rejected",
    `Document #${saved.documentId} ${decision}`.slice(0, 255),
    saved.documentId,
  );

  try {
    const title =
      decision === "verified" ? "Document Verified" : "Document Rejected";
    let message =
      decision === "verified"
        ? `Your ${saved.documentType.replace(/_/g, " ")} was verified.`
        : `Your ${saved.documentType.replace(/_/g, " ")} was rejected.`;
    if (decision === "rejected" && saved.rejectionReasonText) {
      message = `${message} ${saved.rejectionReasonText}`;
    }
    await createNotification(
      saved.userId,
      null,
      "document_update",
      title,
      message.slice(0, 255),
    );
  } catch (notifyError) {
    console.error("Failed to notify user about document review:", notifyError.message);
  }

  return res.status(STATUS_CODE.OK).json({
    message:
      decision === "verified"
        ? "Document verified."
        : "Document rejected.",
    document: toAdminDocument(saved),
  });
}

async function verifyDocument_controller(req, res, next) {
  try {
    if (!(await requireAdmin(req, res))) return;
    return await reviewDocument(req, res, "verified");
  } catch (error) {
    next(error);
  }
}

async function rejectDocument_controller(req, res, next) {
  try {
    if (!(await requireAdmin(req, res))) return;
    return await reviewDocument(req, res, "rejected");
  } catch (error) {
    next(error);
  }
}

async function persistGovernmentCheck(licensePlate, requestedBy, payload) {
  await upsertVehicleGovernmentCheck({
    licensePlate,
    status: payload.status,
    governmentSource: govApiService.GOV_SOURCE,
    resourceId: govApiService.GOV_VEHICLE_RESOURCE_ID,
    matchedFields: toJsonColumn(payload.matchedFields),
    mismatchedFields: toJsonColumn(payload.mismatchedFields),
    governmentDataSnapshot: toJsonColumn(payload.governmentDataSnapshot),
    errorMessage: payload.errorMessage,
    requestedBy,
  });
}

async function getVehicleGovernmentCheck_controller(req, res, next) {
  try {
    if (!(await requireAdmin(req, res))) return;
    const licensePlate = parseLicensePlateParam(req.params.licensePlate);
    if (!licensePlate) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid license plate",
      });
    }
    const vehicle = await getVehicleForGovernmentCompare(licensePlate);
    if (!vehicle) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Vehicle not found",
      });
    }
    const row = await getVehicleGovernmentCheck(licensePlate);
    return res.status(STATUS_CODE.OK).json({
      message: "Government check fetched successfully",
      licensePlate: String(vehicle.licensePlate),
      governmentCheck: toGovernmentCheckPublic(row, { includeSnapshot: true }),
    });
  } catch (error) {
    next(error);
  }
}

async function runVehicleGovernmentCheck_controller(req, res, next) {
  try {
    if (!(await requireAdmin(req, res))) return;
    const licensePlate = parseLicensePlateParam(req.params.licensePlate);
    if (!licensePlate) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid license plate",
      });
    }

    const vehicle = await getVehicleForGovernmentCompare(licensePlate);
    if (!vehicle) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Vehicle not found",
      });
    }

    const vehicleBefore = {
      year: vehicle.year,
      color: vehicle.color,
      fuelType: vehicle.fuelType,
      ownerId: vehicle.ownerId,
    };

    const lookup = await govApiService.lookupVehicleInGovIL(licensePlate);
    const payload = govApiService.buildGovernmentCheckPayload(vehicle, lookup);
    await persistGovernmentCheck(licensePlate, req.session.user.userId, payload);

    const vehicleAfter = await getVehicleForGovernmentCompare(licensePlate);
    if (
      Number(vehicleAfter.ownerId) !== Number(vehicleBefore.ownerId) ||
      String(vehicleAfter.year) !== String(vehicleBefore.year) ||
      String(vehicleAfter.color) !== String(vehicleBefore.color) ||
      String(vehicleAfter.fuelType) !== String(vehicleBefore.fuelType)
    ) {
      throw new Error("Government check must not overwrite vehicle listing data");
    }

    await createSystemHistory(
      req.session.user.userId,
      "admin",
      "other",
      "vehicle_government_check",
      "vehicle",
      String(licensePlate),
      null,
      licensePlate,
      `Government check ${payload.status} for plate ${licensePlate}`.slice(0, 255),
    );
    await createActivity(
      req.session.user.userId,
      "Government Vehicle Check",
      `Plate ${licensePlate} ${payload.status}`.slice(0, 255),
    );

    const saved = await getVehicleGovernmentCheck(licensePlate);
    return res.status(STATUS_CODE.OK).json({
      message: "Government check completed",
      licensePlate: String(licensePlate),
      governmentCheck: toGovernmentCheckPublic(saved, { includeSnapshot: true }),
    });
  } catch (error) {
    next(error);
  }
}

const MANUAL_GOVERNMENT_SOURCE = "admin_manual_override";
const MANUAL_OVERRIDE_REASON_MIN_LENGTH = 10;
const MANUAL_OVERRIDE_REASON_MAX_LENGTH = 500;

async function manuallyVerifyVehicleGovernmentCheck_controller(
  req,
  res,
  next,
) {
  try {
    if (!(await requireAdmin(req, res))) return;

    const licensePlate = parseLicensePlateParam(req.params.licensePlate);
    if (!licensePlate) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: "Invalid license plate",
      });
    }

    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (
      reason.length < MANUAL_OVERRIDE_REASON_MIN_LENGTH ||
      reason.length > MANUAL_OVERRIDE_REASON_MAX_LENGTH
    ) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({
        message: `Override reason must be between ${MANUAL_OVERRIDE_REASON_MIN_LENGTH} and ${MANUAL_OVERRIDE_REASON_MAX_LENGTH} characters.`,
      });
    }

    const vehicle = await getVehicleForGovernmentCompare(licensePlate);
    if (!vehicle) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "Vehicle not found",
      });
    }

    const previousCheck = await getVehicleGovernmentCheck(licensePlate);
    if (previousCheck?.status === "verified") {
      const alreadyManual =
        previousCheck.governmentSource === MANUAL_GOVERNMENT_SOURCE;
      return res.status(STATUS_CODE.CONFLICT).json({
        message: alreadyManual
          ? "This vehicle is already manually verified."
          : "This vehicle is already verified by the official government lookup.",
      });
    }

    const adminId = req.session.user.userId;
    const overriddenAt = new Date().toISOString();
    const previousCheckSummary = previousCheck
      ? {
          status: previousCheck.status || "not_checked",
          checkedAt: previousCheck.checkedAt || null,
          governmentSource: previousCheck.governmentSource || null,
          errorMessage: previousCheck.errorMessage || null,
        }
      : null;

    await upsertVehicleGovernmentCheck({
      licensePlate,
      status: "verified",
      governmentSource: MANUAL_GOVERNMENT_SOURCE,
      resourceId: null,
      matchedFields: toJsonColumn([]),
      mismatchedFields: toJsonColumn([]),
      governmentDataSnapshot: toJsonColumn({
        lookupStatus: "manual_override",
        manualOverride: {
          reason,
          adminUserId: adminId,
          overriddenAt,
          previousCheck: previousCheckSummary,
        },
      }),
      errorMessage: null,
      requestedBy: adminId,
    });

    const historyReason = reason.replace(/\s+/g, " ");
    await createSystemHistory(
      adminId,
      "admin",
      "approve",
      "vehicle_government_manual_override",
      "vehicle",
      String(licensePlate),
      null,
      licensePlate,
      `Manual government verification for plate ${licensePlate}. Reason: ${historyReason}`.slice(
        0,
        255,
      ),
    );
    await createActivity(
      adminId,
      "Manual Government Verification",
      `Plate ${licensePlate}. Reason: ${historyReason}`.slice(0, 255),
    );

    const saved = await getVehicleGovernmentCheck(licensePlate);
    return res.status(STATUS_CODE.OK).json({
      message: "Vehicle government verification was manually approved.",
      licensePlate: String(licensePlate),
      governmentCheck: toGovernmentCheckPublic(saved, {
        includeSnapshot: true,
      }),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadOrReplaceDocument_controller,
  getMyDocuments_controller,
  getDocumentById_controller,
  getDocumentFile_controller,
  getAdminDocuments_controller,
  getAdminDocumentById_controller,
  verifyDocument_controller,
  rejectDocument_controller,
  getVehicleGovernmentCheck_controller,
  runVehicleGovernmentCheck_controller,
  manuallyVerifyVehicleGovernmentCheck_controller,
};

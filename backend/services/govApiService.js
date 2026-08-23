const GOV_VEHICLE_RESOURCE_ID = "053cea08-09bc-40ec-8f7a-156f0677aff3";
const GOV_DATASTORE_URL = "https://data.gov.il/api/3/action/datastore_search";
const GOV_SOURCE = "data.gov.il";
const GOV_TIMEOUT_MS = 12000;

const FUEL_ALIASES = {
  petrol: ["petrol", "gasoline", "בנזין"],
  diesel: ["diesel", "סולר"],
  electric: ["electric", "חשמלי"],
  hybrid: ["hybrid", "היברידי"],
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function fuelFamily(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  for (const [family, aliases] of Object.entries(FUEL_ALIASES)) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return family;
    }
  }
  return normalized;
}

function valuesEqual(ours, government, { numeric = false, fuel = false } = {}) {
  if (fuel) return fuelFamily(ours) === fuelFamily(government);
  if (numeric) return Number(ours) === Number(government);
  return normalizeText(ours) === normalizeText(government);
}

function isBlank(value) {
  return value == null || String(value).trim() === "";
}

/**
 * Compare our vehicle row to one official data.gov.il private-vehicle record.
 * Only uses keys the live resource actually returns (inspected 2026-08-18):
 * mispar_rechev, tozeret_nm, kinuy_mishari, shnat_yitzur, tzeva_rechev,
 * sug_delek_nm, tokef_dt, misgeret, ...
 * Does not compare VIN/chassis against our DB (we have no such column).
 * Does not compare tokef_dt to vehicles.expirationDate (that field is listing expiry).
 */
function compareVehicleToGovernmentRecord(vehicle, record) {
  const comparisons = [
    {
      field: "licensePlate",
      ours: vehicle.licensePlate,
      government: record.mispar_rechev,
      numeric: true,
      required: true,
    },
    {
      field: "year",
      ours: vehicle.year,
      government: record.shnat_yitzur,
      numeric: true,
      required: true,
    },
    {
      field: "color",
      ours: vehicle.color,
      government: record.tzeva_rechev,
    },
    {
      field: "fuelType",
      ours: vehicle.fuelType,
      government: record.sug_delek_nm,
      fuel: true,
    },
    {
      field: "brandName",
      ours: vehicle.brandName,
      government: record.tozeret_nm,
    },
    {
      field: "modelName",
      ours: vehicle.modelName,
      government: record.kinuy_mishari,
    },
  ];

  const matchedFields = [];
  const mismatchedFields = [];

  for (const item of comparisons) {
    if (!item.required && (isBlank(item.ours) || isBlank(item.government))) {
      continue;
    }
    const equal = valuesEqual(item.ours, item.government, item);
    const entry = {
      field: item.field,
      ours: item.ours == null ? null : String(item.ours),
      government: item.government == null ? null : String(item.government),
    };
    if (equal) matchedFields.push(entry);
    else mismatchedFields.push(entry);
  }

  const displayOnly = {
    chassis: record.misgeret ?? null,
    registrationValidity: record.tokef_dt ?? null,
    manufacturerCode: record.tozeret_cd ?? null,
    modelCode: record.degem_nm ?? null,
  };

  const status = mismatchedFields.length ? "mismatch" : "verified";
  return { status, matchedFields, mismatchedFields, displayOnly };
}

async function lookupVehicleInGovIL(licensePlate) {
  const plate = String(licensePlate ?? "").trim();
  const numericPlate = Number(plate);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOV_TIMEOUT_MS);

  try {
    const filters = Number.isFinite(numericPlate)
      ? { mispar_rechev: numericPlate }
      : { mispar_rechev: plate };
    const url =
      `${GOV_DATASTORE_URL}` +
      `?resource_id=${GOV_VEHICLE_RESOURCE_ID}` +
      `&filters=${encodeURIComponent(JSON.stringify(filters))}` +
      `&limit=5`;

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return {
        ok: false,
        lookupStatus: "unavailable",
        records: [],
        errorMessage: `Government API HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    if (!data.success) {
      return {
        ok: false,
        lookupStatus: "error",
        records: [],
        errorMessage: "Government API returned an unsuccessful response",
      };
    }

    const records = data.result?.records || [];
    if (!records.length) {
      return {
        ok: true,
        lookupStatus: "not_found",
        records: [],
        errorMessage: null,
      };
    }

    return {
      ok: true,
      lookupStatus: "found",
      records,
      errorMessage: null,
    };
  } catch (error) {
    const timeout = error?.name === "AbortError";
    return {
      ok: false,
      lookupStatus: "unavailable",
      records: [],
      errorMessage: timeout
        ? "Government API timeout"
        : "Government API unavailable",
    };
  } finally {
    clearTimeout(timer);
  }
}

function emptyComparison(status, errorMessage = null, snapshot = null) {
  return {
    status,
    matchedFields: [],
    mismatchedFields: [],
    displayOnly: snapshot?.displayOnly || null,
    governmentDataSnapshot: snapshot,
    errorMessage,
  };
}

/**
 * Map an official lookup + our vehicle row to a vehicle_government_checks payload.
 * Never accepts a client-supplied status. verified only if the API found a record
 * and comparable fields matched.
 */
function buildGovernmentCheckPayload(vehicle, lookup) {
  if (!lookup || lookup.lookupStatus === "unavailable") {
    return emptyComparison("unavailable", lookup?.errorMessage || "Government API unavailable");
  }
  if (lookup.lookupStatus === "error") {
    return emptyComparison(
      "error",
      lookup.errorMessage || "Government API returned an unsuccessful response",
    );
  }
  if (lookup.lookupStatus === "not_found" || !lookup.records?.length) {
    return emptyComparison("not_found", null, { lookupStatus: "not_found", record: null });
  }

  const record = lookup.records[0];
  const comparison = compareVehicleToGovernmentRecord(vehicle, record);
  return {
    status: comparison.status,
    matchedFields: comparison.matchedFields,
    mismatchedFields: comparison.mismatchedFields,
    displayOnly: comparison.displayOnly,
    governmentDataSnapshot: {
      lookupStatus: "found",
      record,
      displayOnly: comparison.displayOnly,
    },
    errorMessage: null,
  };
}

module.exports = {
  GOV_VEHICLE_RESOURCE_ID,
  GOV_SOURCE,
  lookupVehicleInGovIL,
  buildGovernmentCheckPayload,
};

const RESOURCE_ID = "8f714b6f-c35c-4b40-a0e7-547b675eee0e";
const BASE_URL = "https://data.gov.il/api/3/action/datastore_search";

let cachedLocalities = null;

async function fetchAllLocalities() {
  const limit = 500;
  let offset = 0;
  let allRecords = [];

  while (true) {
    const url = new URL(BASE_URL);
    url.searchParams.set("resource_id", RESOURCE_ID);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(`Gov API error: ${response.status}`);
    }

    const records = data.result.records || [];
    allRecords = allRecords.concat(records);

    if (records.length < limit) break;
    offset += limit;
  }

  return allRecords.map((record) => ({
    id: record._id,
    code: record.city_code,
    name: record.city_name_he?.trim(),
    nameEn: record.city_name_en?.trim(),
    regionCode: record.region_code,
    regionName: record.region_name?.trim(),
    bureauCode: record.PIBA_bureau_code,
    bureauName: record.PIBA_bureau_name?.trim(),
    regionalCouncilCode: record.Regional_Council_code,
    regionalCouncilName: record.Regional_Council_name,
  }));
}

const getLocalities = async (req, res, next) => {
  try {
    // Check if we already have the data saved in memory
    if (cachedLocalities) {
      return res.json({
        success: true,
        count: cachedLocalities.length,
        source: "cache",
        data: cachedLocalities,
      });
    }

    // If no cache exists, fetch the data
    console.log("Fetching cities from Gov API for the first time...");
    const data = await fetchAllLocalities();

    // Save the data to our cache variable for next time
    cachedLocalities = data;

    res.json({
      success: true,
      count: data.length,
      source: "api",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLocalities };

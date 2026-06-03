// כאן צריך לשים את resource_id האמיתי של המשאב
const RESOURCE_ID = "8f714b6f-c35c-4b40-a0e7-547b675eee0e";
const BASE_URL = "https://data.gov.il/api/3/action/datastore_search";

async function fetchAllLocalities() {
  const limit = 500;
  let offset = 0;
  let allRecords = [];

  while (true) {
    const url = new URL(BASE_URL);
    url.searchParams.set("resource_id", RESOURCE_ID);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    console.log(url.toString());

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok || !data.success) {
      console.log(data);
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

const getCities = async (req, res, next) => {
  try {
    const data = await fetchAllLocalities();
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { getCities };

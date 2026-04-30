async function checkVehicleNumberInGovIL(licensePlate) {
  const url =
    "https://data.gov.il/api/3/action/datastore_search" +
    "?resource_id=053cea08-09bc-40ec-8f7a-156f0677aff3" +
    `&q=${licensePlate}`;

  const response = await fetch(url);
  const data = await response.json();

  return data.result.records.length > 0;
}

module.exports = {
  checkVehicleNumberInGovIL,
};

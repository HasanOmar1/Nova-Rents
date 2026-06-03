import { useEffect, useState } from "react";
import styles from "./Vehicles.module.css";
import { Search } from "lucide-react";
import VehiclesCards from "../../../components/VehiclesCards/VehiclesCards";
import { Link } from "react-router-dom";
import { useVehicleContext } from "../../../context/VehicleContext";

const tabs = ["all", "Cars", "Motorcycles", "Event Vehicle"];

const Vehicles = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [locations, setLocations] = useState([
    "All Locations",
    "Haifa",
    "Tel Aviv",
    "Nazareth",
    "Jerusalem",
  ]);
  const [sortBy, setSortBy] = useState(["price", "year"]);
  const { getAllVehicles, allVehicles } = useVehicleContext();

  console.log(allVehicles);
  useEffect(() => {
    getAllVehicles();
    console.log("asd");
  }, []);

  return (
    <div className={`${styles.Vehicles} page`}>
      <h1>Vehicles</h1>

      <div className={styles.btnsContainer}>
        <Link to={"/map"} className={styles.openMapBtn}>
          Open Map View
        </Link>
      </div>

      <div className={styles.filterContainer}>
        <div className={`${styles.vehicleTypeBtnsContainer}`}>
          {tabs.map((t) => {
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={activeTab === t ? styles.active : ""}
              >
                {t}
              </button>
            );
          })}
        </div>

        <hr />

        <div className={styles.inputsContainer}>
          <div className={styles.top}>
            <div className={styles.searchContainer}>
              <Search size={20} color="gray" className={styles.searchLogo} />
              <input
                type="text"
                placeholder="Search name or location"
                className={styles.searchNameOrLocationInput}
              />
            </div>

            <select name="location" id="location">
              {locations.map((location) => {
                return (
                  <option key={location} value={location}>
                    {location}
                  </option>
                );
              })}
            </select>

            <select name="sort" id="sort">
              {sortBy.map((sort) => {
                return (
                  <option key={sort} value={sort}>
                    Sort: {sort}
                  </option>
                );
              })}
            </select>
          </div>

          <div className={styles.bottom}>
            <input type="date" name="startDate" />
            <input type="date" name="endDate" />
          </div>
        </div>
      </div>

      <div className={styles.vehiclesCardsContainer}>
        {allVehicles.map((veh) => {
          return <VehiclesCards key={veh.id} veh={veh} />;
        })}
      </div>
    </div>
  );
};

export default Vehicles;

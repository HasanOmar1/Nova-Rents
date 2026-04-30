import { useState } from "react";
import styles from "./Vehicles.module.css";
import { Search } from "lucide-react";

const tabs = ["all", "cars", "motorcycles", "eventVehicles"];

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

  return (
    <div className={`${styles.Vehicles} page`}>
      <h1>Vehicles</h1>

      <div className={styles.btnsContainer}>
        <button className={styles.openMapBtn}>Open Map View</button>
      </div>

      <div className={styles.filterContainer}>
        <div className={`${styles.vehicleTypeBtnsContainer}`}>
          {tabs.map((t) => {
            return (
              <button
                onClick={() => setActiveTab(t)}
                className={activeTab === t ? styles.active : ""}
              >
                {t === "eventVehicles" ? "Event Vehicles" : t}
              </button>
            );
          })}
        </div>

        <hr />

        <div className={styles.inputsContainer}>
          <div className={styles.top}>
            <div className={styles.searchContainer}>
              <Search size={20} color="gray" />
              <input
                type="text"
                placeholder="Search name or location"
                className={styles.searchNameOrLocationInput}
              />
            </div>

            <select name="location" id="location">
              {locations.map((location) => {
                return <option value={location}>{location}</option>;
              })}
            </select>

            <select name="sort" id="sort">
              {sortBy.map((sort) => {
                return <option value={sort}>Sort: {sort}</option>;
              })}
            </select>
          </div>

          <div className="bottom"></div>
        </div>
      </div>
    </div>
  );
};

export default Vehicles;

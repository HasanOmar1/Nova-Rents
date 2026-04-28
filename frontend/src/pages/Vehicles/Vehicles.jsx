import { useState } from "react";
import styles from "./Vehicles.module.css";

const tabs = ["all", "cars", "motorcycles", "eventVehicles"];

const Vehicles = () => {
  const [activeTab, setActiveTab] = useState("all");
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

        <div className="inputsContainer">
          <div className="top">
            <input
              type="text"
              placeholder="Search name or location"
              className="searchNameOrLocation"
            />

            <select name="location" id="location">
              <option value="all">All Locations</option>
              {/* add all locations */}
            </select>

            <select name="sort" id="sort">
              <option value="price">Sort: price</option>
              {/* add sort by what... */}
            </select>
          </div>

          <div className="bottom"></div>
        </div>
      </div>
    </div>
  );
};

export default Vehicles;

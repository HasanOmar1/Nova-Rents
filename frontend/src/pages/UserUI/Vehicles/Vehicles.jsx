import { useState } from "react";
import styles from "./Vehicles.module.css";
import { Search } from "lucide-react";
import VehiclesCards from "../../../components/VehiclesCards/VehiclesCards";
import { Link } from "react-router-dom";

const tabs = ["all", "Cars", "Motorcycles", "Event Vehicle"];

const vehicleData = [
  {
    id: 1,
    img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop",
    vehName: "Porsche 911 Carrera",
    price: "$450/day",
    year: 2023,
    location: "Tel Aviv",
    status: "Available",
    type: "Car",
    ownerName: "Ward Najjar",
  },
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop",
    vehName: "Harley Davidson Iron 883",
    price: "$120/day",
    year: 2021,
    location: "Haifa",
    status: "Available",
    type: "Motorcycle",
    ownerName: "Sarah Levi",
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop",
    vehName: "Vintage Wedding Rolls-Royce",
    price: "$850/day",
    year: 1965,
    location: "Jerusalem",
    status: "Available",
    type: "Event Vehicle",
    ownerName: "David Mizrahi",
  },
  {
    id: 4,
    img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop",
    vehName: "Tesla Model 3",
    price: "$200/day",
    year: 2024,
    location: "Nazareth",
    status: "Booked",
    type: "Car",
    ownerName: "Yousef Abbas",
  },
  {
    id: 5,
    img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop",
    vehName: "Yamaha YZF R1",
    price: "$180/day",
    year: 2022,
    location: "Tel Aviv",
    status: "Available",
    type: "Motorcycle",
    ownerName: "Noa Golan",
  },
  {
    id: 6,
    img: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=800&auto=format&fit=crop",
    vehName: "Lamborghini Huracán",
    price: "$1,500/day",
    year: 2023,
    location: "Haifa",
    status: "Available",
    type: "Event Vehicle",
    ownerName: "Hasan omar",
  },
  {
    id: 7,
    img: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=800&auto=format&fit=crop",
    vehName: "Lamborghini Huracán",
    price: "$1,500/day",
    year: 2023,
    location: "Haifa",
    status: "Available",
    type: "Event Vehicle",
    ownerName: "Hasan omar",
  },
];

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
        {vehicleData.map((veh) => {
          return (
            <VehiclesCards
              key={veh.id}
              img={veh.img}
              location={veh.location}
              ownerName={veh.ownerName}
              price={veh.price}
              status={veh.status}
              type={veh.type}
              vehName={veh.vehName}
              year={veh.year}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Vehicles;

import styles from "./Map.module.css";
import { Link } from "react-router-dom";
import { SlidersHorizontal, Crosshair } from "lucide-react";
import GoogleMapEmbed from "../../../components/GoogleMapEmbed/GoogleMapEmbed";
import MapVehiclesCards from "../../../components/MapVehiclesCards/MapVehiclesCards";

const Map = () => {
  const vehicleData = [
    {
      id: 1,
      img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop",
      vehName: "Porsche 911 Carrera",
      price: "$450/day",
      location: "Tel Aviv",
      type: "Car",
      ownerName: "Ward Najjar",
    },
    {
      id: 2,
      img: "https://nsimgall.s3.amazonaws.com/wp-content/uploads/2026/02/24134709/20250729_163726-scaled.jpg",
      vehName: "Harley Davidson Iron 883",
      price: "$120/day",
      location: "Haifa",
      type: "Motorcycle",
      ownerName: "Sarah Levi",
    },
    {
      id: 3,
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRd9BgMMtTIPaZ08cY7jXWyQsvEsgBqZEvO-A&s",
      vehName: "Vintage Wedding Rolls-Royce",
      price: "$850/day",
      location: "Jerusalem",
      type: "Event Vehicle",
      ownerName: "David Mizrahi",
    },
    {
      id: 4,
      img: "https://www.shop4tesla.com/cdn/shop/articles/lohnt-sich-ein-gebrauchtes-tesla-model-3-vor-und-nachteile-833053.jpg?format=pjpg&pad_color=ffffff&v=1733570691&width=2752",
      vehName: "Tesla Model 3",
      price: "$200/day",
      location: "Nazareth",
      type: "Car",
      ownerName: "Yousef Abbas",
    },
  ];

  return (
    <div className={`${styles.Map} page`}>
      <h1>Map</h1>
      <div className={styles.btnsContainer}>
        <p>
          The vehicles shown match your current filters — sorted by distance if
          location access is granted.
        </p>
        <Link to={"/vehicles"} className={styles.editFiltersBtn}>
          Edit Filters
        </Link>
        <Link to={"/vehicles"} className={styles.vehiclesListBtn}>
          Vehicle List
        </Link>
      </div>

      <div className={styles.filterContainer}>
        <div className={styles.titleContainer}>
          <p>
            <SlidersHorizontal size={28} className="icon" />
          </p>
          <p className={styles.title}>Active Filters</p>
        </div>

        <p className={styles.filters}>
          No active filters — showing all matching vehicles
        </p>
        <hr />

        <button
          className={`${styles.vehiclesListBtn} ${styles.useLocationBtn}`}
        >
          <Crosshair size={28} className="icon" />
          Use My Location
        </button>
      </div>

      <div className={styles.mapAndDataContainer}>
        <div className={styles.left}>
          <GoogleMapEmbed query={"Haifa"} title="Map preview" />
        </div>
        <div className={styles.right}>
          {vehicleData.map((veh) => {
            return <MapVehiclesCards key={veh.id} veh={veh} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default Map;

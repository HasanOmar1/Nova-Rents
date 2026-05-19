import { Link } from "react-router-dom";
import styles from "./MapVehiclesCards.module.css";
import { MapPin, User } from "lucide-react";

const MapVehiclesCards = ({ veh }) => {
  return (
    <div className={styles.MapVehiclesCards}>
      <div className={styles.dataContainer}>
        <div className={styles.id}>
          <p>{veh.id}</p>
        </div>

        <div>
          <img src={veh.img} alt={veh.vehName} />
        </div>

        <div className={styles.vehInfo}>
          <p className={styles.vehName}>{veh.vehName}</p>
          <p className={styles.vehType}>{veh.type}</p>

          <div className={styles.locationContainer}>
            <p>
              <MapPin size={15} />
            </p>
            <p>{veh.location}</p>
          </div>

          <p className={styles.price}>{veh.price}</p>

          <div className={styles.ownerContainer}>
            <p>
              <User size={15} className="icon" />
            </p>
            <p className={styles.host}>{veh.ownerName}</p>
          </div>
        </div>
      </div>

      <hr />

      <div className={styles.btnsContainer}>
        <Link
          to={`/vehicles/${veh.id}`}
          state={veh}
          className={styles.detailsBtn}
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default MapVehiclesCards;

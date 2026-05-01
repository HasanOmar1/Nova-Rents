import { Link } from "react-router-dom";
import styles from "./MapVehiclesCards.module.css";
import { MapPin, User } from "lucide-react";

const MapVehiclesCards = ({
  id,
  img,
  vehName,
  price,
  location,
  type,
  ownerName,
}) => {
  return (
    <div className={styles.MapVehiclesCards}>
      <div className={styles.dataContainer}>
        <div className={styles.id}>
          <p>{id}</p>
        </div>

        <div>
          <img src={img} alt={vehName} />
        </div>

        <div className={styles.vehInfo}>
          <p className={styles.vehName}>{vehName}</p>
          <p className={styles.vehType}>{type}</p>

          <div className={styles.locationContainer}>
            <p>
              <MapPin size={15} />
            </p>
            <p>{location}</p>
          </div>

          <p className={styles.price}>{price}</p>

          <div className={styles.ownerContainer}>
            <p>
              <User size={15} className="icon" />
            </p>
            <p className={styles.host}>{ownerName}</p>
          </div>
        </div>
      </div>

      <hr />

      <div className={styles.btnsContainer}>
        <Link to={"/vehicles"} className={styles.detailsBtn}>
          View Details
        </Link>
      </div>
    </div>
  );
};

export default MapVehiclesCards;

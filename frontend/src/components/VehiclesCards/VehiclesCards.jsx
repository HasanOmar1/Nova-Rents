import styles from "./VehiclesCards.module.css";
import { MapPin, User, AlertTriangle } from "lucide-react";

const VehiclesCards = ({
  img,
  vehName,
  price,
  year,
  location,
  status,
  type,
  ownerName,
}) => {
  return (
    <div className={styles.VehiclesCards}>
      <img src={img} alt={vehName} />

      <div className={styles.vehiclesCardsContainer}>
        <div className={styles.vehStatus}>
          <p>{vehName}</p>
          <p className={styles.status}>{status}</p>
        </div>

        <p className={styles.vehType}>{type}</p>

        <div className={styles.vehDetails}>
          <div>
            <p className={styles.title}>Price</p>
            <p className={styles.detailsData}>{price}</p>
          </div>

          <div>
            <p className={styles.title}>Year</p>
            <p className={styles.detailsData}>{year}</p>
          </div>

          <div>
            <p className={styles.title}>Location</p>

            <div className={styles.detailsData}>
              <p>
                <MapPin size={15} className="icon" />
              </p>
              <p>{location}</p>
            </div>
          </div>
        </div>

        <div className={styles.ownerContainer}>
          <p>
            <User size={15} className="icon" />
          </p>
          <p>
            <span className={styles.host}>Host</span> · {ownerName}
          </p>
        </div>

        <div className={styles.btnsContainer}>
          <button className={styles.detailsBtn}>Details</button>
          <button className={styles.rentBtn}>Rent Now</button>
          <button className={styles.reportBtn}>
            <AlertTriangle size={20} className="icon" />
            Report Vehicle
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehiclesCards;

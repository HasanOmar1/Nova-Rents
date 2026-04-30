import styles from "./VehiclesCards.module.css";
import { MapIcon, User } from "lucide-react";

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
            <p className={styles.title}>location</p>

            <div className={styles.detailsData}>
              <p>
                <MapIcon size={15} color="#a7d2eb" />
              </p>
              <p>{location}</p>
            </div>
          </div>
        </div>

        <div className={styles.ownerContainer}>
          <p>
            <User size={15} color="#a7d2eb" />
          </p>
          <p>
            <span className={styles.host}>Host</span> - {ownerName}
          </p>
        </div>

        <div className={styles.btnsContainer}>
          <button>Details</button>
          <button>Rent Now</button>
          <button>Report Vehicle</button>
        </div>
      </div>
    </div>
  );
};

export default VehiclesCards;

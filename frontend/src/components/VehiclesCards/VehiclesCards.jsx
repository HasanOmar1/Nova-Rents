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
          <p>{status}</p>
        </div>

        <div className="vehTypeContainer">
          <p className="vehType">{type}</p>
        </div>

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
            <p className={styles.detailsData}>
              {/* <MapIcon size={30} />  */}
              {location}
            </p>
          </div>
        </div>
        <div className="ownerContainer">
          {/* <User size={30} /> */}
          <p className={styles.detailsData}>Host - {ownerName}</p>
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

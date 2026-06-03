import { Link } from "react-router-dom";
import styles from "./VehiclesCards.module.css";
import { MapPin, User, AlertTriangle } from "lucide-react";

const VehiclesCards = ({ veh }) => {
  return (
    <div className={styles.VehiclesCards}>
      <img src={veh.image} alt={veh.brandName} />

      <div className={styles.vehiclesCardsContainer}>
        <div className={styles.vehStatus}>
          <p>{veh.brandName + " " + veh.modelName}</p>
          <p className={styles.status}>{veh.status}</p>
        </div>

        <p className={styles.vehType}>{veh.carTypeName}</p>

        <div className={styles.vehDetails}>
          <div>
            <p className={styles.title}>Price</p>
            <p className={styles.detailsData}>${veh.price}</p>
          </div>

          <div>
            <p className={styles.title}>Year</p>
            <p className={styles.detailsData}>{veh.year}</p>
          </div>

          <div>
            <p className={styles.title}>Location</p>

            <div className={styles.detailsData}>
              <p>
                <MapPin size={15} className="icon" />
              </p>
              <p>{veh.address}</p>
            </div>
          </div>
        </div>

        <div className={styles.ownerContainer}>
          <p>
            <User size={15} className="icon" />
          </p>
          <p>
            <span className={styles.host}>Host</span> · {veh.ownerFirstName}{" "}
            {veh.ownerLastName}
          </p>
        </div>

        <div className={styles.btnsContainer}>
          <Link
            to={`/vehicles/${veh.licensePlate}`}
            state={veh}
            className={styles.detailsBtn}
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VehiclesCards;

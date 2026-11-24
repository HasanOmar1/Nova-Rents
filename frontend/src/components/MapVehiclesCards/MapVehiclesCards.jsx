// Defines the Map Vehicles Cards React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { Link } from "react-router-dom";
import styles from "./MapVehiclesCards.module.css";
import { MapPin, User } from "lucide-react";
import { parseImgs } from "../../utils/parseImgs";

// Renders the Map Vehicles Cards interface.
// Accepts an options object and returns rendered JSX.
const MapVehiclesCards = ({ veh }) => {
  const imageUrl = veh.image ? parseImgs(veh.image) : "";
  const vehName = `${veh.brandName} ${veh.modelName}`;
  const ownerName = `${veh.ownerFirstName} ${veh.ownerLastName}`;

  const formattedVehicle = {
    ...veh,
    vehName: vehName,
  };

  return (
    <div className={styles.MapVehiclesCards}>
      <div className={styles.dataContainer}>
        <div className={styles.imageWrapper}>
          <img src={imageUrl} alt={vehName} />
          <div className={styles.plateBadge}>{veh.licensePlate}</div>
        </div>

        <div className={styles.vehInfo}>
          <p className={styles.vehName}>{vehName}</p>
          <p className={styles.vehType}>{veh.carTypeName}</p>

          <div className={styles.locationContainer}>
            <MapPin size={14} />
            <span>{veh.address}</span>
          </div>

          <p className={styles.price}>${veh.price}/day</p>

          <div className={styles.ownerContainer}>
            <User size={14} className="icon" />
            <span className={styles.host}>{ownerName}</span>
          </div>
        </div>
      </div>

      <hr />

      <div className={styles.btnsContainer}>
        <Link
          to={`/vehicles/${veh.licensePlate}`}
          state={formattedVehicle}
          className={styles.detailsBtn}
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default MapVehiclesCards;

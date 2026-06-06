import { parseImgs } from "../../utils/parseImgs";
import styles from "./AllVehiclesCards.module.css";

const AllVehiclesCards = ({ veh }) => {
  const imageUrl = parseImgs(veh.image);

  return (
    <div className={styles.AllVehiclesCards}>
      <div className={styles.nameContainer}>
        <img src={imageUrl} alt={veh.name} />
        <div className={styles.description}>
          <p className={styles.name}>{veh.name}</p>
          <p className={styles.info}>
            #{veh.licensePlate} · {veh.year} · {veh.seats} seats
          </p>
        </div>
      </div>

      <p className={styles.type}>{veh.type}</p>
      <p className={styles.location}>{veh.address}</p>
      <p className={styles.price}>${veh.price}/day</p>
      <p className={styles.owner}>{veh.owner}</p>
      <p
        className={`${styles.status} ${veh.status === "Available" ? styles.available : veh.status === "Booked" ? styles.booked : styles.maintenance} `}
      >
        {veh.status}
      </p>
    </div>
  );
};

export default AllVehiclesCards;

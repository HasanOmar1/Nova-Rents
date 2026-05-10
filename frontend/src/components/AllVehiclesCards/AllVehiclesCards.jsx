import styles from "./AllVehiclesCards.module.css";

const AllVehiclesCards = ({
  img,
  id,
  name,
  year,
  seats,
  type,
  location,
  price,
  owner,
  status,
}) => {
  return (
    <div className={styles.AllVehiclesCards}>
      <div className={styles.nameContainer}>
        <img src={img} alt={name} />
        <div className={styles.description}>
          <p className={styles.name}>{name}</p>
          <p className={styles.info}>
            #{id} · {year} · {seats} seats
          </p>
        </div>
      </div>

      <p className={styles.type}>{type}</p>
      <p className={styles.location}>{location}</p>
      <p className={styles.price}>{price}/day</p>
      <p className={styles.owner}>{owner}</p>
      <p
        className={`${styles.status} ${status === "Available" ? styles.available : status === "Booked" ? styles.booked : styles.maintenance} `}
      >
        {status}
      </p>
    </div>
  );
};

export default AllVehiclesCards;

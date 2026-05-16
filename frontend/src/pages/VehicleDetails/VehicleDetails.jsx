import { Link, useLocation, useParams } from "react-router-dom";
import styles from "./VehicleDetails.module.css";
import { AlertTriangle, MapPin } from "lucide-react";
import HomeTopCards from "../../components/HomeCards/HomeTopCards/HomeTopCards";
import GoogleMapEmbed from "../../components/GoogleMapEmbed/GoogleMapEmbed";

const VehicleDetails = () => {
  const { id } = useParams();
  const { state } = useLocation();
  console.log(state);

  const cardsData = [
    {
      title: "Daily rate",
      value: state.price.split("/")[0],
    },
    {
      title: "Year",
      value: state.year,
    },
    {
      title: "Location",
      value: (
        <>
          <MapPin size={17} /> {state.location}
        </>
      ),
    },
    {
      title: "Owner",
      value: state.ownerName,
    },
  ];

  function locationToMapQuery(location) {
    return `${location}, Israel`;
  }

  return (
    <div className={`${styles.VehicleDetails} page`}>
      <div className={styles.top}>
        <h1>{state.vehName}</h1>
        <div className={styles.btnsContainer}>
          <Link to={"/vehicles"} className={styles.backBtn}>
            Back to vehicles
          </Link>
          <button className={styles.reportBtn}>
            <AlertTriangle size={20} className="icon" color="#f9e081" />
            Report Vehicle
          </button>
        </div>
      </div>

      <div className={styles.dataContainer}>
        <div className={`${styles.infoContainer} ${styles.container}`}>
          <img src={state.img} alt={state.vehName} />

          <div className={styles.about}>
            <div className={styles.typeStatusContainer}>
              <p className={styles.vehType}>{state.type}</p>
              <p className={styles.status}>{state.status}</p>
            </div>

            <div className={styles.cards}>
              {cardsData.map((item) => {
                return (
                  <HomeTopCards
                    key={crypto.randomUUID()}
                    title={item.title}
                    value={item.value}
                    className={styles.vehicleCardDetails}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className={`${styles.detailsContainer} ${styles.container}`}>
          <h4>Details</h4>
          <p>
            Premium listing for your graduation demo: structured sections,
            predictable scan order, and no decorative noise. In production this
            would include mileage, fuel type, and owner policies.
          </p>
          <p>• Seats: 5</p>
        </div>

        <div className={`${styles.mapContainer} ${styles.container} `}>
          <h4>Location</h4>
          <div>
            <GoogleMapEmbed
              query={locationToMapQuery(state.location)}
              title={state.location}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails;

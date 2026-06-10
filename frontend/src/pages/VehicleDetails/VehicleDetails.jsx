import { Link, useLocation, useParams } from "react-router-dom";
import styles from "./VehicleDetails.module.css";
import { AlertTriangle, MapPin } from "lucide-react";
import HomeTopCards from "../../components/HomeCards/HomeTopCards/HomeTopCards";
import GoogleMapEmbed from "../../components/GoogleMapEmbed/GoogleMapEmbed";
import { parseImgs } from "../../utils/parseImgs"; // <--- Keeping this import
import { useUserContext } from "../../context/UserContext";
import { useEffect, useState, useRef } from "react";

const VehicleDetails = () => {
  const [hideBooking, setHideBooking] = useState(false);
  const { currentUser } = useUserContext();
  const { id } = useParams();
  const { state } = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageUrls = state.image ? parseImgs(state.image, true) : [];

  const intervalRef = useRef(null);

  useEffect(() => {
    if (currentUser?.email === state?.ownerEmail) {
      setHideBooking(true);
    } else setHideBooking(false);
  }, [currentUser, state?.ownerEmail]);

  useEffect(() => {
    if (imageUrls.length > 1) {
      startSlideshow();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [imageUrls.length]);

  const startSlideshow = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        return prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1;
      });
    }, 2000);
  };

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
    if (imageUrls.length > 1) {
      startSlideshow();
    }
  };

  const ownerFullName = state.ownerFirstName + " " + state.ownerLastName;

  const cardsData = [
    {
      title: "Daily rate",
      value:
        state.price && typeof state.price === "string"
          ? "$" + state.price.split("/")[0]
          : "$" + state.price,
    },
    {
      title: "Year",
      value: state.year,
    },
    {
      title: "Location",
      value: (
        <>
          <MapPin size={17} /> {state.address}
        </>
      ),
    },
    {
      title: "Owner",
      value: ownerFullName,
    },
  ];

  function locationToMapQuery(address) {
    return `${address}, Israel`;
  }

  const mainImageUrl = imageUrls[currentIndex] || "";

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

      <div className={styles.allContainer}>
        <div className={styles.dataContainer}>
          <div className={`${styles.infoContainer} ${styles.container}`}>
            <div className={styles.gallery}>
              <div className={styles.mainImageWrapper}>
                <img
                  src={mainImageUrl}
                  alt={state.vehName}
                  className={styles.mainImage}
                />

                {imageUrls.length > 1 && (
                  <div className={styles.thumbnailsContainer}>
                    {imageUrls.map((url, index) => {
                      return (
                        <div
                          key={index}
                          className={`${styles.thumbnailWrapper} ${index === currentIndex ? styles.active : ""}`}
                          onClick={() => handleThumbnailClick(index)}
                        >
                          <img src={url} alt={`thumbnail ${index + 1}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.about}>
              <div className={styles.typeStatusContainer}>
                <p className={styles.vehType}>{state.carTypeName}</p>
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
              predictable scan order, and no decorative noise. In production
              this would include mileage, fuel type, and owner policies.
            </p>
            <p>• Seats: 5</p>
          </div>

          <div className={`${styles.mapContainer} ${styles.container} `}>
            <h4>Location</h4>
            <div>
              <GoogleMapEmbed
                query={locationToMapQuery(state.address)}
                title={state.address}
              />
            </div>
          </div>
        </div>

        {!hideBooking && (
          <div className={`${styles.bookingContainer} ${styles.container}`}>
            <h4>Booking</h4>
            <div className={styles.ownerInfoContainer}>
              <p className={styles.msg}>Rental contract with</p>
              <p>
                {ownerFullName} — {state?.ownerPhone}
              </p>
            </div>

            <div className={styles.allDatesContainer}>
              <div className={styles.datesContainer}>
                <label htmlFor="start">Start</label>
                <input type="date" name="start" />
              </div>

              <div className={styles.datesContainer}>
                <label htmlFor="end">End</label>
                <input type="date" name="end" />
              </div>
            </div>

            <button>Confirm Booking</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleDetails;

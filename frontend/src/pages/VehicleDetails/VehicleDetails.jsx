import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import styles from "./VehicleDetails.module.css";
import {
  AlertTriangle,
  MapPin,
  CalendarRange,
  ExternalLink,
  Users,
  Fuel,
  Gauge,
  Palette,
  Settings,
  Hash,
} from "lucide-react";
import HomeTopCards from "../../components/HomeCards/HomeTopCards/HomeTopCards";
import GoogleMapEmbed from "../../components/GoogleMapEmbed/GoogleMapEmbed";
import { parseImgs } from "../../utils/parseImgs";
import { useUserContext } from "../../context/UserContext";
import { useEffect, useState, useRef } from "react";
import { useRentContext } from "../../context/RentContext";
import BookingModal from "../../components/BookingModal/BookingModal";

const VehicleDetails = () => {
  const [hideBooking, setHideBooking] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const { currentUser } = useUserContext();
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { fetchBookedDates, setRentVehResponse } = useRentContext();
  const intervalRef = useRef(null);
  const imageUrls = state.image ? parseImgs(state.image, true) : [];
  const isOwnVehicle = currentUser?.email === state?.ownerEmail;

  useEffect(() => {
    if (isOwnVehicle) {
      setHideBooking(true);
    } else setHideBooking(false);
  }, [isOwnVehicle]);

  useEffect(() => {
    if (imageUrls.length > 1) {
      startSlideshow();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [imageUrls.length]);

  useEffect(() => {
    fetchBookedDates(state.licensePlate);
  }, [state.licensePlate]);

  const startSlideshow = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        return prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1;
      });
    }, 2500);
  };

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
    if (imageUrls.length > 1) {
      startSlideshow();
    }
  };

  const handleCloseModal = () => {
    setIsBookingModalOpen(false);
    setRentVehResponse("");
  };

  const handleReportVehicle = () => {
    const plate = state?.licensePlate || id;
    if (!plate) return;
    navigate(
      `/complaints?complaintType=vehicle&vehicleLicensePlate=${encodeURIComponent(plate)}`,
    );
  };

  const ownerFullName = state.ownerFirstName + " " + state.ownerLastName;

  const cardsData = [
    {
      title: "Daily rate + VAT",
      value:
        "$" +
        (
          (typeof state.price === "string"
            ? Number(state.price.split("/")[0])
            : Number(state.price)) * 1.18
        ).toFixed(2),
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
      value: (
        <span className={styles.ownerLinkContainer}>
          <span>{ownerFullName}</span>
          {state.ownerEmail && (
            <Link
              to={`/userStats/${state.ownerEmail}`}
              className={styles.viewProfileLink}
            >
              <ExternalLink size={12} /> View Profile
            </Link>
          )}
        </span>
      ),
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
          {!isOwnVehicle && (
            <button
              type="button"
              className={styles.reportBtn}
              onClick={handleReportVehicle}
            >
              <AlertTriangle size={20} className="icon" color="#f9e081" />
              Report Vehicle
            </button>
          )}
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
                    {imageUrls.map((url, index) => (
                      <div
                        key={index}
                        className={`${styles.thumbnailWrapper} ${index === currentIndex ? styles.active : ""}`}
                        onClick={() => handleThumbnailClick(index)}
                      >
                        <img src={url} alt={`thumbnail ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.about}>
              <div className={styles.typeStatusContainer}>
                <div className={styles.typeAndStatusContainer}>
                  <p className={styles.vehType}>{state.carTypeName}</p>
                  <p
                    className={`${styles.status} ${state?.status === "available" ? styles.available : state?.status === "rented" ? styles.rented : styles.maintenance} ${state.ownerStatus === "blocked" && styles.maintenance}`}
                  >
                    {state.ownerStatus !== "blocked"
                      ? state.status
                      : "Unavailable"}
                  </p>
                </div>

                {!hideBooking &&
                  state?.status === "available" &&
                  state?.ownerStatus !== "blocked" && (
                    <button
                      className={styles.launchBookingBtn}
                      onClick={() => setIsBookingModalOpen(true)}
                    >
                      <CalendarRange size={16} /> Rent Vehicle
                    </button>
                  )}
              </div>

              <div className={styles.cards}>
                {cardsData.map((item) => (
                  <HomeTopCards
                    key={crypto.randomUUID()}
                    title={item.title}
                    value={item.value}
                    className={styles.vehicleCardDetails}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={`${styles.specsContainer} ${styles.container}`}>
            <h4>Specifications</h4>
            <div className={styles.specsGrid}>
              <div className={styles.specBox}>
                <Users className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>Seats</span>
                  <p>{state?.seats || "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Fuel className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>Fuel Type</span>
                  <p>{state?.fuelType || "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Settings className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>Transmission</span>
                  <p>{state?.transmission || "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Gauge className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>Mileage</span>
                  <p>{state?.km ? `${state.km} km` : "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Palette className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>Color</span>
                  <p>{state?.color || "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Hash className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>License Plate</span>
                  <p>{state?.licensePlate || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.detailsContainer} ${styles.container}`}>
            <h4>Details</h4>
            <p>{state?.details}</p>
          </div>

          <div className={`${styles.mapContainer} ${styles.container}`}>
            <h4>Location</h4>
            <div>
              <GoogleMapEmbed
                query={locationToMapQuery(state.address)}
                title={state.address}
              />
            </div>
          </div>
        </div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={handleCloseModal}
        vehicle={state}
      />
    </div>
  );
};

export default VehicleDetails;

import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import styles from "./VehicleDetails.module.css";
import {
  AlertTriangle,
  Lock,
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
import { useVehicleContext } from "../../context/VehicleContext";

const displayedSpecificationFields = [
  "seats",
  "fuelType",
  "transmission",
  "km",
  "color",
];

const hasAllDisplayedSpecifications = (vehicle) =>
  Boolean(vehicle) &&
  displayedSpecificationFields.every(
    (field) =>
      vehicle[field] !== undefined &&
      vehicle[field] !== null &&
      vehicle[field] !== "",
  );

const formatVehicleForDetails = (vehicle) => {
  if (!vehicle) return null;

  return {
    ...vehicle,
    vehName:
      vehicle.vehName ||
      [vehicle.brandName, vehicle.modelName].filter(Boolean).join(" "),
  };
};

const VehicleDetails = () => {
  const [hideBooking, setHideBooking] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const { currentUser } = useUserContext();
  const { id } = useParams();
  const { state: routeVehicle } = useLocation();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [vehicle, setVehicle] = useState(() =>
    formatVehicleForDetails(routeVehicle),
  );
  const [isVehicleLoading, setIsVehicleLoading] = useState(
    !hasAllDisplayedSpecifications(routeVehicle),
  );
  const [vehicleLoadError, setVehicleLoadError] = useState("");
  const { getVehicleByLicensePlate } = useVehicleContext();

  const {
    fetchBookedDates,
    setRentVehResponse,
    fetchRentalHistory,
    findPaidTripForVehicle,
  } = useRentContext();
  const intervalRef = useRef(null);
  const imageUrls = vehicle?.image ? parseImgs(vehicle.image, true) : [];
  const isOwnVehicle = currentUser?.email === vehicle?.ownerEmail;
  const plate = vehicle?.licensePlate || id;
  const paidTripForVehicle = currentUser ? findPaidTripForVehicle(plate) : null;
  const canReportVehicle = Boolean(paidTripForVehicle);

  useEffect(() => {
    let isCurrentRequest = true;
    const navigationVehicle = formatVehicleForDetails(routeVehicle);

    setVehicle(navigationVehicle);
    setVehicleLoadError("");

    if (hasAllDisplayedSpecifications(navigationVehicle)) {
      setIsVehicleLoading(false);
      return () => {
        isCurrentRequest = false;
      };
    }

    setIsVehicleLoading(true);

    const loadCompleteVehicle = async () => {
      const completeVehicle = await getVehicleByLicensePlate(id);
      if (!isCurrentRequest) return;

      if (completeVehicle) {
        setVehicle(
          formatVehicleForDetails({
            ...(navigationVehicle || {}),
            ...completeVehicle,
          }),
        );
      } else if (!navigationVehicle) {
        setVehicleLoadError("Vehicle details could not be loaded.");
      }

      setIsVehicleLoading(false);
    };

    loadCompleteVehicle();

    return () => {
      isCurrentRequest = false;
    };
  }, [getVehicleByLicensePlate, id, routeVehicle]);

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
    if (plate) fetchBookedDates(plate);
  }, [plate]);

  // Reuse existing /rentals/history cache for report-button UX (no new endpoint).
  useEffect(() => {
    if (currentUser) {
      fetchRentalHistory();
    }
  }, [currentUser]);

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
    if (!plate || !paidTripForVehicle?.rentalId) return;
    navigate(
      `/complaints?complaintType=vehicle` +
        `&vehicleLicensePlate=${encodeURIComponent(plate)}` +
        `&rentalId=${encodeURIComponent(paidTripForVehicle.rentalId)}`,
    );
  };

  if (isVehicleLoading) {
    return (
      <div className={`${styles.VehicleDetails} page`}>
        <p>Loading vehicle details...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className={`${styles.VehicleDetails} page`}>
        <p>{vehicleLoadError || "Vehicle not found."}</p>
        <Link to="/vehicles" className={styles.backBtn}>
          Back to vehicles
        </Link>
      </div>
    );
  }

  const ownerFullName = [vehicle.ownerFirstName, vehicle.ownerLastName]
    .filter(Boolean)
    .join(" ");

  const cardsData = [
    {
      title: "Daily rate + VAT",
      value:
        "$" +
        (
          (typeof vehicle.price === "string"
            ? Number(vehicle.price.split("/")[0])
            : Number(vehicle.price)) * 1.18
        ).toFixed(2),
    },

    {
      title: "Year",
      value: vehicle.year,
    },
    {
      title: "Location",
      value: (
        <>
          <MapPin size={17} /> {vehicle.address}
        </>
      ),
    },
    {
      title: "Owner",
      value: (
        <span className={styles.ownerLinkContainer}>
          <span>{ownerFullName}</span>
          {vehicle.ownerEmail && (
            <Link
              to={`/userStats/${vehicle.ownerEmail}`}
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
        <h1>{vehicle.vehName}</h1>
        <div className={styles.btnsContainer}>
          <Link to={"/vehicles"} className={styles.backBtn}>
            Back to vehicles
          </Link>
          {!isOwnVehicle && (
            <div className={styles.reportAction}>
              <button
                type="button"
                className={`${styles.reportBtn} ${
                  canReportVehicle ? "" : styles.reportBtnDisabled
                }`}
                onClick={handleReportVehicle}
                disabled={!canReportVehicle}
                title={
                  canReportVehicle
                    ? "Report an issue with this vehicle"
                    : "Reporting is available after a paid rental for this vehicle."
                }
              >
                {canReportVehicle ? (
                  <AlertTriangle size={20} className="icon" color="#f9e081" />
                ) : (
                  <Lock size={18} className="icon" color="#9ca3af" />
                )}
                Report Vehicle
              </button>
            </div>
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
                  alt={vehicle.vehName}
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
                  <p className={styles.vehType}>{vehicle.carTypeName}</p>
                  <p
                    className={`${styles.status} ${vehicle.status === "available" ? styles.available : vehicle.status === "rented" ? styles.rented : styles.maintenance} ${vehicle.ownerStatus === "blocked" && styles.maintenance}`}
                  >
                    {vehicle.ownerStatus !== "blocked"
                      ? vehicle.status
                      : "Unavailable"}
                  </p>
                </div>

                {!hideBooking &&
                  vehicle.status === "available" &&
                  vehicle.ownerStatus !== "blocked" && (
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
                  <p>{vehicle.seats || "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Fuel className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>Fuel Type</span>
                  <p>{vehicle.fuelType || "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Settings className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>Transmission</span>
                  <p>{vehicle.transmission || "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Gauge className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>Mileage</span>
                  <p>{vehicle.km ? `${vehicle.km} km` : "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Palette className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>Color</span>
                  <p>{vehicle.color || "N/A"}</p>
                </div>
              </div>

              <div className={styles.specBox}>
                <Hash className={styles.specIcon} size={24} />
                <div className={styles.specText}>
                  <span>License Plate</span>
                  <p>{vehicle.licensePlate || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.detailsContainer} ${styles.container}`}>
            <h4>Details</h4>
            <p>{vehicle.details}</p>
          </div>

          <div className={`${styles.mapContainer} ${styles.container}`}>
            <h4>Location</h4>
            <div>
              <GoogleMapEmbed
                query={locationToMapQuery(vehicle.address)}
                title={vehicle.address}
              />
            </div>
          </div>
        </div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={handleCloseModal}
        vehicle={vehicle}
      />
    </div>
  );
};

export default VehicleDetails;

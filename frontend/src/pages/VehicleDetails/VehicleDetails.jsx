// Presents one vehicle's specifications, rental state, owner, and location.
// It takes route context and returns the detail, booking, or error view.
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
  CalendarCheck2,
  CircleDollarSign,
} from "lucide-react";
import HomeTopCards from "../../components/HomeCards/HomeTopCards/HomeTopCards";
import GoogleMapEmbed from "../../components/GoogleMapEmbed/GoogleMapEmbed";
import { parseImgs } from "../../utils/parseImgs";
import { useUserContext } from "../../context/UserContext";
import { useCallback, useEffect, useState, useRef } from "react";
import { useRentContext } from "../../context/RentContext";
import BookingModal from "../../components/BookingModal/BookingModal";
import { useVehicleContext } from "../../context/VehicleContext";
import {
  formatEligibilityReason,
  formatVehicleStatus,
  getPrimaryRenterEligibilityMessage,
  getVehicleDisplayStatus,
} from "../../utils/displayFormat";
import GovernmentVerificationControls from "../../components/GovernmentVerificationControls/GovernmentVerificationControls";

const displayedSpecificationFields = [
  "seats",
  "fuelType",
  "transmission",
  "km",
  "color",
];

const USER_VEHICLE_RETURN_PATHS = new Set([
  "/myVehicles",
  "/myVehicles/analytics",
]);

/* Checks that a vehicle supplies every specification displayed on the page.
 * It accepts a vehicle object and returns a boolean. */
const hasAllDisplayedSpecifications = (vehicle) =>
  Boolean(vehicle) &&
  displayedSpecificationFields.every(
    /* Tests whether one displayed field has a usable vehicle value.
     * It accepts a field name and returns a boolean. */
    (field) =>
      vehicle[field] !== undefined &&
      vehicle[field] !== null &&
      vehicle[field] !== "",
  );

/* Normalizes route or API vehicle data for the detail view.
 * It accepts a vehicle object and returns the normalized object or null. */
const formatVehicleForDetails = (vehicle) => {
  if (!vehicle) return null;

  const derivedName = [vehicle.brandName, vehicle.modelName]
    .filter(Boolean)
    .join(" ");

  return {
    ...vehicle,
    vehName: derivedName || vehicle.vehName || "Vehicle",
  };
};

/* Coerces a value to a positive finite number for metric displays.
 * It accepts any numeric value and returns that number or zero. */
const toNonNegativeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

/* Formats rental count for display.
 * It accepts value and returns formatted display text. */
const formatRentalCount = (value) =>
  Math.floor(toNonNegativeNumber(value)).toLocaleString();

/* Formats revenue for display.
 * It accepts value and returns formatted display text. */
const formatRevenue = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNonNegativeNumber(value));

/* Renders the vehicle details view and coordinates its page state.
 * It accepts no arguments and returns the rendered page JSX. */
const VehicleDetails = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const { currentUser } = useUserContext();
  const { id } = useParams();
  const { state: routeState } = useLocation();
  const routeVehicle = routeState?.vehicle ?? routeState;
  const routeReturnTo = routeState?.returnTo;
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [vehicle, setVehicle] = useState(
    /* Builds the initial vehicle state lazily from navigation data.
     * It accepts no arguments and returns a normalized vehicle or null. */
    () =>
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
    rentalEligibility,
    fetchRentalEligibility,
  } = useRentContext();
  const intervalRef = useRef(null);
  const imageUrls = vehicle?.image ? parseImgs(vehicle.image, true) : [];
  const hasOwnerIds = currentUser?.userId != null && vehicle?.ownerId != null;
  const isOwnVehicle = hasOwnerIds
    ? Number(currentUser.userId) === Number(vehicle.ownerId)
    : Boolean(currentUser?.email && vehicle?.ownerEmail) &&
      currentUser.email.toLowerCase() === vehicle.ownerEmail.toLowerCase();
  const canViewVehicleValidation =
    currentUser?.role === "admin" || isOwnVehicle;
  const vehicleDisplayStatus = getVehicleDisplayStatus(vehicle);
  const vehicleStatusClass =
    {
      available: styles.available,
      unavailable: styles.unavailable,
      not_validated: styles.notValidated,
      rented: styles.rented,
      maintenance: styles.maintenance,
      inactive: styles.inactive,
    }[vehicleDisplayStatus] || styles.maintenance;
  const vehicleEligibilityReasonCodes = Array.isArray(
    vehicle?.rentalEligibility?.reasons,
  )
    ? [...new Set(vehicle.rentalEligibility.reasons.filter(Boolean))]
    : [];
  const validationReasons = vehicleEligibilityReasonCodes.length
    ? vehicleEligibilityReasonCodes.map(
      /* Transforms each collection entry for the surrounding mapping.
       * It accepts code and returns the mapped value. */
      (code) => ({
        code,
        message: formatEligibilityReason(code),
      }))
    : [
        {
          code: "VEHICLE_ELIGIBILITY_UNKNOWN",
          message: "Required documents or verification checks are incomplete.",
        },
      ];
  const showValidationDetails =
    canViewVehicleValidation && vehicleDisplayStatus === "not_validated";
  const canRentVehicle =
    currentUser?.role === "user" &&
    !isOwnVehicle &&
    vehicleDisplayStatus === "available" &&
    rentalEligibility?.eligible !== false &&
    vehicle?.rentalEligible !== false;
  const renterEligibilityMessage =
    currentUser?.role === "user" && rentalEligibility?.eligible === false
      ? getPrimaryRenterEligibilityMessage(rentalEligibility.reasons)
      : null;
  const vehicleUnavailableForRentals =
    currentUser?.role === "user" &&
    !isOwnVehicle &&
    vehicleDisplayStatus === "not_validated";
  const plate = vehicle?.licensePlate || id;
  const rentalMetrics = vehicle?.rentalMetrics ?? null;
  const rentalCount = toNonNegativeNumber(rentalMetrics?.rentalCount);
  const defaultVehicleListPath =
    currentUser?.role === "admin" ? "/allVehicles" : "/vehicles";
  const canUseReturnPath =
    routeReturnTo === defaultVehicleListPath ||
    (currentUser?.role === "user" &&
      USER_VEHICLE_RETURN_PATHS.has(routeReturnTo));
  const vehicleListPath = canUseReturnPath
    ? routeReturnTo
    : defaultVehicleListPath;
  const vehicleListLabel =
    vehicleListPath === "/myVehicles/analytics"
      ? "Back to performance"
      : "Back to vehicles";
  const paidTripForVehicle = currentUser ? findPaidTripForVehicle(plate) : null;
  const canReportVehicle = Boolean(paidTripForVehicle);

  /* Restarts the image slideshow interval from the current gallery state.
   * It accepts no arguments and returns undefined. */
  const startSlideshow = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(
      /* Advances the slideshow whenever the interval fires.
       * It accepts no arguments and returns undefined. */
      () => {
        setCurrentIndex(
          /* Derives the next current index state value.
           * It accepts prevIndex and returns the replacement state. */
          (prevIndex) => {
            return prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1;
          });
      }, 2500);
  }, [imageUrls.length]);

  /* Handles refresh vehicle details for this view.
   * It accepts no arguments and returns a promise that resolves when the operation finishes. */
  const refreshVehicleDetails = useCallback(async () => {
    const refreshedVehicle = await getVehicleByLicensePlate(id, {
      silent: true,
    });
    if (!refreshedVehicle) return false;

    setVehicle(
      /* Derives the next vehicle state value.
       * It accepts currentVehicle and returns the replacement state. */
      (currentVehicle) =>
        formatVehicleForDetails({
          ...(currentVehicle || {}),
          ...refreshedVehicle,
        }),
    );
    return true;
  }, [getVehicleByLicensePlate, id]);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      if (currentUser?.role === "user") {
        fetchRentalEligibility();
      }
    }, [currentUser?.role, fetchRentalEligibility]);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      let isCurrentRequest = true;
      const navigationVehicle = formatVehicleForDetails(routeVehicle);

      /* Handles load complete vehicle for this view.
       * It accepts no arguments and returns a promise that resolves when the operation finishes. */
      const loadCompleteVehicle = async () => {
        try {
          // Route state makes navigation feel instant, but the URL endpoint is
          // the authority for ownership and other mutable vehicle data.
          const completeVehicle = await getVehicleByLicensePlate(id, {
            silent: true,
          });
          if (!isCurrentRequest) return;

          if (!completeVehicle) {
            setVehicle(null);
            setVehicleLoadError("Vehicle not found.");
            return;
          }

          setVehicle(
            formatVehicleForDetails({
              ...(navigationVehicle || {}),
              ...completeVehicle,
            }),
          );
          setVehicleLoadError("");
        } catch (error) {
          if (!isCurrentRequest) return;

          if (error?.response?.status === 404) {
            setVehicle(null);
            setVehicleLoadError("Vehicle not found.");
          } else if (navigationVehicle) {
            setVehicle(navigationVehicle);
          } else {
            setVehicle(null);
            setVehicleLoadError("Vehicle details could not be loaded.");
          }
        } finally {
          if (isCurrentRequest) setIsVehicleLoading(false);
        }
      };

      loadCompleteVehicle();

      /* Releases resources created by the surrounding operation.
       * It accepts no arguments and returns undefined. */
      return () => {
        isCurrentRequest = false;
      };
    }, [getVehicleByLicensePlate, id, routeVehicle]);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      if (imageUrls.length > 1) {
        startSlideshow();
      }
      /* Releases resources created by the surrounding operation.
       * It accepts no arguments and returns undefined. */
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [imageUrls.length, startSlideshow]);

  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      if (plate) fetchBookedDates(plate);
    }, [plate]);

  // Reuse existing /rentals/history cache for report-button UX (no new endpoint).
  useEffect(
    /* Runs this component effect when its dependency values change.
     * It accepts no arguments and returns an optional cleanup function. */
    () => {
      if (currentUser) {
        fetchRentalHistory();
      }
    }, [currentUser]);

  /* Selects a thumbnail and restarts automatic image rotation.
   * It accepts an image index and returns undefined. */
  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
    if (imageUrls.length > 1) {
      startSlideshow();
    }
  };

  /* Closes the booking modal and clears its previous response.
   * It accepts no arguments and returns undefined. */
  const handleCloseModal = () => {
    setIsBookingModalOpen(false);
    setRentVehResponse("");
  };

  /* Opens the booking modal when the vehicle remains rentable.
   * It accepts no arguments and returns undefined. */
  const handleOpenBookingModal = () => {
    if (!canRentVehicle) return;
    setIsBookingModalOpen(true);
  };

  /* Navigates an eligible renter to a prefilled vehicle complaint form.
   * It accepts no arguments and returns undefined. */
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
        <Link to={vehicleListPath} className={styles.backBtn}>
          {vehicleListLabel}
        </Link>
      </div>
    );
  }

  const ownerFullName = [vehicle.ownerFirstName, vehicle.ownerLastName]
    .filter(Boolean)
    .join(" ");
  const ownerLabel = ownerFullName || vehicle.ownerEmail || "Unknown owner";

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
          <span>{ownerLabel}</span>
          {vehicle.ownerEmail && (
            <Link
              to={`/userStats/${encodeURIComponent(vehicle.ownerEmail)}`}
              className={styles.viewProfileLink}
            >
              <ExternalLink size={12} /> View Profile
            </Link>
          )}
        </span>
      ),
    },
  ];

  /* Adds the country suffix needed for a vehicle map lookup.
   * It accepts an address and returns a normalized map query string. */
  function locationToMapQuery(address) {
    return `${address}, Israel`;
  }

  const mainImageUrl = imageUrls[currentIndex] || "";

  return (
    <div className={`${styles.VehicleDetails} page`}>
      <div className={styles.top}>
        <h1>{vehicle.vehName}</h1>
        <div className={styles.btnsContainer}>
          <Link to={vehicleListPath} className={styles.backBtn}>
            {vehicleListLabel}
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
                    {imageUrls.map(
                      /* Transforms each collection entry for the surrounding mapping.
                       * It accepts url and index and returns the mapped value. */
                      (url, index) => (
                        <div
                          key={index}
                          className={`${styles.thumbnailWrapper} ${index === currentIndex ? styles.active : ""}`}
                          onClick={
                            /* Handles the click callback for this rendered control.
                             * It accepts no arguments and returns the delegated result. */
                            () => handleThumbnailClick(index)}
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
                  <p className={`${styles.status} ${vehicleStatusClass}`}>
                    {formatVehicleStatus(vehicleDisplayStatus)}
                  </p>
                </div>

                {canRentVehicle && (
                  <button
                    type="button"
                    className={styles.launchBookingBtn}
                    onClick={handleOpenBookingModal}
                  >
                    <CalendarRange size={16} /> Rent Vehicle
                  </button>
                )}
              </div>

              {showValidationDetails && (
                <section
                  className={styles.validationPanel}
                  aria-labelledby="vehicle-validation-title"
                >
                  <div className={styles.validationPanelHeader}>
                    <span className={styles.validationIcon} aria-hidden="true">
                      <AlertTriangle size={20} />
                    </span>
                    <div>
                      <h3 id="vehicle-validation-title">
                        Why this vehicle is not validated
                      </h3>
                      <p>
                        Every item below must be resolved before this vehicle
                        can be shown to renters.
                      </p>
                    </div>
                  </div>
                  <ul className={styles.validationReasons}>
                    {validationReasons.map(
                      /* Transforms each collection entry for the surrounding mapping.
                       * It accepts reason and returns the mapped value. */
                      (reason) => (
                        <li
                          key={
                            reason.code.startsWith("GOVERNMENT_CHECK_")
                              ? "government-check"
                              : reason.code
                          }
                        >
                          <div className={styles.validationReasonContent}>
                            <strong>{reason.message}</strong>
                            {currentUser?.role === "admin" &&
                              reason.code.startsWith("GOVERNMENT_CHECK_") && (
                                <GovernmentVerificationControls
                                  licensePlate={plate}
                                  governmentStatus={
                                    vehicle?.rentalEligibility?.statuses
                                      ?.governmentCheck
                                  }
                                  onUpdated={refreshVehicleDetails}
                                />
                              )}
                          </div>
                        </li>
                    ))}
                  </ul>
                </section>
              )}

              {(renterEligibilityMessage || vehicleUnavailableForRentals) && (
                <div className={styles.eligibilityNotice}>
                  {renterEligibilityMessage && (
                    <>
                      <p>{renterEligibilityMessage}</p>
                      <Link to="/profile">Go to Documents</Link>
                    </>
                  )}
                  {!renterEligibilityMessage && vehicleUnavailableForRentals && (
                    <p>
                      This vehicle is not currently accepting new rental
                      requests.
                    </p>
                  )}
                </div>
              )}

              <div className={styles.cards}>
                {cardsData.map(
                  /* Transforms each collection entry for the surrounding mapping.
                   * It accepts item and returns the mapped value. */
                  (item) => (
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

          {rentalMetrics && (
            <section
              className={`${styles.rentalActivityContainer} ${styles.container}`}
              aria-labelledby="rental-activity-title"
            >
              <div className={styles.rentalActivityHeader}>
                <div>
                  <h4 id="rental-activity-title">Rental activity</h4>
                  <p>
                    {isOwnVehicle
                      ? "A lifetime snapshot of this vehicle's rental performance."
                      : "This vehicle's lifetime rental history."}
                  </p>
                </div>
              </div>

              <div
                className={`${styles.rentalStatsGrid} ${
                  isOwnVehicle ? "" : styles.rentalStatsGridPublic
                }`}
              >
                <article
                  className={styles.rentalMetricCard}
                  title="Total number of completed rentals for this vehicle."
                  aria-label={`Times rented: ${formatRentalCount(rentalCount)}`}
                >
                  <span className={styles.rentalMetricIcon} aria-hidden="true">
                    <CalendarCheck2 size={22} />
                  </span>
                  <div className={styles.rentalMetricContent}>
                    <span>Times rented</span>
                    <strong>{formatRentalCount(rentalCount)}</strong>
                    <small>Completed rentals</small>
                  </div>
                </article>

                {isOwnVehicle && (
                  <article
                    className={styles.rentalMetricCard}
                    title="Total value generated by this vehicle's completed rentals."
                    aria-label={`Completed rental value: ${formatRevenue(
                      rentalMetrics.completedRentalValue,
                    )}`}
                  >
                    <span
                      className={styles.rentalMetricIcon}
                      aria-hidden="true"
                    >
                      <CircleDollarSign size={22} />
                    </span>
                    <div className={styles.rentalMetricContent}>
                      <span>Completed rental value</span>
                      <strong>
                        {formatRevenue(rentalMetrics.completedRentalValue)}
                      </strong>
                      <small>Generated by completed rentals</small>
                    </div>
                  </article>
                )}
              </div>
            </section>
          )}

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
        isOpen={canRentVehicle && isBookingModalOpen}
        onClose={handleCloseModal}
        vehicle={vehicle}
      />
    </div>
  );
};

export default VehicleDetails;

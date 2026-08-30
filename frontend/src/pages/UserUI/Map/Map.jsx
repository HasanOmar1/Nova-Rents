import { useEffect, useState } from "react";
import styles from "./Map.module.css";
import { Link } from "react-router-dom";
import { SlidersHorizontal, Crosshair, MapPin } from "lucide-react";
import GoogleMapEmbed from "../../../components/GoogleMapEmbed/GoogleMapEmbed";
import MapVehiclesCards from "../../../components/MapVehiclesCards/MapVehiclesCards";
import { useVehicleContext } from "../../../context/VehicleContext";
import { parseImgs } from "../../../utils/parseImgs";
import Pagination from "../../../components/Pagination/Pagination";
import { usePagination } from "../../../hooks/usePagination";

const Map = () => {
  const { allVehicles, getAllVehicles, allVehPagination } = useVehicleContext();
  const { currentPage, nextPage, previousPage } = usePagination({
    totalPages: allVehPagination?.totalPages,
  });
  const [mapQuery, setMapQuery] = useState("Israel");
  const [activePlate, setActivePlate] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    getAllVehicles({}, currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (allVehicles && allVehicles.length > 0) {
      setMapQuery(`${allVehicles[0].address}, Israel`);
      setActivePlate(allVehicles[0].licensePlate);
    }
  }, [allVehicles]);

  const handleCardClick = (veh) => {
    setMapQuery(`${veh.address}, Israel`);
    setActivePlate(veh.licensePlate);
  };

  const handleUseLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapQuery(`${latitude},${longitude}`);
          setActivePlate(null);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocating(false);
          alert(
            "Could not get your location. Please check your browser permissions.",
          );
        },
      );
    } else {
      setIsLocating(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className={`${styles.Map} page`}>
      <h1>Map View</h1>
      <div className={styles.btnsContainer}>
        <p>There are {allVehicles?.length || 0} total vehicles.</p>

        <Link to={"/vehicles"} className={styles.vehiclesListBtn}>
          Vehicles List
        </Link>
      </div>

      <div className={styles.filterContainer}>
        <div className={styles.titleContainer}>
          <p>
            <SlidersHorizontal size={28} className="icon" />
          </p>
          <p className={styles.title}>Location Services</p>
        </div>

        <p className={styles.filters}>
          Click on any vehicle card below to see its exact location on the map,
          or use your current location to explore the area.
        </p>
        <hr />

        <button
          onClick={handleUseLocation}
          disabled={isLocating}
          className={`${styles.vehiclesListBtn} ${styles.useLocationBtn}`}
        >
          <Crosshair size={28} className="icon" />
          {isLocating ? "Locating..." : "Use My Location"}
        </button>
      </div>

      <div className={styles.mapAndDataContainer}>
        <div className={styles.left}>
          <GoogleMapEmbed query={mapQuery} title="Vehicle Location Map" />
        </div>

        <div className={styles.right}>
          <div className={styles.cardsListWrapper}>
            {allVehicles && allVehicles.length > 0 ? (
              allVehicles.map((veh) => {
                const mappedVehicle = {
                  ...veh,
                  img: parseImgs(veh.image),
                  vehName: `${veh.brandName} ${veh.modelName}`,
                  location: veh.address,
                  type: veh.carTypeName,
                  ownerName: `${veh.ownerFirstName} ${veh.ownerLastName}`,
                };

                return (
                  <div
                    key={veh.licensePlate}
                    className={`${styles.cardWrapper} ${activePlate === veh.licensePlate ? styles.active : ""}`}
                    onClick={() => handleCardClick(veh)}
                  >
                    <MapVehiclesCards veh={mappedVehicle} />
                  </div>
                );
              })
            ) : (
              <div className={styles.noVehicles}>
                <MapPin size={40} />
                <p>Loading vehicles...</p>
              </div>
            )}
          </div>

          {/* Pagination Component */}
          {allVehPagination?.totalPages > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                currentPage={allVehPagination.currentPage}
                totalPages={allVehPagination.totalPages}
                handlePrevPage={previousPage}
                handleNextPage={nextPage}
                leftText={`Total Vehicles: ${allVehPagination.totalVehicles || 0}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Map;

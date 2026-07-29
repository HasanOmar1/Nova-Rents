import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import styles from "./UserStats.module.css";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Car,
  CheckCircle,
  XCircle,
  Ban,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { parseImgs } from "../../utils/parseImgs";
import Pagination from "../../components/Pagination/Pagination";
import { useUserContext } from "../../context/UserContext";

const UserStats = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  const {
    fetchUserStats,
    userStatsPerEmail,
    isStatsLoading,
    errorMsg,
    currentUser,
  } = useUserContext();
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchUserStats(email, currentPage);
  }, [email, currentPage]);

  const handleNextPage = () => {
    if (
      userStatsPerEmail?.pagination?.currentPage <
      userStatsPerEmail?.pagination?.totalPages
    ) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (userStatsPerEmail?.pagination?.currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // --- NEW: Handles formatting and passing ALL data to VehicleDetails ---
  const handleVehicleClick = (veh) => {
    const formattedVehicle = {
      ...veh,
      vehName: `${veh.brandName} ${veh.modelName}`,
      ownerFirstName: user.firstName,
      ownerLastName: user.lastName,
      ownerEmail: user.email,
      ownerPhone: user.phone,
      ownerStatus: user.status,
    };
    navigate(`/vehicles/${veh.licensePlate}`, { state: formattedVehicle });
  };

  const handleReportOwner = () => {
    if (!user?.userId) return;
    navigate(
      `/complaints?complaintType=owner&ownerId=${encodeURIComponent(user.userId)}`,
    );
  };

  if (isStatsLoading) {
    return (
      <div className={`${styles.UserStats} page`}>
        <p>Loading Nova Rents...</p>
      </div>
    );
  }

  if (errorMsg) {
    return <Navigate to="/not-found" replace />;
  }

  if (!userStatsPerEmail?.user) return null;

  const { user, stats, vehicles, pagination } = userStatsPerEmail;
  const isOwnProfile =
    Number(user.userId) === Number(currentUser?.userId);

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={`${styles.UserStats} page`}>
      <div className={styles.topActions}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        {!isOwnProfile && (
          <button
            type="button"
            className={styles.reportBtn}
            onClick={handleReportOwner}
          >
            <AlertTriangle size={18} color="#f9e081" />
            Report Owner
          </button>
        )}
      </div>

      <div className={styles.header}>
        <div className={styles.avatar}>
          <User size={40} color="#a7d2eb" />
        </div>
        <div className={styles.userInfo}>
          <h1>
            {user.firstName} {user.lastName}
          </h1>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles[user.role]}`}>
              {user.role}
            </span>
            <span className={`${styles.badge} ${styles[user.status]}`}>
              {user.status}
            </span>
          </div>
        </div>
      </div>

      {/* USER DETAILS */}
      <div className={styles.detailsCard}>
        <p>
          <Mail size={16} /> {user.email}
        </p>
        <p>
          <Phone size={16} /> {user.phone || "N/A"}
        </p>
        <p>
          <Calendar size={16} /> Joined: {joinDate}
        </p>
      </div>

      {/* STATS GRID */}
      <h2 className={styles.sectionTitle}>Account Statistics</h2>
      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <Car size={24} color="#3b82f6" />
          <h3>{stats.totalVehicles}</h3>
          <p>Total Vehicles Listed</p>
        </div>
        <div className={styles.statBox}>
          <CheckCircle size={24} color="#22c55e" />
          <h3>{Number(stats.trips.completed) || 0}</h3>
          <p>Completed Trips</p>
        </div>
        <div className={styles.statBox}>
          <XCircle size={24} color="#ef4444" />
          <h3>{Number(stats.trips.rejected) || 0}</h3>
          <p>Rejected Requests</p>
        </div>
        <div className={styles.statBox}>
          <Ban size={24} color="#f97316" />
          <h3>{Number(stats.trips.cancelled) || 0}</h3>
          <p>Cancelled Trips</p>
        </div>
      </div>

      {/* VEHICLES SECTION */}
      <h2 className={styles.sectionTitle}>Listed Vehicles</h2>
      {vehicles.length === 0 ? (
        <p className={styles.emptyMsg}>This user has no vehicles listed.</p>
      ) : (
        <>
          <div className={styles.vehiclesList}>
            {vehicles.map((veh) => (
              <div
                key={veh.licensePlate}
                className={styles.vehCard}
                onClick={() => handleVehicleClick(veh)}
              >
                <img
                  src={parseImgs(veh.image)}
                  alt={veh.modelName}
                  className={styles.vehImg}
                />
                <div className={styles.vehInfo}>
                  <h4>
                    {veh.brandName} {veh.modelName}
                  </h4>
                  <p className={styles.vehPlate}>Plate: {veh.licensePlate}</p>
                  <p className={styles.vehDetails}>
                    Year: {veh.year} • ${veh.price}/day
                  </p>
                  <span className={`${styles.vehStatus} ${styles[veh.status]}`}>
                    {veh.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.paginationContainer}>
            {pagination.totalPages > 1 && (
              <div className={styles.paginationWrapper}>
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  handlePrevPage={handlePrevPage}
                  handleNextPage={handleNextPage}
                  leftText={`Showing ${vehicles.length} of ${pagination.totalVehicles} vehicles`}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserStats;

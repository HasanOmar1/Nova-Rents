import { useState } from "react";
import DeleteMenu from "../DeleteMenu/DeleteMenu";
import styles from "./VehiclesCardsTable.module.css";
import { Ban, Flag, Pencil, Trash2 } from "lucide-react";
import { useVehicleContext } from "../../context/VehicleContext";
import AddEditVehicleMenu from "../AddEditVehicleMenu/AddEditVehicleMenu";
import { Link } from "react-router-dom";
import { parseImgs } from "../../utils/parseImgs";
import { useUserContext } from "../../context/UserContext";
import {
  buildVehicleEligibilitySummary,
  formatVehicleStatus,
  getVehicleDisplayStatus,
} from "../../utils/displayFormat";

const VehiclesCardsTable = ({
  veh,
  admin,
  activeReportCount = 0,
  onViewReports,
}) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { currentUser } = useUserContext();

  const { deleteUserVehicle, errorMsg, setErrorMsg } = useVehicleContext();

  const openDeleteMenu = () => setIsDeleteOpen(true);
  const closeDeleteMenu = () => {
    setIsDeleteOpen(false);
    setErrorMsg("");
  };

  const openEditMenu = () => setIsEditOpen(true);
  const closeEditMenu = () => setIsEditOpen(false);

  const handleDeleteVehicle = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    const isSuccess = await deleteUserVehicle(veh.licensePlate);
    if (isSuccess) closeDeleteMenu();
    setIsDeleting(false);
  };

  const imageUrl = parseImgs(veh.image);
  const fullName = `${veh.brandName} ${veh.modelName}`;
  // Admin inventory vehicles already contain their authoritative owner from
  // the backend. My Vehicles does not join owner details, so only that view
  // needs the signed-in owner as a fallback.
  const vehicleForDetails = admin
    ? veh
    : {
        ...veh,
        ownerFirstName: veh.ownerFirstName ?? currentUser?.firstName,
        ownerLastName: veh.ownerLastName ?? currentUser?.lastName,
        ownerPhone: veh.ownerPhone ?? currentUser?.phone,
        ownerEmail: veh.ownerEmail ?? currentUser?.email,
      };
  const ownerFullName = [
    vehicleForDetails.ownerFirstName,
    vehicleForDetails.ownerLastName,
  ]
    .filter(Boolean)
    .join(" ");
  const ownerLabel =
    vehicleForDetails.ownerEmail || ownerFullName || "Unknown owner";
  const isOwnerBlocked =
    admin && String(vehicleForDetails.ownerStatus).toLowerCase() === "blocked";
  const displayedStatus = admin
    ? getVehicleDisplayStatus(vehicleForDetails)
    : veh.status || "unknown";
  const eligibilitySummary =
    !admin && veh.rentalEligibility
      ? buildVehicleEligibilitySummary(veh.rentalEligibility)
      : null;
  const adminStatusDescription = isOwnerBlocked
    ? ", unavailable because the owner account is blocked"
    : `, status ${formatVehicleStatus(displayedStatus)}`;

  const vehicleDetailsPath = `/vehicles/${encodeURIComponent(veh.licensePlate)}`;
  const documentsSearch = new URLSearchParams({
    vehicle: String(veh.licensePlate),
  }).toString();
  const vehicleDetailsState = {
    vehicle: vehicleForDetails,
    returnTo: admin ? "/allVehicles" : "/myVehicles",
  };
  const statusClass =
    {
      available: styles.available,
      unavailable: styles.unavailable,
      not_validated: styles.notValidated,
      rented: styles.rented,
      maintenance: styles.maintenance,
      inactive: styles.inactive,
    }[displayedStatus] || styles.unknownStatus;

  const vehicleNameContent = (
    <>
      <img src={imageUrl} alt={fullName} />
      <div className={styles.nameAndYear}>
        <p className={styles.name}>{fullName}</p>
        <p className={styles.year}>{veh.year}</p>
        <p className={styles.licensePlate}>Plate: {veh.licensePlate}</p>
      </div>
    </>
  );

  const rowContent = (
    <>
      <div className={styles.vehicleIdentity}>
        <div className={styles.nameContainer}>{vehicleNameContent}</div>

        {!admin && activeReportCount !== 0 && (
          <button
            type="button"
            className={
              activeReportCount > 0
                ? styles.reportBadge
                : styles.reportBadgeMuted
            }
            onClick={() => onViewReports?.(veh)}
            title="View active reports"
          >
            <Flag size={12} />
            {activeReportCount === 1
              ? "1 active report"
              : `${activeReportCount} active reports`}
          </button>
        )}
      </div>

      <p className={styles.type}>
        <span className={styles.cellLabel}>Category</span>
        <span className={styles.cellValue}>{veh.carTypeName}</span>
      </p>
      <p className={styles.address}>
        <span className={styles.cellLabel}>
          {admin ? "Location" : "Address"}
        </span>
        <span className={styles.cellValue}>{veh.address}</span>
      </p>
      <p className={styles.price}>
        <span className={styles.cellLabel}>Price</span>
        <span className={styles.cellValue}>${veh.price}</span>
      </p>
      {admin && (
        <p
          className={styles.owner}
          title={
            isOwnerBlocked
              ? `${ownerLabel} - this owner account is blocked`
              : ownerLabel
          }
        >
          <span className={styles.cellLabel}>Owner</span>
          <span className={styles.cellValue}>{ownerLabel}</span>
          {isOwnerBlocked && (
            <span className={styles.blockedOwnerIndicator}>
              <Ban size={12} aria-hidden="true" />
              Owner blocked
            </span>
          )}
        </p>
      )}
      <div className={styles.statusCell}>
        <span className={styles.cellLabel}>Status</span>
        <span className={`${styles.status} ${statusClass}`}>
          {formatVehicleStatus(displayedStatus)}
        </span>
      </div>

      {!admin && (
        <div className={styles.actionsContainer}>
          <span className={styles.cellLabel}>Actions</span>
          <div className={styles.actionButtons}>
            <button
              type="button"
              onClick={openEditMenu}
              aria-label={`Edit ${fullName}`}
              title="Edit vehicle"
            >
              <Pencil size={18} className="icon" aria-hidden="true" />
            </button>

            {veh.status !== "inactive" &&
              (veh.status === "rented" ? (
                <button
                  type="button"
                  className={styles.disabledAction}
                  title="Cannot delete rented vehicle"
                  aria-label={`Cannot delete rented vehicle ${fullName}`}
                  disabled
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.delete}
                  onClick={openDeleteMenu}
                  aria-label={`Delete ${fullName}`}
                  title="Delete vehicle"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              ))}
          </div>
        </div>
      )}

      {!admin && eligibilitySummary && !eligibilitySummary.eligible && (
        <div className={styles.eligibilityCell}>
          <span className={styles.cellLabel}>Verification</span>
          <div className={styles.eligibilitySummary}>
            <p className={styles.eligibilityTitle}>Verification incomplete</p>
            <ul className={styles.eligibilityChecks}>
              {eligibilitySummary.checks.map((check) => (
                <li key={check.key}>
                  {check.ok ? "✓" : "✗"} {check.label}
                </li>
              ))}
            </ul>
            <Link
              to={`/profile?${documentsSearch}#documents`}
              className={styles.eligibilityAction}
              aria-label={`Manage documents for ${fullName}, license plate ${veh.licensePlate}`}
            >
              Manage Documents
            </Link>
          </div>
        </div>
      )}
    </>
  );

  if (admin) {
    return (
      <Link
        className={`${styles.VehiclesCardsTable} ${styles.adminRow}`}
        to={vehicleDetailsPath}
        state={vehicleDetailsState}
        aria-label={`View details for ${fullName}, license plate ${veh.licensePlate}${adminStatusDescription}`}
      >
        {rowContent}
      </Link>
    );
  }

  return (
    <div className={`${styles.VehiclesCardsTable} ${styles.ownerRow}`}>
      <Link
        className={styles.ownerDetailsLink}
        to={vehicleDetailsPath}
        state={vehicleDetailsState}
        aria-label={`View details for ${fullName}, license plate ${veh.licensePlate}`}
      />
      {rowContent}

      <DeleteMenu
        img={imageUrl}
        location={veh.address}
        name={fullName}
        closeMenu={closeDeleteMenu}
        isOpen={isDeleteOpen}
        handleDeleteVehicle={handleDeleteVehicle}
        errorMsg={errorMsg}
        isDeleting={isDeleting}
      />

      <AddEditVehicleMenu
        isOpen={isEditOpen}
        onClose={closeEditMenu}
        vehicle={veh}
      />
    </div>
  );
};

export default VehiclesCardsTable;

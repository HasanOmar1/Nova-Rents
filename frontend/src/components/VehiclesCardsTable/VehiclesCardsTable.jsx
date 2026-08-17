import { useState } from "react";
import DeleteMenu from "../DeleteMenu/DeleteMenu";
import styles from "./VehiclesCardsTable.module.css";
import { Flag, Pencil, Trash2 } from "lucide-react";
import { useVehicleContext } from "../../context/VehicleContext";
import AddEditVehicleMenu from "../AddEditVehicleMenu/AddEditVehicleMenu";
import { Link } from "react-router-dom";
import { parseImgs } from "../../utils/parseImgs";
import { useUserContext } from "../../context/UserContext";

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

  return (
    <div className={styles.VehiclesCardsTable}>
      <div className={styles.vehicleIdentity}>
        <Link
          className={styles.nameContainer}
          to={`/vehicles/${veh.licensePlate}`}
          state={{
            vehicle: vehicleForDetails,
            returnTo: admin ? "/allVehicles" : "/myVehicles",
          }}
        >
          <img src={imageUrl} alt={fullName} />
          <div className={styles.nameAndYear}>
            <p className={styles.name}>{fullName}</p>
            <p className={styles.year}>{veh.year}</p>
          </div>
        </Link>

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

      <p className={styles.type}>{veh.carTypeName}</p>
      <p className={styles.address}>{veh.address}</p>
      <p className={styles.price}>${veh.price}</p>
      {admin && <p className={styles.owner}>{ownerLabel}</p>}
      <p
        className={`${styles.status} ${veh.status === "available" ? styles.available : veh.status === "rented" ? styles.rented : styles.maintenance} `}
      >
        {veh.status}
      </p>

      {!admin && (
        <div className={styles.actionsContainer}>
          <p onClick={openEditMenu}>
            <Pencil size={18} className="icon" />
          </p>

          {veh.status !== "inactive" && (
            <>
              {veh.status === "rented" ? (
                <p
                  className={styles.disabledAction}
                  title="Cannot delete rented vehicle"
                  style={{ cursor: "not-allowed", opacity: 0.3 }}
                >
                  <Trash2 size={18} />
                </p>
              ) : (
                <p className={styles.delete} onClick={openDeleteMenu}>
                  <Trash2 size={18} />
                </p>
              )}
            </>
          )}
        </div>
      )}

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

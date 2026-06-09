import { useState } from "react";
import DeleteMenu from "../DeleteMenu/DeleteMenu";
import styles from "./VehiclesCardsTable.module.css";
import { Pencil, Trash2 } from "lucide-react";
import { useVehicleContext } from "../../context/VehicleContext";
import AddEditVehicleMenu from "../AddEditVehicleMenu/AddEditVehicleMenu";
import { Link } from "react-router-dom";
import { parseImgs } from "../../utils/parseImgs";
import { useUserContext } from "../../context/UserContext";

const VehiclesCardsTable = ({ veh, admin }) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { currentUser } = useUserContext();

  const { deleteUserVehicle, errorMsg } = useVehicleContext();

  const openDeleteMenu = () => setIsDeleteOpen(true);
  const closeDeleteMenu = () => setIsDeleteOpen(false);

  const openEditMenu = () => setIsEditOpen(true);
  const closeEditMenu = () => setIsEditOpen(false);

  const handleDeleteVehicle = async () => {
    const isSuccess = await deleteUserVehicle(veh.licensePlate);
    if (isSuccess) closeDeleteMenu();
  };

  const imageUrl = parseImgs(veh.image);
  const fullName = `${veh.brandName} ${veh.modelName}`;
  const ownerFullName = `${currentUser.firstName} ${currentUser.lastName}`;

  const vehWithUser = {
    ...veh,
    ownerFirstName: currentUser?.firstName,
    ownerLastName: currentUser?.lastName,
    ownerPhone: currentUser?.phone,
  };

  return (
    <div className={styles.VehiclesCardsTable}>
      <Link
        className={styles.nameContainer}
        to={`/vehicles/${veh.licensePlate}`}
        state={vehWithUser}
      >
        <img src={imageUrl} alt={fullName} />
        <div className={styles.nameAndYear}>
          <p className={styles.name}>{fullName}</p>
          <p className={styles.year}>{veh.year}</p>
        </div>
      </Link>

      <p className={styles.type}>{veh.carTypeName}</p>
      <p className={styles.address}>{veh.address}</p>
      <p className={styles.price}>${veh.price}</p>
      {admin && <p className={styles.owner}>{ownerFullName}</p>}
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
          <p className={styles.delete} onClick={openDeleteMenu}>
            <Trash2 size={18} />
          </p>
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

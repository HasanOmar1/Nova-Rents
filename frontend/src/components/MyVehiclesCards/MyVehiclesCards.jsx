import { useState } from "react";
import DeleteMenu from "../DeleteMenu/DeleteMenu";
import styles from "./MyVehiclesCards.module.css";
import { Pencil, Trash2 } from "lucide-react";
import { useVehicleContext } from "../../context/VehicleContext";
import AddEditVehicleMenu from "../AddEditVehicleMenu/AddEditVehicleMenu";

const MyVehiclesCards = ({ veh }) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { deleteUserVehicle, errorMsg } = useVehicleContext();

  const openDeleteMenu = () => setIsDeleteOpen(true);
  const closeDeleteMenu = () => setIsDeleteOpen(false);

  const openEditMenu = () => setIsEditOpen(true);
  const closeEditMenu = () => setIsEditOpen(false);

  const handleDeleteVehicle = async () => {
    const isSuccess = await deleteUserVehicle(veh.licensePlate);
    if (isSuccess) closeDeleteMenu();
  };

  let parsedImages = [];
  try {
    parsedImages = JSON.parse(veh.image);
  } catch (error) {
    parsedImages = [veh.image];
  }

  const mainImage = parsedImages[0];
  const imageUrl = `http://localhost:3000/uploads/${mainImage}`;

  const fullName = `${veh.brandName} ${veh.modelName}`;

  return (
    <div className={styles.MyVehiclesCards}>
      <div className={styles.nameContainer}>
        <img src={imageUrl} alt={fullName} />
        <div className={styles.nameAndYear}>
          <p className={styles.name}>{fullName}</p>
          <p className={styles.year}>{veh.year}</p>
        </div>
      </div>

      <p className={styles.type}>{veh.carTypeName}</p>
      <p className={styles.location}>{veh.address}</p>
      <p className={styles.price}>${veh.price}</p>

      <div className={styles.actionsContainer}>
        <p onClick={openEditMenu} style={{ cursor: "pointer" }}>
          <Pencil size={18} className="icon" />
        </p>
        <p
          className={styles.delete}
          onClick={openDeleteMenu}
          style={{ cursor: "pointer" }}
        >
          <Trash2 size={18} />
        </p>
      </div>

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

export default MyVehiclesCards;

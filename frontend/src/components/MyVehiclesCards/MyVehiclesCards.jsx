import { useState } from "react";
import DeleteMenu from "../DeleteMenu/DeleteMenu";
import styles from "./MyVehiclesCards.module.css";
import { Pencil, Trash2 } from "lucide-react";
import { useVehicleContext } from "../../context/VehicleContext";

const MyVehiclesCards = ({
  img,
  name,
  year,
  type,
  location,
  price,
  licensePlate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { deleteUserVehicle, errorMsg } = useVehicleContext();

  const openDeleteMenu = () => setIsOpen(true);
  const closeDeleteMenu = () => setIsOpen(false);

  const handleDeleteVehicle = async () => {
    const isSuccess = await deleteUserVehicle(licensePlate);

    if (isSuccess) closeDeleteMenu();
  };

  return (
    <div className={styles.MyVehiclesCards}>
      <div className={styles.nameContainer}>
        <img src={img} alt={name} />
        <div className={styles.nameAndYear}>
          <p className={styles.name}>{name}</p>
          <p className={styles.year}>{year}</p>
        </div>
      </div>

      <p className={styles.type}>{type}</p>
      <p className={styles.location}>{location}</p>
      <p className={styles.price}>${price}</p>

      <div className={styles.actionsContainer}>
        <p>
          <Pencil size={18} className="icon" />
        </p>
        <p className={styles.delete} onClick={openDeleteMenu}>
          <Trash2 size={18} />
        </p>
      </div>

      <DeleteMenu
        img={img}
        location={location}
        name={name}
        closeMenu={closeDeleteMenu}
        isOpen={isOpen}
        handleDeleteVehicle={handleDeleteVehicle}
        errorMsg={errorMsg}
      />
    </div>
  );
};

export default MyVehiclesCards;

// Defines the Delete Menu React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import styles from "./DeleteMenu.module.css";
import { TriangleAlert } from "lucide-react";
import AsyncButton from "../AsyncButton/AsyncButton";
import { useModalDialog } from "../../hooks/useModalDialog";

// Renders the Delete Menu interface.
// Accepts an options object and returns rendered JSX.
const DeleteMenu = ({
  img,
  name,
  location,
  closeMenu,
  isOpen,
  handleDeleteVehicle,
  errorMsg,
  isDeleting,
}) => {
  const dialogRef = useModalDialog(isOpen);

  return (
    <dialog className={styles.DeleteMenu} ref={dialogRef} onClose={closeMenu}>
      <div className={styles.top}>
        <p>DEACTIVATE VEHICLE</p>
        <p>
          <TriangleAlert size={18} color="#c02424" />
        </p>
      </div>

      <div className={styles.container}>
        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
        <p className={styles.sureMsg}>
          Are you sure you want to deactivate the vehicle listed below?
        </p>
        <div className={styles.mid}>
          <div className={styles.imgContainer}>
            <img src={img} alt={name} />
            <div className={styles.nameAndLocation}>
              <p>{name}</p>
              <p className={styles.location}>{location}</p>
            </div>
          </div>
        </div>

        <p className={styles.warningMsg}>
          This will hide the vehicle from public listings and stop new bookings.
          You can restore it to "Available" at any time by editing the vehicle.
        </p>

        <div className={styles.btnsContainer}>
          <button className={styles.cancelBtn} onClick={closeMenu} disabled={isDeleting}>
            Cancel
          </button>
          <AsyncButton className={styles.deleteBtn} onClick={handleDeleteVehicle} loading={isDeleting} loadingText="Deactivating...">
            Deactivate Vehicle
          </AsyncButton>
        </div>
      </div>
    </dialog>
  );
};

export default DeleteMenu;

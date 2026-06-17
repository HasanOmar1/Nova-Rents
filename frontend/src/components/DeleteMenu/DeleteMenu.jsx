import { useEffect, useRef } from "react";
import styles from "./DeleteMenu.module.css";
import { TriangleAlert } from "lucide-react";

const DeleteMenu = ({
  img,
  name,
  location,
  closeMenu,
  isOpen,
  handleDeleteVehicle,
  errorMsg,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

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
          <button className={styles.cancelBtn} onClick={closeMenu}>
            Cancel
          </button>
          <button className={styles.deleteBtn} onClick={handleDeleteVehicle}>
            Deactivate Vehicle
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default DeleteMenu;

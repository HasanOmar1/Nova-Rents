import { useState, useEffect, useRef } from "react";
import styles from "./AddVehicleMenu.module.css";

const AddVehicleMenu = ({ isOpen, onClose }) => {
  const dialogRef = useRef(null);

  const [formData, setFormData] = useState({
    modelId: "",
    licensePlate: "",
    year: "",
    color: "",
    fuelType: "Petrol",
    km: "",
    price: "",
    address: "",
    expirationDate: "",
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    console.log("Selected file:", file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitting to MySQL:", formData);
  };

  return (
    <dialog className={styles.AddVehicleMenu} ref={dialogRef} onClose={onClose}>
      <div className={styles.header}>
        <h2>Add New Vehicle</h2>
        <p>List a new luxury vehicle in your fleet.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <label>Model ID / Name</label>
            <input
              type="text"
              name="modelId"
              onChange={handleChange}
              required
              placeholder="e.g. Porsche 911"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>License Plate</label>
            <input
              type="text"
              name="licensePlate"
              onChange={handleChange}
              required
              placeholder="ABC-1234"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Year</label>
            <input
              type="number"
              name="year"
              onChange={handleChange}
              required
              placeholder="2023"
              min="1900"
              max="2025"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Color</label>
            <input
              type="text"
              name="color"
              onChange={handleChange}
              required
              placeholder="Obsidian Black"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Mileage (KM)</label>
            <input
              type="number"
              name="km"
              onChange={handleChange}
              required
              placeholder="15000"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Daily Price ($)</label>
            <input
              type="number"
              name="price"
              onChange={handleChange}
              required
              placeholder="450"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Fuel Type</label>
            <select name="fuelType" onChange={handleChange}>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <div className={`${styles.inputGroup}`}>
            <label>Location / Address</label>
            <input
              type="text"
              name="address"
              onChange={handleChange}
              required
              placeholder="e.g. Tel Aviv, Israel"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Listing Expiration Date</label>
            <input
              type="date"
              name="expirationDate"
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Vehicle Image</label>
            <label htmlFor="vehicle-image" className={styles.uploadButton}>
              + Click to browse image
            </label>
            <input
              id="vehicle-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn}>
            Save Vehicle
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default AddVehicleMenu;

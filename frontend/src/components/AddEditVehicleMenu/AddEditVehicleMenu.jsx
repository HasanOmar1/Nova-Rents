import { useState, useEffect, useRef } from "react";
import styles from "./AddEditVehicleMenu.module.css";
import { useVehicleContext } from "../../context/VehicleContext";

const initialFormState = {
  brandId: "0",
  modelId: "",
  carTypeId: "",
  licensePlate: "",
  year: "",
  color: "",
  fuelType: "Petrol",
  km: "",
  price: "",
  address: "",
  expirationDate: "",
  images: [],
};

const AddEditVehicleMenu = ({ isOpen, onClose, vehicle = null }) => {
  const dialogRef = useRef(null);
  const [formData, setFormData] = useState(initialFormState);

  const {
    getBrands,
    vehiclesBrands,
    getModelsByBrand,
    vehicleModel,
    getVehType,
    vehiclesType,
    addVehicle,
    updateVehicle,
    errorMsg,
    setErrorMsg,
  } = useVehicleContext();

  useEffect(() => {
    getBrands();
    getVehType();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        // --- EDIT MODE: Pre-fill the form ---
        setFormData({
          brandId: vehicle.brandId || "0",
          modelId: vehicle.modelId || "",
          carTypeId: vehicle.carTypeId || "",
          licensePlate: vehicle.licensePlate || "",
          year: vehicle.year || "",
          color: vehicle.color || "",
          fuelType: vehicle.fuelType || "Petrol",
          km: vehicle.km || "",
          price: vehicle.price || "",
          address: vehicle.address || "",
          expirationDate: vehicle.expirationDate
            ? vehicle.expirationDate.split("T")[0]
            : "",
          images: [],
        });

        if (vehicle.brandId) {
          getModelsByBrand(vehicle.brandId);
        }
      } else {
        // --- ADD MODE: Clear the form ---
        setFormData(initialFormState);
      }
    }
  }, [vehicle, isOpen]);

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
    const { name, value } = e.target;

    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // If user changes Brand, reset Model and Type
      if (name === "brandId") {
        newData.modelId = "";
        newData.carTypeId = "";
        getModelsByBrand(value);
      }
      // If user changes Model, reset Type
      else if (name === "modelId") {
        newData.carTypeId = "";
      }

      return newData;
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 4);
    setFormData((prev) => ({ ...prev, images: files }));
  };

  const clearImages = () => {
    setFormData((prev) => ({ ...prev, images: [] }));
  };

  const handleCloseAndReset = () => {
    setFormData(initialFormState);
    onClose();
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submitData = new FormData();

    submitData.append("modelId", formData.modelId);
    submitData.append("licensePlate", formData.licensePlate);
    submitData.append("year", formData.year);
    submitData.append("color", formData.color);
    submitData.append("fuelType", formData.fuelType);
    submitData.append("km", formData.km);
    submitData.append("price", formData.price);
    submitData.append("address", formData.address);
    submitData.append("expirationDate", formData.expirationDate);

    if (formData.images && formData.images.length > 0) {
      formData.images.forEach((file) => {
        submitData.append("images", file);
      });
    }

    // --- DYNAMIC SUBMISSION ---
    let isSuccess;
    if (vehicle) {
      isSuccess = await updateVehicle(formData.licensePlate, submitData);
    } else {
      isSuccess = await addVehicle(submitData);
    }

    if (isSuccess) handleCloseAndReset();
  };

  // Helper variable to easily check the current mode
  const isEditMode = Boolean(vehicle);

  // Creates a unique ID for the file input
  const uniqueInputId = isEditMode
    ? `image-upload-${vehicle.licensePlate}`
    : "image-upload-new";

  return (
    <dialog
      className={styles.AddEditVehicleMenu}
      ref={dialogRef}
      onClose={handleCloseAndReset}
    >
      <div className={styles.header}>
        <h2>{isEditMode ? "Edit Vehicle" : "Add New Vehicle"}</h2>
        <p>
          {isEditMode
            ? "Update your vehicle's details and listings."
            : "List a new luxury vehicle in your fleet."}
        </p>
        {errorMsg && <p className={styles.errorMsg}> {errorMsg}</p>}
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <label>Vehicle Brand</label>
            <select
              name="brandId"
              value={formData.brandId}
              onChange={handleChange}
              required
            >
              <option value="0" disabled hidden>
                Select Brand
              </option>
              {vehiclesBrands?.map((b) => {
                return (
                  <option key={b.brandId} value={b.brandId}>
                    {b.brandName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* MODEL SELECT */}
          <div className={styles.inputGroup}>
            <label>Vehicle Model</label>
            <select
              name="modelId"
              value={formData.modelId}
              onChange={handleChange}
              disabled={formData.brandId === "0"}
              required
            >
              <option value="" disabled hidden>
                {formData.brandId === "0"
                  ? "Pick a brand first"
                  : "Select Model"}
              </option>
              {vehicleModel?.map((m) => {
                return (
                  <option key={m.modelId} value={m.modelId}>
                    {m.modelName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* TYPE SELECT */}
          <div className={styles.inputGroup}>
            <label>Vehicle Category</label>
            <select
              name="carTypeId"
              value={formData.carTypeId}
              onChange={handleChange}
              disabled={formData.modelId === ""}
              required
            >
              <option value="" disabled hidden>
                {formData.modelId === ""
                  ? "Pick a model first"
                  : "Select Category"}
              </option>
              {vehiclesType?.map((t) => {
                return (
                  <option key={t.carTypeId} value={t.carTypeId}>
                    {t.carTypeName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>License Plate</label>
            <input
              type="text"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleChange}
              required
              placeholder="ABC-1234"
              disabled={isEditMode}
              style={isEditMode ? { opacity: 0.6, cursor: "not-allowed" } : {}}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Year</label>
            <input
              type="number"
              name="year"
              value={formData.year}
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
              value={formData.color}
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
              value={formData.km}
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
              value={formData.price}
              onChange={handleChange}
              required
              placeholder="450"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Fuel Type</label>
            <select
              name="fuelType"
              value={formData.fuelType}
              onChange={handleChange}
            >
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
              value={formData.address}
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
              value={formData.expirationDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>
              {isEditMode
                ? "Update Images (Optional)"
                : "Vehicle Image (Max: 4)"}
            </label>

            {/* Only show the upload button if they have LESS than 4 images */}
            {(!formData.images || formData.images.length < 4) && (
              <>
                <label htmlFor={uniqueInputId} className={styles.uploadButton}>
                  {isEditMode
                    ? "+ Upload new images to overwrite old ones"
                    : "+ Click to browse image"}
                </label>
                <input
                  id={uniqueInputId}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </>
            )}

            {/* Status text to show how many images are selected and a Clear button */}
            {formData.images && formData.images.length > 0 && (
              <div className={styles.selectedImagesContainer}>
                <p>{formData.images.length} / 4 images selected</p>
                <button type="button" onClick={clearImages}>
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleCloseAndReset}
          >
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn}>
            {isEditMode ? "Save Changes" : "Save Vehicle"}
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default AddEditVehicleMenu;

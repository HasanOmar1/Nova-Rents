import { useState, useEffect, useRef } from "react";
import styles from "./AddEditVehicleMenu.module.css";
import { useVehicleContext } from "../../context/VehicleContext";
import { useGovApisContext } from "../../context/GovApisContext";
import { useActivityContext } from "../../context/ActivityContext";

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
  status: "available",
  details: "",
  seats: "5",
  images: [],
};

const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    updateVehicleStatus,
    errorMsg,
    setErrorMsg,
  } = useVehicleContext();

  const { getCities, cities, isLoading } = useGovApisContext();

  useEffect(() => {
    if (isOpen) {
      if (!vehiclesBrands || vehiclesBrands.length === 0) getBrands();
      if (!vehiclesType || vehiclesType.length === 0) getVehType();
      if (!cities || cities.length === 0) getCities();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        setFormData({
          brandId: vehicle.brandId ? String(vehicle.brandId) : "0",
          modelId: vehicle.modelId ? String(vehicle.modelId) : "",
          carTypeId: vehicle.carTypeId ? String(vehicle.carTypeId) : "",
          licensePlate: vehicle.licensePlate || "",
          year: vehicle.year || "",
          color: vehicle.color || "",
          fuelType: vehicle.fuelType || "Petrol",
          km: vehicle.km || "",
          price: vehicle.price || "",
          address: vehicle.address || "",
          expirationDate: vehicle.expirationDate
            ? formatDateForInput(vehicle.expirationDate)
            : "",
          status: vehicle.status || "available",
          details: vehicle.details || "",
          seats: vehicle.seats || "5",
          images: [],
        });

        if (vehicle.brandId) {
          getModelsByBrand(vehicle.brandId);
        }
      } else {
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

      if (name === "brandId") {
        newData.modelId = "";
        newData.carTypeId = "";
        getModelsByBrand(value);
      } else if (name === "modelId") {
        // --- NEW: AUTO-FILL CATEGORY BASED ON MODEL ---
        // When they pick a model, we find that model in the array and grab its carTypeId
        const selectedModel = vehicleModel.find(
          (m) => String(m.modelId) === String(value),
        );
        if (selectedModel) {
          newData.carTypeId = String(selectedModel.carTypeId);
        }
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
    submitData.append("details", formData.details);
    submitData.append("seats", formData.seats);

    if (formData.images && formData.images.length > 0) {
      formData.images.forEach((file) => {
        submitData.append("images", file);
      });
    }

    let isSuccess;
    if (vehicle) {
      const statusChanged = formData.status !== vehicle.status;

      isSuccess = await updateVehicle(formData.licensePlate, submitData);

      if (isSuccess && statusChanged) {
        isSuccess = await updateVehicleStatus(
          formData.licensePlate,
          formData.status,
        );
      }
    } else {
      isSuccess = await addVehicle(submitData);
    }

    if (isSuccess) handleCloseAndReset();
  };

  const isEditMode = Boolean(vehicle);

  const uniqueInputId = isEditMode
    ? `image-upload-${vehicle.licensePlate}`
    : "image-upload-new";

  // --- NEW: Find the matching category name to display in the read-only input ---
  const selectedCategory = vehiclesType?.find(
    (t) => String(t.carTypeId) === formData.carTypeId,
  );
  const displayCategoryName = selectedCategory
    ? selectedCategory.carTypeName
    : "";

  return (
    <dialog
      className={styles.AddEditVehicleMenu}
      ref={dialogRef}
      onClose={handleCloseAndReset}
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: "default" }}
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
                  <option key={b.brandId} value={String(b.brandId)}>
                    {b.brandName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>Vehicle Model</label>
            <select
              name="modelId"
              value={formData.modelId}
              onChange={handleChange}
              disabled={formData.brandId === "0" || formData.brandId === ""}
              required
            >
              <option value="" disabled hidden>
                {formData.brandId === "0" || formData.brandId === ""
                  ? "Pick a brand first"
                  : "Select Model"}
              </option>
              {vehicleModel?.map((m) => {
                return (
                  <option key={m.modelId} value={String(m.modelId)}>
                    {m.modelName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>Category (Auto-filled)</label>
            <input
              type="text"
              value={displayCategoryName}
              disabled
              placeholder={
                formData.modelId === "" ? "Pick a model first" : "Auto-filled"
              }
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            />
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
            <label>Location / City</label>
            <select
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            >
              <option value="" disabled hidden>
                {isLoading ? "Loading cities..." : "Select a city"}
              </option>

              {cities?.map((city) => {
                const displayName = city.nameEn?.trim()
                  ? city.nameEn.trim()
                  : city.name.trim();

                return (
                  <option key={city.id} value={displayName}>
                    {displayName}
                  </option>
                );
              })}
            </select>
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
            <label>Number of Seats</label>
            <input
              type="number"
              name="seats"
              value={formData.seats}
              onChange={handleChange}
              required
              min="1"
              max="15"
            />
          </div>

          <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
            <label>Vehicle Details & Description</label>
            <textarea
              name="details"
              value={formData.details}
              onChange={handleChange}
              placeholder="Tell renters about the premium features, sound system, or driving experience..."
              rows="4"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                backgroundColor: "var(--input-bg)",
                color: "white",
                border: "var(--cards-border)",
              }}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>
              {isEditMode
                ? "Update Images (Optional)"
                : "Vehicle Image (Max: 4)"}
            </label>

            {(!formData.images || formData.images.length < 4) && (
              <>
                <label htmlFor={uniqueInputId} className={styles.uploadButton}>
                  {isEditMode
                    ? "+ Upload new images"
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

            {formData.images && formData.images.length > 0 && (
              <div className={styles.selectedImagesContainer}>
                <p>{formData.images.length} / 4 images selected</p>
                <button type="button" onClick={clearImages}>
                  Clear
                </button>
              </div>
            )}
          </div>

          {isEditMode && vehicle?.status === "inactive" ? (
            <div className={styles.restoreBanner}>
              <p>⚠️ This vehicle is currently inactive.</p>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.status === "available"}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.checked ? "available" : "inactive",
                    }));
                  }}
                />
                <p>Restore vehicle to "Available"</p>
              </label>
            </div>
          ) : (
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="status"
                  checked={formData.status === "maintenance"}
                  disabled={formData.status === "rented"}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.checked ? "maintenance" : "available",
                    }));
                  }}
                />
                <p>Mark as "Under Maintenance"</p>
              </label>
            </div>
          )}
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

import { useState, useEffect, useRef } from "react";
import styles from "./AddEditVehicleMenu.module.css";
import { useVehicleContext } from "../../context/VehicleContext";
import { useGovApisContext } from "../../context/GovApisContext";
import { formattedMinDate } from "../../utils/minMaxDate";
import ExactPickupLocationPicker from "../ExactPickupLocationPicker/ExactPickupLocationPicker";
import AsyncButton from "../AsyncButton/AsyncButton";

const initialFormState = {
  brandId: "0",
  modelId: "",
  carTypeId: "",
  licensePlate: "",
  year: "",
  color: "",
  fuelType: "Petrol",
  transmission: "Automatic",
  km: "",
  price: "",
  address: "",
  exactPickupAddress: "",
  pickupLatitude: "",
  pickupLongitude: "",
  pickupInstructions: "",
  googlePlaceId: "",
  expirationDate: "",
  status: "available",
  details: "",
  seats: "4",
  images: [],
};

const VEHICLE_COLORS = [
  "Beige",
  "Black",
  "Blue",
  "Bronze",
  "Brown",
  "Burgundy",
  "Champagne",
  "Copper",
  "Cream",
  "Dark Blue",
  "Dark Brown",
  "Dark Gray",
  "Dark Green",
  "Dark Red",
  "Gold",
  "Gray",
  "Green",
  "Ivory",
  "Light Blue",
  "Light Gray",
  "Light Green",
  "Maroon",
  "Navy Blue",
  "Olive",
  "Orange",
  "Pearl White",
  "Pink",
  "Purple",
  "Red",
  "Silver",
  "Tan",
  "Teal",
  "Turquoise",
  "Violet",
  "White",
  "Yellow",
  "Other",
];

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          transmission: vehicle.transmission || "Automatic",
          km: vehicle.km || "",
          price: vehicle.price || "",
          address: vehicle.address || "",
          exactPickupAddress: vehicle.exactPickupAddress || "",
          pickupLatitude:
            vehicle.pickupLatitude != null
              ? String(vehicle.pickupLatitude)
              : "",
          pickupLongitude:
            vehicle.pickupLongitude != null
              ? String(vehicle.pickupLongitude)
              : "",
          pickupInstructions: vehicle.pickupInstructions || "",
          googlePlaceId: vehicle.googlePlaceId || "",
          expirationDate: vehicle.expirationDate
            ? formatDateForInput(vehicle.expirationDate)
            : "",
          status: vehicle.status || "available",
          details: vehicle.details || "",
          seats: vehicle.seats || "4",
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
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  // --- SCROLL TO TOP ON ERROR ---
  useEffect(() => {
    if (errorMsg && dialogRef.current) {
      dialogRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [errorMsg]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      if (name === "brandId") {
        newData.modelId = "";
        newData.carTypeId = "";
        getModelsByBrand(value);
      } else if (name === "modelId") {
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
    if (isSubmitting) return;
    setIsSubmitting(true);

    const submitData = new FormData();

    submitData.append("modelId", formData.modelId);
    submitData.append("licensePlate", formData.licensePlate);
    submitData.append("year", formData.year);
    submitData.append("color", formData.color);
    submitData.append("fuelType", formData.fuelType);
    submitData.append("transmission", formData.transmission);
    submitData.append("km", formData.km);
    submitData.append("price", formData.price);
    submitData.append("address", formData.address);
    submitData.append("exactPickupAddress", formData.exactPickupAddress);
    submitData.append("pickupLatitude", formData.pickupLatitude);
    submitData.append("pickupLongitude", formData.pickupLongitude);
    submitData.append("pickupInstructions", formData.pickupInstructions || "");
    if (formData.googlePlaceId) {
      submitData.append("googlePlaceId", formData.googlePlaceId);
    }
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
    setIsSubmitting(false);
  };

  const isEditMode = Boolean(vehicle);

  const uniqueInputId = isEditMode
    ? `image-upload-${vehicle.licensePlate}`
    : "image-upload-new";

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
      onCancel={(e) => {
        e.preventDefault();
        handleCloseAndReset();
      }}
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
        )}

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
              max={new Date().getFullYear() + 1}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Color</label>

            <select
              name="color"
              value={formData.color}
              onChange={handleChange}
              required
            >
              <option value="" disabled hidden>
                Select Color
              </option>

              {VEHICLE_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
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
              max={999999}
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

          <div className={styles.inputGroup}>
            <label>Transmission</label>
            <select
              name="transmission"
              value={formData.transmission}
              onChange={handleChange}
            >
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
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
              min={formattedMinDate}
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
              placeholder="4"
              required
              min="1"
              max="15"
            />
          </div>
        </div>
        <ExactPickupLocationPicker
          value={{
            exactPickupAddress: formData.exactPickupAddress,
            pickupLatitude: formData.pickupLatitude,
            pickupLongitude: formData.pickupLongitude,
            pickupInstructions: formData.pickupInstructions,
            googlePlaceId: formData.googlePlaceId,
          }}
          onChange={(partial) =>
            setFormData((prev) => ({ ...prev, ...partial }))
          }
        />
        <div className={styles.textAreaAndUpload}>
          <div className={`${styles.inputGroup} ${styles.inputGroupTextArea}`}>
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

          <div className={styles.textAreaAndUpload}>
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
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleCloseAndReset}
          >
            Cancel
          </button>
          <AsyncButton type="submit" className={styles.submitBtn} loading={isSubmitting} loadingText={isEditMode ? "Saving changes..." : "Saving vehicle..."}>
            {isEditMode ? "Save Changes" : "Save Vehicle"}
          </AsyncButton>
        </div>
      </form>
    </dialog>
  );
};

export default AddEditVehicleMenu;

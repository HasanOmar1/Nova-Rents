import { useEffect, useRef, useState } from "react";
import styles from "./AddBrandVehicleMenu.module.css";
import { useVehicleContext } from "../../context/VehicleContext";
import axios from "axios";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useModalDialog } from "../../hooks/useModalDialog";

const AddBrandVehicleMenu = ({ isOpen, onClose }) => {
  const dialogRef = useModalDialog(isOpen);
  const modelCacheRef = useRef({});
  const { vehiclesBrands, vehiclesType, getBrands, getVehType } =
    useVehicleContext();

  // Brand States
  const [brandSelection, setBrandSelection] = useState("0");
  const [customBrandName, setCustomBrandName] = useState("");
  const [apiMakes, setApiMakes] = useState([]);
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);

  // Model States
  const [vpicModels, setVpicModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState("0");

  // Type States
  const [selectedType, setSelectedType] = useState("0");
  const [customTypeName, setCustomTypeName] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive the active brand name either from the database dropdown or the custom input
  const activeBrandName =
    brandSelection === "NEW"
      ? customBrandName
      : vehiclesBrands?.find((b) => String(b.brandId) === brandSelection)
          ?.brandName || "";
  const debouncedBrandName = useDebouncedValue(activeBrandName, 500);

  // Load initial data and reset the form around the dialog lifecycle.
  useEffect(() => {
    if (isOpen) {
      if (!vehiclesBrands || vehiclesBrands.length === 0) getBrands();
      if (!vehiclesType || vehiclesType.length === 0) getVehType();
    } else {
      handleResetForm();
    }
  }, [isOpen]);

  // 2. Fetch ALL Makes from API for the autocomplete datalist if "NEW" is selected
  useEffect(() => {
    if (brandSelection === "NEW" && apiMakes.length === 0) {
      fetchAllMakes();
    }
  }, [brandSelection]);

  const fetchAllMakes = async () => {
    setIsLoadingMakes(true);
    try {
      const res = await axios.get(
        "https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json",
        { withCredentials: false },
      );
      const makes = res.data.Results?.map((m) => m.Make_Name) || [];
      const uniqueMakes = [...new Set(makes)].sort();
      setApiMakes(uniqueMakes);
    } catch (error) {
      console.error("Failed to fetch all makes", error);
    } finally {
      setIsLoadingMakes(false);
    }
  };

  const fetchModelsFromVpic = async (make, signal) => {
    const cacheKey = make.trim().toLowerCase();

    // --- CHECK CACHE FIRST ---
    if (modelCacheRef.current[cacheKey]) {
      setVpicModels(modelCacheRef.current[cacheKey]);
      setSelectedModel("0");
      setIsLoadingModels(false);
      return;
    }

    setIsLoadingModels(true);
    setErrorMsg("");

    try {
      const res = await axios.get(
        `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(make)}?format=json`,
        { signal, withCredentials: false },
      );

      if (signal.aborted) return;

      const models = res.data.Results?.map((m) => m.Model_Name) || [];
      const uniqueModels = [...new Set(models)].sort();

      // --- SAVE TO CACHE ---
      modelCacheRef.current[cacheKey] = uniqueModels;

      setVpicModels(uniqueModels);
      setSelectedModel("0");
    } catch (error) {
      if (signal.aborted) return;

      console.error("Failed to fetch models", error);
      setErrorMsg("Could not fetch models for this brand.");
      setVpicModels([]);
    } finally {
      if (!signal.aborted) setIsLoadingModels(false);
    }
  };

  // Fetch models after the selected brand has stopped changing.
  useEffect(() => {
    const controller = new AbortController();
    const brandName = debouncedBrandName.trim();

    if (isOpen && brandName.length >= 2) {
      void fetchModelsFromVpic(brandName, controller.signal);
    } else {
      setVpicModels([]);
      setSelectedModel("0");
      setIsLoadingModels(false);
    }

    return () => controller.abort();
  }, [debouncedBrandName, isOpen]);

  const handleResetForm = () => {
    setBrandSelection("0");
    setCustomBrandName("");
    setSelectedModel("0");
    setSelectedType("0");
    setCustomTypeName("");
    setVpicModels([]);
    setErrorMsg("");
    setIsSubmitting(false);
  };

  const handleCloseAndReset = () => {
    handleResetForm();
    onClose();
  };

  // 4. Submit to your Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!brandSelection || brandSelection === "0") {
      return setErrorMsg("Please select a Brand.");
    }
    if (brandSelection === "NEW" && !customBrandName.trim()) {
      return setErrorMsg("Please enter a Brand Name.");
    }
    if (!selectedModel || selectedModel === "0") {
      return setErrorMsg("Please select a Model.");
    }
    if (!selectedType || selectedType === "0") {
      return setErrorMsg("Please select a Car Type.");
    }
    if (selectedType === "NEW" && !customTypeName.trim()) {
      return setErrorMsg("Please enter a Car Type Name.");
    }

    const payload = {
      brandId: brandSelection === "NEW" ? null : Number(brandSelection),
      brandName: activeBrandName.trim(),
      modelName: selectedModel.trim(),
      carTypeId: selectedType === "NEW" ? null : Number(selectedType),
      carTypeName: selectedType === "NEW" ? customTypeName.trim() : "",
    };

    try {
      setIsSubmitting(true);
      const res = await axios.post("/vehicles/addModel", payload);

      if (res.status === 200 || res.status === 201) {
        await getBrands();
        await getVehType(); // Refresh both context lists!
        handleCloseAndReset();
      }
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message || "Failed to save model to database.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        handleCloseAndReset(); // Fixes the Escape key bug!
      }}
      onClick={(e) => e.stopPropagation()}
      className={styles.AddBrandVehicleMenu}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h2>Add Brand & Model</h2>
          <p>
            Import official models from NHTSA or add custom database records.
          </p>
          {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
        </div>

        <div className={styles.inputContainer}>
          <label>Brand (Make)</label>
          <select
            value={brandSelection}
            onChange={(e) => {
              setBrandSelection(e.target.value);
              setSelectedModel("0");
            }}
          >
            <option value="0" disabled hidden>
              Select Brand
            </option>
            {vehiclesBrands?.map((brand) => (
              <option key={brand.brandId} value={String(brand.brandId)}>
                {brand.brandName}
              </option>
            ))}
            <option
              value="NEW"
              style={{ fontWeight: "bold", color: "#3b82f6" }}
            >
              + Add New Brand
            </option>
          </select>
        </div>

        {brandSelection === "NEW" && (
          <div className={styles.inputContainer}>
            <label>New Brand Name</label>
            <input
              type="text"
              placeholder={
                isLoadingMakes
                  ? "Loading NHTSA brands..."
                  : "Search NHTSA API brands..."
              }
              value={customBrandName}
              onChange={(e) => setCustomBrandName(e.target.value)}
              list="api-makes"
              required
            />
            {/* The datalist gives them an autocomplete dropdown of 10,000+ API makes! */}
            <datalist id="api-makes">
              {apiMakes.map((make) => (
                <option key={make} value={make} />
              ))}
            </datalist>
          </div>
        )}

        <div className={styles.inputContainer}>
          <label>Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={brandSelection === "0" || isLoadingModels}
          >
            <option value="0" disabled hidden>
              {isLoadingModels
                ? "Fetching models..."
                : brandSelection === "0"
                  ? "Select a brand first"
                  : vpicModels.length === 0
                    ? "No models found"
                    : "Select Model"}
            </option>
            {vpicModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputContainer}>
          <label>Car Type (Body Class)</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="0" disabled hidden>
              Select Type
            </option>
            {vehiclesType?.map((type) => (
              <option key={type.carTypeId} value={String(type.carTypeId)}>
                {type.carTypeName}
              </option>
            ))}
            <option
              value="NEW"
              style={{ fontWeight: "bold", color: "#3b82f6" }}
            >
              + Add New Car Type
            </option>
          </select>
        </div>

        {selectedType === "NEW" && (
          <div className={styles.inputContainer}>
            <label>New Car Type Name</label>
            <input
              type="text"
              placeholder="e.g. Convertible, Minivan..."
              value={customTypeName}
              onChange={(e) => setCustomTypeName(e.target.value)}
              required
            />
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleCloseAndReset}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save to Database"}
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default AddBrandVehicleMenu;

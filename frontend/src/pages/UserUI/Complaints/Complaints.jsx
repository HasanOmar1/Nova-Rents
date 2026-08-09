import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import styles from "./Complaints.module.css";
import ComplaintsHistoryCards from "../../../components/ComplaintsHistoryCards/ComplaintsHistoryCards";
import Pagination from "../../../components/Pagination/Pagination";
import { useComplaintContext } from "../../../context/ComplaintContext";
import { useVehicleContext } from "../../../context/VehicleContext";
import { useUserContext } from "../../../context/UserContext";
import { useRentContext } from "../../../context/RentContext";
import { parseImgs } from "../../../utils/parseImgs";
import { Car, History, ShieldAlert } from "lucide-react";

const TITLE_CHARACTER_LIMIT = 100;
const DESCRIPTION_CHARACTER_LIMIT = 1000;

const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatSubmittedDate = (value) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTripDate = (value) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const displayName = (firstName, lastName, email) => {
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();
  return fullName || email || "Unknown user";
};

const Complaints = () => {
  const {
    createComplaint,
    errorMsg,
    setErrorMsg,
    getMyComplaints,
    myComplaints,
    myComplaintsPagination,
    isMyComplaintsLoading,
    myComplaintsError,
    getReportsAboutMe,
    reportsAboutMe,
    reportsAboutMePagination,
    isReportsAboutMeLoading,
    reportsAboutMeError,
    getReportsAboutMyVehicles,
    reportsAboutMyVehicles,
    reportsAboutMyVehiclesPagination,
    isReportsAboutMyVehiclesLoading,
    reportsAboutMyVehiclesError,
  } = useComplaintContext();
  const { getVehicleByLicensePlate } = useVehicleContext();
  const { getUserById, currentUser } = useUserContext();
  const { fetchRentalHistory, rentalHistory } = useRentContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("vehicle");
  const [successMsg, setSuccessMsg] = useState("");
  const [localErrorMsg, setLocalErrorMsg] = useState("");
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVehicleLocked, setIsVehicleLocked] = useState(false);
  const [reportedVehicle, setReportedVehicle] = useState(null);
  const [isVehicleLoading, setIsVehicleLoading] = useState(false);
  const [isOwnerLocked, setIsOwnerLocked] = useState(false);
  const [reportedOwner, setReportedOwner] = useState(null);
  const [lockedOwnerId, setLockedOwnerId] = useState(null);
  const [isOwnerLoading, setIsOwnerLoading] = useState(false);
  const [lockedRentalId, setLockedRentalId] = useState(null);
  const [rentalSummary, setRentalSummary] = useState(null);
  const [formData, setFormData] = useState({
    relatedTarget: "",
    title: "",
    description: "",
    images: [],
  });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [fromDate, setFromDate] = useState(formatDateForInput(sixMonthsAgo));
  const [toDate, setToDate] = useState(formatDateForInput(today));
  const [statusFilter, setStatusFilter] = useState("all");
  const [appliedFromDate, setAppliedFromDate] = useState(fromDate);
  const [appliedToDate, setAppliedToDate] = useState(toDate);
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeHistoryView, setActiveHistoryView] = useState("history");
  const [reportsPage, setReportsPage] = useState(1);
  const [vehicleReportsPage, setVehicleReportsPage] = useState(1);

  const isRangeValid = Boolean(fromDate && toDate && fromDate <= toDate);
  const isTargetLoading = isVehicleLoading || isOwnerLoading;

  // Load My Trips once so rental summary can be shown without a new API.
  useEffect(() => {
    if (currentUser) {
      fetchRentalHistory();
    }
  }, [currentUser]);

  // Prefill from URL params (UX only). Invalid params fall back to the
  // normal unprefilled form without crashing.
  useEffect(() => {
    const complaintType = searchParams.get("complaintType");
    const plate = searchParams.get("vehicleLicensePlate")?.trim() || "";
    const ownerIdParam = searchParams.get("ownerId")?.trim() || "";
    const rentalIdParam = Number(searchParams.get("rentalId"));
    const hasValidRentalId =
      Number.isInteger(rentalIdParam) && rentalIdParam > 0;

    if (!complaintType && !plate && !ownerIdParam && !hasValidRentalId) {
      return;
    }

    let cancelled = false;

    const clearLocks = () => {
      setIsVehicleLocked(false);
      setReportedVehicle(null);
      setIsVehicleLoading(false);
      setIsOwnerLocked(false);
      setReportedOwner(null);
      setLockedOwnerId(null);
      setIsOwnerLoading(false);
      setLockedRentalId(null);
      setRentalSummary(null);
    };

    if (hasValidRentalId) {
      setLockedRentalId(rentalIdParam);
    } else {
      setLockedRentalId(null);
      setRentalSummary(null);
    }

    if (complaintType === "vehicle") {
      if (!/^\d{7,8}$/.test(plate)) {
        setLocalErrorMsg(
          "Invalid report link. Please select the complaint type and target manually.",
        );
        clearLocks();
        return;
      }

      if (!hasValidRentalId) {
        setLocalErrorMsg(
          "Reporting requires a paid rental. Open Report from Vehicle Details or My Trips after payment.",
        );
      }

      const resolveReportedVehicle = async () => {
        setIsOwnerLocked(false);
        setReportedOwner(null);
        setLockedOwnerId(null);
        setIsVehicleLoading(true);
        setActiveTab("vehicle");
        setFormData((prev) => ({ ...prev, relatedTarget: plate }));
        setIsVehicleLocked(true);

        const vehicle = await getVehicleByLicensePlate(plate);
        if (cancelled) return;

        if (!vehicle) {
          setLocalErrorMsg(
            "Vehicle not found. Please enter a valid plate number manually.",
          );
          setIsVehicleLocked(false);
          setReportedVehicle(null);
          setFormData((prev) => ({ ...prev, relatedTarget: "" }));
        } else {
          setReportedVehicle(vehicle);
          if (hasValidRentalId) {
            setLocalErrorMsg("");
            setErrorMsg("");
          }
        }
        setIsVehicleLoading(false);
      };

      resolveReportedVehicle();
      return () => {
        cancelled = true;
      };
    }

    if (complaintType === "owner") {
      const ownerId = Number(ownerIdParam);
      if (!Number.isInteger(ownerId) || ownerId <= 0) {
        setLocalErrorMsg(
          "Invalid report link. Please select the complaint type and target manually.",
        );
        clearLocks();
        return;
      }

      if (!hasValidRentalId) {
        setLocalErrorMsg(
          "Reporting requires a paid rental. Open Report from Owner Profile or My Trips after payment.",
        );
      }

      const resolveReportedOwner = async () => {
        setIsVehicleLocked(false);
        setReportedVehicle(null);
        setIsOwnerLoading(true);
        setActiveTab("owner");
        setIsOwnerLocked(true);
        setLockedOwnerId(ownerId);

        const owner = await getUserById(ownerId);
        if (cancelled) return;

        if (!owner) {
          setLocalErrorMsg(
            "Owner not found. Please enter a valid owner email manually.",
          );
          setIsOwnerLocked(false);
          setReportedOwner(null);
          setLockedOwnerId(null);
          setFormData((prev) => ({ ...prev, relatedTarget: "" }));
        } else {
          setReportedOwner(owner);
          setFormData((prev) => ({
            ...prev,
            relatedTarget: owner.email || "",
          }));
          if (hasValidRentalId) {
            setLocalErrorMsg("");
            setErrorMsg("");
          }
        }
        setIsOwnerLoading(false);
      };

      resolveReportedOwner();
      return () => {
        cancelled = true;
      };
    }

    setLocalErrorMsg(
      "Invalid report link. Please select the complaint type and target manually.",
    );
    clearLocks();
  }, [searchParams]);

  // Resolve rental summary from cached My Trips (same GET /rentals/history).
  useEffect(() => {
    if (!lockedRentalId) {
      setRentalSummary(null);
      return;
    }

    const trip = (rentalHistory.myTrips || []).find(
      (item) =>
        Number(item.rentalId) === Number(lockedRentalId) &&
        item.paymentStatus === "paid",
    );

    setRentalSummary(
      trip || {
        rentalId: lockedRentalId,
        paymentStatus: "paid",
      },
    );
  }, [lockedRentalId, rentalHistory.myTrips]);

  useEffect(() => {
    const urls = formData.images.map((image) => URL.createObjectURL(image));

    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [formData.images]);

  useEffect(() => {
    getMyComplaints({
      startDate: appliedFromDate,
      endDate: appliedToDate,
      status: appliedStatus,
      page: currentPage,
    });
  }, [appliedFromDate, appliedToDate, appliedStatus, currentPage]);

  useEffect(() => {
    getReportsAboutMe({ page: reportsPage });
  }, [reportsPage]);

  useEffect(() => {
    getReportsAboutMyVehicles({ page: vehicleReportsPage });
  }, [getReportsAboutMyVehicles, vehicleReportsPage]);

  const refreshMyComplaints = () => {
    getMyComplaints({
      startDate: appliedFromDate,
      endDate: appliedToDate,
      status: appliedStatus,
      page: currentPage,
    });
  };

  const handleApplyFilters = () => {
    if (!isRangeValid || isMyComplaintsLoading) return;
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setAppliedStatus(statusFilter);
    setCurrentPage(1);
  };

  const clearPrefills = () => {
    setIsVehicleLocked(false);
    setReportedVehicle(null);
    setIsVehicleLoading(false);
    setIsOwnerLocked(false);
    setReportedOwner(null);
    setLockedOwnerId(null);
    setIsOwnerLoading(false);
    setLockedRentalId(null);
    setRentalSummary(null);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (isSubmitting || isTargetLoading) return;

    const relatedTarget = formData.relatedTarget.trim();

    if (
      !lockedRentalId ||
      !Number.isInteger(Number(lockedRentalId)) ||
      Number(lockedRentalId) <= 0
    ) {
      setSuccessMsg("");
      setLocalErrorMsg(
        "Reporting requires a paid rental. Use Report from Vehicle Details, Owner Profile, or My Trips after payment.",
      );
      return;
    }

    if (activeTab === "vehicle") {
      if (!/^\d{7,8}$/.test(relatedTarget)) {
        setSuccessMsg("");
        setLocalErrorMsg(
          "Enter a valid vehicle plate number (7 or 8 digits, numbers only).",
        );
        return;
      }
    } else if (isOwnerLocked) {
      if (!lockedOwnerId) {
        setSuccessMsg("");
        setLocalErrorMsg("Reported owner is missing. Please try again.");
        return;
      }
    } else if (!emailRegex.test(relatedTarget)) {
      setSuccessMsg("");
      setLocalErrorMsg("Enter a valid owner email address.");
      return;
    }

    setLocalErrorMsg("");
    setIsSubmitting(true);

    const complaintData = new FormData();

    complaintData.append("complaintType", activeTab);
    complaintData.append("title", formData.title);
    complaintData.append("description", formData.description);
    complaintData.append("rentalId", String(lockedRentalId));

    if (activeTab === "vehicle") {
      complaintData.append("vehicleLicensePlate", relatedTarget);
    } else if (isOwnerLocked && lockedOwnerId) {
      complaintData.append("ownerId", String(lockedOwnerId));
    } else {
      complaintData.append("ownerEmail", relatedTarget);
    }

    if (formData.images && formData.images.length > 0) {
      formData.images.forEach((image) => {
        complaintData.append("images", image);
      });
    }

    const success = await createComplaint(complaintData);
    setIsSubmitting(false);

    if (success) {
      setFormData({
        relatedTarget: "",
        title: "",
        description: "",
        images: [],
      });
      clearPrefills();
      setSuccessMsg("Your complaint was submitted successfully!");
      setTimeout(() => setSuccessMsg(""), 5000);
      refreshMyComplaints();
      if (
        searchParams.has("complaintType") ||
        searchParams.has("vehicleLicensePlate") ||
        searchParams.has("ownerId") ||
        searchParams.has("rentalId")
      ) {
        navigate("/complaints", { replace: true });
      }
    }
  };

  const switchActiveTabToOwner = () => {
    setActiveTab("owner");
    setLocalErrorMsg("");
    clearPrefills();
    setFormData((prev) => ({ ...prev, relatedTarget: "" }));
  };

  const switchActiveTabToVehicle = () => {
    setActiveTab("vehicle");
    setLocalErrorMsg("");
    clearPrefills();
    setFormData((prev) => ({ ...prev, relatedTarget: "" }));
  };

  const handleRelatedTargetChange = (e) => {
    if (isVehicleLocked || isOwnerLocked) return;
    let value = e.target.value;
    if (activeTab === "vehicle") {
      value = value.replace(/\D/g, "").slice(0, 8);
    }
    setFormData((prev) => ({ ...prev, relatedTarget: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...files].slice(0, 4),
    }));

    e.target.value = "";
  };

  const removeImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove),
    }));
  };

  const emptyMessage =
    appliedStatus !== "all" ||
    appliedFromDate !== formatDateForInput(sixMonthsAgo) ||
    appliedToDate !== formatDateForInput(today)
      ? "No complaints found for the selected period."
      : "You have not submitted any complaints yet.";

  const reportedOwnerName = reportedOwner
    ? displayName(reportedOwner.firstName, reportedOwner.lastName, null)
    : "";

  const reportedOwnerJoined = reportedOwner?.createdAt
    ? new Date(reportedOwner.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const reportedOwnerNameVehicle = reportedVehicle
    ? displayName(
        reportedVehicle.ownerFirstName,
        reportedVehicle.ownerLastName,
        reportedVehicle.ownerEmail,
      )
    : "";

  const reportedVehicleName = reportedVehicle
    ? `${reportedVehicle.brandName || ""} ${reportedVehicle.modelName || ""}`.trim()
    : "";

  const reportedImageUrl = reportedVehicle?.image
    ? parseImgs(reportedVehicle.image)
    : "";

  const rentalVehicleName = rentalSummary
    ? `${rentalSummary.brandName || ""} ${rentalSummary.modelName || ""}`.trim()
    : "";

  const rentalRangeText =
    rentalSummary?.startDate && rentalSummary?.endDate
      ? `${formatTripDate(rentalSummary.startDate)} – ${formatTripDate(
          rentalSummary.endDate,
        )}`
      : null;

  return (
    <div className={`${styles.Complaints} page`}>
      <div className={styles.msgContainer}>
        <h1>Complaints</h1>
        <p>
          File against a vehicle or an owner. Use Report vehicle from listings
          when something looks wrong.
        </p>
      </div>

      <form className={styles.reportContainer} onSubmit={handleSubmitForm}>
        <h4>New Complaint</h4>
        <p className={styles.msg}>
          Reports are linked to a paid rental. Use Report from a vehicle, owner
          profile, or My Trips, then describe the issue.
        </p>
        {(localErrorMsg || errorMsg) && (
          <div className={styles.errorMsg}>
            <span className={styles.errorIcon}>!</span>
            <span>{localErrorMsg || errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className={styles.successMsg}>
            <span className={styles.successIcon}>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {isTargetLoading && (
          <p className={styles.vehicleLoading}>
            {isOwnerLoading
              ? "Loading reported owner..."
              : "Loading reported vehicle..."}
          </p>
        )}

        {reportedVehicle && isVehicleLocked && (
          <div className={styles.reportedVehicleCard}>
            <p className={styles.reportedVehicleTitle}>Reporting vehicle</p>
            <div className={styles.reportedVehicleBody}>
              {reportedImageUrl && (
                <img
                  src={reportedImageUrl}
                  alt={reportedVehicleName || "Reported vehicle"}
                  className={styles.reportedVehicleImage}
                />
              )}
              <div className={styles.reportedVehicleMeta}>
                <p className={styles.reportedVehicleName}>
                  {reportedVehicleName ||
                    rentalVehicleName ||
                    "Unknown vehicle"}
                </p>
                <p>
                  <span className={styles.metaLabel}>License plate:</span>{" "}
                  {reportedVehicle.licensePlate}
                </p>
                {rentalRangeText && (
                  <p>
                    <span className={styles.metaLabel}>Rental:</span>{" "}
                    {rentalRangeText}
                  </p>
                )}
                {lockedRentalId && (
                  <p>
                    <span className={styles.metaLabel}>Payment:</span> Paid
                  </p>
                )}
                <p>
                  <span className={styles.metaLabel}>Listed owner:</span>{" "}
                  {reportedOwnerNameVehicle}
                </p>
              </div>
            </div>
          </div>
        )}

        {reportedOwner && isOwnerLocked && (
          <div className={styles.reportedVehicleCard}>
            <p className={styles.reportedVehicleTitle}>Reporting owner</p>
            <div className={styles.reportedVehicleBody}>
              <div className={styles.reportedOwnerAvatar} aria-hidden="true">
                {(reportedOwnerName || "U").charAt(0).toUpperCase()}
              </div>
              <div className={styles.reportedVehicleMeta}>
                <p className={styles.reportedVehicleName}>
                  {reportedOwnerName || "Unknown owner"}
                </p>
                {rentalVehicleName && (
                  <p>
                    <span className={styles.metaLabel}>Rental vehicle:</span>{" "}
                    {rentalVehicleName}
                  </p>
                )}
                {rentalRangeText && (
                  <p>
                    <span className={styles.metaLabel}>Rental:</span>{" "}
                    {rentalRangeText}
                  </p>
                )}
                {lockedRentalId && (
                  <p>
                    <span className={styles.metaLabel}>Payment:</span> Paid
                  </p>
                )}
                <p>
                  <span className={styles.metaLabel}>Account:</span>{" "}
                  {reportedOwner.role || "user"}
                  {reportedOwner.status ? ` · ${reportedOwner.status}` : ""}
                </p>
                {reportedOwnerJoined && (
                  <p>
                    <span className={styles.metaLabel}>Member since:</span>{" "}
                    {reportedOwnerJoined}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={styles.complaintTypeContainer}>
          <div className={styles.labelAndInputContainer}>
            <p>Complaint Type</p>
            <div className={styles.btnsContainer}>
              <button
                type="button"
                onClick={switchActiveTabToVehicle}
                className={`${styles.againstVehicleBtn} ${activeTab === "vehicle" && styles.activeBtn}`}
                disabled={isSubmitting}
              >
                Against vehicle
              </button>
              <button
                type="button"
                onClick={switchActiveTabToOwner}
                className={`${styles.againstOwnerBtn} ${activeTab === "owner" && styles.activeBtn}`}
                disabled={isSubmitting}
              >
                Against owner
              </button>
            </div>
          </div>

          {!(isOwnerLocked && activeTab === "owner") && (
            <div className={styles.labelAndInputContainer}>
              <p>Related {activeTab === "vehicle" ? "vehicle" : "owner"}</p>
              <input
                type={activeTab === "vehicle" ? "text" : "email"}
                name="relatedTarget"
                inputMode={activeTab === "vehicle" ? "numeric" : "email"}
                maxLength={activeTab === "vehicle" ? 8 : undefined}
                value={formData.relatedTarget}
                onChange={handleRelatedTargetChange}
                readOnly={isVehicleLocked && activeTab === "vehicle"}
                placeholder={
                  activeTab === "vehicle"
                    ? "Vehicle plate number (7-8 digits)"
                    : "owner email"
                }
              />
            </div>
          )}

          <div className={styles.labelAndInputContainer}>
            <div className={styles.fieldHeading}>
              <label htmlFor="complaint-title">Title</label>
              <small
                id="complaint-title-count"
                className={styles.characterCounter}
              >
                <span aria-hidden="true">
                  {formData.title.length} / {TITLE_CHARACTER_LIMIT} chars
                </span>
                <span className={styles.srOnly}>
                  {TITLE_CHARACTER_LIMIT - formData.title.length} characters
                  remaining
                </span>
              </small>
            </div>
            <input
              id="complaint-title"
              type="text"
              name="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              disabled={isSubmitting}
              maxLength={TITLE_CHARACTER_LIMIT}
              aria-describedby="complaint-title-count"
            />
          </div>

          <div className={styles.labelAndInputContainer}>
            <div className={styles.fieldHeading}>
              <label htmlFor="complaint-description">Description</label>
              <small
                id="complaint-description-count"
                className={styles.characterCounter}
              >
                <span aria-hidden="true">
                  {formData.description.length} /{" "}
                  {DESCRIPTION_CHARACTER_LIMIT} chars
                </span>
                <span className={styles.srOnly}>
                  {DESCRIPTION_CHARACTER_LIMIT - formData.description.length}{" "}
                  characters remaining
                </span>
              </small>
            </div>
            <textarea
              id="complaint-description"
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isSubmitting}
              maxLength={DESCRIPTION_CHARACTER_LIMIT}
              aria-describedby="complaint-description-count"
            ></textarea>
          </div>
          <label className={styles.customFileUpload}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              disabled={isSubmitting}
            />

            {formData.images.length === 0 ? (
              <p>Upload Images</p>
            ) : (
              <div className={styles.imagePreviewContainer}>
                {previewUrls.map((image, index) => (
                  <div className={styles.previewCard} key={index}>
                    <img
                      src={image}
                      alt="preview"
                      className={styles.previewImage}
                    />

                    <button
                      type="button"
                      className={styles.removeImageBtn}
                      onClick={(e) => {
                        e.preventDefault();
                        removeImage(index);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </label>
        </div>

        <button
          className={styles.submitBtn}
          disabled={isSubmitting || isTargetLoading}
        >
          {isSubmitting ? "Submitting..." : "Submit Complaint"}
        </button>
      </form>

      <section className={styles.complaintsHistoryContainer}>
        <div
          className={styles.historyViewSwitcher}
          role="group"
          aria-label="Complaint records"
        >
          <button
            type="button"
            className={`${styles.historyViewButton} ${
              activeHistoryView === "history"
                ? styles.activeHistoryViewButton
                : ""
            }`}
            onClick={() => setActiveHistoryView("history")}
            aria-pressed={activeHistoryView === "history"}
          >
            <History size={18} aria-hidden="true" />
            <span>Complaint History</span>
            <span className={styles.historyViewCount}>
              {isMyComplaintsLoading
                ? "..."
                : myComplaintsPagination?.totalComplaints || 0}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.historyViewButton} ${
              activeHistoryView === "reports"
                ? styles.activeHistoryViewButton
                : ""
            }`}
            onClick={() => setActiveHistoryView("reports")}
            aria-pressed={activeHistoryView === "reports"}
          >
            <ShieldAlert size={18} aria-hidden="true" />
            <span>Reports About You</span>
            <span className={styles.historyViewCount}>
              {isReportsAboutMeLoading
                ? "..."
                : reportsAboutMePagination?.totalReports || 0}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.historyViewButton} ${
              activeHistoryView === "vehicleReports"
                ? styles.activeHistoryViewButton
                : ""
            }`}
            onClick={() => setActiveHistoryView("vehicleReports")}
            aria-pressed={activeHistoryView === "vehicleReports"}
          >
            <Car size={18} aria-hidden="true" />
            <span>Reports on Your Vehicles</span>
            <span className={styles.historyViewCount}>
              {isReportsAboutMyVehiclesLoading
                ? "..."
                : reportsAboutMyVehiclesPagination?.totalReports || 0}
            </span>
          </button>
        </div>

        {activeHistoryView === "history" ? (
          <div id="complaint-history-panel" className={styles.historyPanel}>
            <div className={styles.historyPanelHeader}>
              <div>
                <p className={styles.historyEyebrow}>Submitted by you</p>
                <h4>Complaint History</h4>
              </div>
              <p className={styles.historyHint}>
                Track your submitted complaints and Nova Rents responses.
              </p>
            </div>

            <div className={styles.historyFilters}>
              <div className={styles.filterGroup}>
                <label htmlFor="myComplaintsFrom">From</label>
                <input
                  id="myComplaintsFrom"
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className={styles.filterGroup}>
                <label htmlFor="myComplaintsTo">To</label>
                <input
                  id="myComplaintsTo"
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className={styles.filterGroup}>
                <label htmlFor="myComplaintsStatus">Status</label>
                <select
                  id="myComplaintsStatus"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <button
                type="button"
                className={styles.applyBtn}
                onClick={handleApplyFilters}
                disabled={!isRangeValid || isMyComplaintsLoading}
              >
                {isMyComplaintsLoading ? "Loading..." : "Apply"}
              </button>
            </div>

            {myComplaintsError && (
              <p className={styles.historyError}>{myComplaintsError}</p>
            )}

            {isMyComplaintsLoading ? (
              <p className={styles.historyEmpty}>Loading your complaints...</p>
            ) : myComplaints.length === 0 && !myComplaintsError ? (
              <p className={styles.historyEmpty}>{emptyMessage}</p>
            ) : (
              <div className={styles.historyList}>
                {myComplaints.map((comp) => {
                  const isVehicle = comp.complaintType === "vehicle";
                  const vehicleLabel = [
                    comp.brandName,
                    comp.modelName,
                    comp.vehicleLicensePlate
                      ? `(${comp.vehicleLicensePlate})`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const ownerTarget = displayName(
                    comp.ownerFirstName,
                    comp.ownerLastName,
                    comp.ownerEmail,
                  );

                  const listedOwner = isVehicle
                    ? displayName(
                        comp.vehicleOwnerFirstName,
                        comp.vehicleOwnerLastName,
                        comp.vehicleOwnerEmail,
                      )
                    : null;

                  return (
                    <ComplaintsHistoryCards
                      key={comp.complaintId}
                      title={comp.title}
                      status={comp.status}
                      targetLabel={
                        isVehicle ? "Reported vehicle" : "Reported owner"
                      }
                      targetValue={
                        isVehicle
                          ? vehicleLabel || "Unknown vehicle"
                          : ownerTarget
                      }
                      listedOwner={listedOwner}
                      submittedDate={formatSubmittedDate(comp.createdAt)}
                      description={comp.description}
                      adminResponse={comp.resolutionMessage?.trim() || null}
                    />
                  );
                })}
              </div>
            )}

            {!isMyComplaintsLoading &&
              myComplaintsPagination?.totalPages > 1 && (
                <div className={styles.paginationWrapper}>
                  <Pagination
                    currentPage={myComplaintsPagination.currentPage}
                    totalPages={myComplaintsPagination.totalPages}
                    handlePrevPage={() =>
                      setCurrentPage((page) => Math.max(page - 1, 1))
                    }
                    handleNextPage={() =>
                      setCurrentPage((page) =>
                        Math.min(page + 1, myComplaintsPagination.totalPages),
                      )
                    }
                    leftText={`Total: ${myComplaintsPagination.totalComplaints || 0}`}
                  />
                </div>
              )}
          </div>
        ) : activeHistoryView === "reports" ? (
          <div id="reports-about-me-panel" className={styles.historyPanel}>
            <div className={styles.historyPanelHeader}>
              <div>
                <p className={styles.historyEyebrow}>
                  Received by your account
                </p>
                <h4>Reports About You</h4>
              </div>
              <p className={styles.historyHint}>
                Reports filed against your account. Reporter identity remains
                private.
              </p>
            </div>

            {reportsAboutMeError && (
              <p className={styles.historyError}>{reportsAboutMeError}</p>
            )}

            {isReportsAboutMeLoading ? (
              <p className={styles.historyEmpty}>
                Loading reports about you...
              </p>
            ) : reportsAboutMe.length === 0 && !reportsAboutMeError ? (
              <p className={styles.historyEmpty}>
                No reports have been filed against your account.
              </p>
            ) : (
              <div className={styles.historyList}>
                {reportsAboutMe.map((comp) => (
                  <ComplaintsHistoryCards
                    key={comp.complaintId}
                    title={comp.title}
                    status={comp.status}
                    targetLabel="Reference"
                    targetValue={`#${comp.complaintId}`}
                    submittedDate={formatSubmittedDate(comp.createdAt)}
                    description={comp.description}
                    adminResponse={comp.resolutionMessage?.trim() || null}
                  />
                ))}
              </div>
            )}

            {!isReportsAboutMeLoading &&
              reportsAboutMePagination?.totalPages > 1 && (
                <div className={styles.paginationWrapper}>
                  <Pagination
                    currentPage={reportsAboutMePagination.currentPage}
                    totalPages={reportsAboutMePagination.totalPages}
                    handlePrevPage={() =>
                      setReportsPage(
                        Math.max(reportsAboutMePagination.currentPage - 1, 1),
                      )
                    }
                    handleNextPage={() =>
                      setReportsPage(
                        Math.min(
                          reportsAboutMePagination.currentPage + 1,
                          reportsAboutMePagination.totalPages,
                        ),
                      )
                    }
                    leftText={`Total: ${reportsAboutMePagination.totalReports || 0}`}
                  />
                </div>
              )}
          </div>
        ) : (
          <div
            id="reports-about-my-vehicles-panel"
            className={styles.historyPanel}
          >
            <div className={styles.historyPanelHeader}>
              <div>
                <p className={styles.historyEyebrow}>
                  Received by your listings
                </p>
                <h4>Reports on Your Vehicles</h4>
              </div>
              <p className={styles.historyHint}>
                Reports filed against vehicles you own. Reporter identity
                remains private.
              </p>
            </div>

            {reportsAboutMyVehiclesError && (
              <p className={styles.historyError}>
                {reportsAboutMyVehiclesError}
              </p>
            )}

            {isReportsAboutMyVehiclesLoading ? (
              <p className={styles.historyEmpty}>
                Loading reports on your vehicles...
              </p>
            ) : reportsAboutMyVehicles.length === 0 &&
              !reportsAboutMyVehiclesError ? (
              <p className={styles.historyEmpty}>
                No reports have been filed against your vehicles.
              </p>
            ) : (
              <div className={styles.historyList}>
                {reportsAboutMyVehicles.map((comp) => {
                  const vehicleLabel = [
                    comp.brandName,
                    comp.modelName,
                    comp.vehicleLicensePlate
                      ? `(${comp.vehicleLicensePlate})`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <ComplaintsHistoryCards
                      key={comp.complaintId}
                      title={comp.title}
                      status={comp.status}
                      targetLabel="Reported vehicle"
                      targetValue={vehicleLabel || "Unknown vehicle"}
                      referenceValue={`#${comp.complaintId}`}
                      submittedDate={formatSubmittedDate(comp.createdAt)}
                      description={comp.description}
                      adminResponse={comp.resolutionMessage?.trim() || null}
                    />
                  );
                })}
              </div>
            )}

            {!isReportsAboutMyVehiclesLoading &&
              reportsAboutMyVehiclesPagination?.totalPages > 1 && (
                <div className={styles.paginationWrapper}>
                  <Pagination
                    currentPage={
                      reportsAboutMyVehiclesPagination.currentPage
                    }
                    totalPages={reportsAboutMyVehiclesPagination.totalPages}
                    handlePrevPage={() =>
                      setVehicleReportsPage(
                        Math.max(
                          reportsAboutMyVehiclesPagination.currentPage - 1,
                          1,
                        ),
                      )
                    }
                    handleNextPage={() =>
                      setVehicleReportsPage(
                        Math.min(
                          reportsAboutMyVehiclesPagination.currentPage + 1,
                          reportsAboutMyVehiclesPagination.totalPages,
                        ),
                      )
                    }
                    leftText={`Total: ${reportsAboutMyVehiclesPagination.totalReports || 0}`}
                  />
                </div>
              )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Complaints;

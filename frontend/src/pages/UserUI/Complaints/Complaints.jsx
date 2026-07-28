import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import styles from "./Complaints.module.css";
import ComplaintsHistoryCards from "../../../components/ComplaintsHistoryCards/ComplaintsHistoryCards";
import Pagination from "../../../components/Pagination/Pagination";
import { useComplaintContext } from "../../../context/ComplaintContext";
import { useVehicleContext } from "../../../context/VehicleContext";
import { useUserContext } from "../../../context/UserContext";
import { parseImgs } from "../../../utils/parseImgs";

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
  } = useComplaintContext();
  const { getVehicleByLicensePlate } = useVehicleContext();
  const { getUserById } = useUserContext();
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

  const isRangeValid = Boolean(fromDate && toDate && fromDate <= toDate);
  const isTargetLoading = isVehicleLoading || isOwnerLoading;

  // Prefill from URL params (UX only). Invalid params fall back to the
  // normal unprefilled form without crashing.
  useEffect(() => {
    const complaintType = searchParams.get("complaintType");
    const plate = searchParams.get("vehicleLicensePlate")?.trim() || "";
    const ownerIdParam = searchParams.get("ownerId")?.trim() || "";

    if (!complaintType && !plate && !ownerIdParam) {
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
    };

    if (complaintType === "vehicle") {
      if (!/^\d{7,8}$/.test(plate)) {
        setLocalErrorMsg(
          "Invalid report link. Please select the complaint type and target manually.",
        );
        clearLocks();
        return;
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
          setLocalErrorMsg("");
          setErrorMsg("");
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
          setLocalErrorMsg("");
          setErrorMsg("");
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
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (isSubmitting || isTargetLoading) return;

    const relatedTarget = formData.relatedTarget.trim();

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
        searchParams.has("ownerId")
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
    ? displayName(
        reportedOwner.firstName,
        reportedOwner.lastName,
        null,
      )
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
          Choose type, link the subject, then describe the issue.
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
                  {reportedVehicleName || "Unknown vehicle"}
                </p>
                <p>
                  <span className={styles.metaLabel}>License plate:</span>{" "}
                  {reportedVehicle.licensePlate}
                </p>
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
            <p>Title</p>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.labelAndInputContainer}>
            <p>Description</p>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isSubmitting}
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

      <div className={styles.complaintsHistoryContainer}>
        <h4>Previous complaints</h4>

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
          myComplaints.map((comp) => {
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
                targetLabel={isVehicle ? "Reported vehicle" : "Reported owner"}
                targetValue={
                  isVehicle ? vehicleLabel || "Unknown vehicle" : ownerTarget
                }
                listedOwner={listedOwner}
                submittedDate={formatSubmittedDate(comp.createdAt)}
                description={comp.description}
                adminResponse={comp.adminNotes?.trim() || null}
              />
            );
          })
        )}

        {!isMyComplaintsLoading &&
          myComplaintsPagination?.totalPages > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                currentPage={myComplaintsPagination.currentPage}
                totalPages={myComplaintsPagination.totalPages}
                handlePrevPage={() =>
                  setCurrentPage((p) => Math.max(p - 1, 1))
                }
                handleNextPage={() =>
                  setCurrentPage((p) =>
                    Math.min(p + 1, myComplaintsPagination.totalPages),
                  )
                }
                leftText={`Total: ${myComplaintsPagination.totalComplaints || 0}`}
              />
            </div>
          )}
      </div>
    </div>
  );
};

export default Complaints;

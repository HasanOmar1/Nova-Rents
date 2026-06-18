import { useState, useEffect } from "react";
import styles from "./Complaints.module.css";
import ComplaintsHistoryCards from "../../../components/ComplaintsHistoryCards/ComplaintsHistoryCards";
import { useComplaintContext } from "../../../context/ComplaintContext";
const dummyComplaints = [
  {
    id: 1,
    title: "Suspicious listing photos",
    status: "Open",
    relatedVehOrOwner: "Wedding Limousine (#3)",
    date: "2026-04-08",
    type: "vehicle",
    owner: "John Smith",
    description:
      "The uploaded photos do not match the actual event vehicle details.",
  },
  {
    id: 2,
    title: "Unprofessional Conduct",
    status: "Closed",
    relatedVehOrOwner: "Michael Brown",
    date: "2026-01-10",
    type: "user",
    owner: "Sarah Wilson",
    description:
      "The driver was extremely rude during the handover process and arrived 40 minutes late without any prior notice or apology.",
  },
];

const Complaints = () => {
  const { createComplaint, errorMsg } = useComplaintContext();
  const [activeTab, setActiveTab] = useState("vehicle");
  const [successMsg, setSuccessMsg] = useState("");
  const [localErrorMsg, setLocalErrorMsg] = useState("");
  const [previewUrls, setPreviewUrls] = useState([]);
  const [formData, setFormData] = useState({
    relatedTarget: "",
    title: "",
    description: "",
    images: [],
  });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    const urls = formData.images.map((image) => URL.createObjectURL(image));

    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [formData.images]);

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    const relatedTarget = formData.relatedTarget.trim();

    if (activeTab === "vehicle") {
      if (!/^\d{7,8}$/.test(relatedTarget)) {
        setSuccessMsg("");
        setLocalErrorMsg(
          "Enter a valid vehicle plate number (7 or 8 digits, numbers only).",
        );
        return;
      }
    } else if (!emailRegex.test(relatedTarget)) {
      setSuccessMsg("");
      setLocalErrorMsg("Enter a valid owner email address.");
      return;
    }

    setLocalErrorMsg("");

    const complaintData = new FormData();

    complaintData.append("complaintType", activeTab);
    complaintData.append("title", formData.title);
    complaintData.append("description", formData.description);

    if (activeTab === "vehicle") {
      complaintData.append("vehicleLicensePlate", relatedTarget);
    } else {
      complaintData.append("ownerEmail", relatedTarget);
    }

    if (formData.images && formData.images.length > 0) {
      formData.images.forEach((image) => {
        complaintData.append("images", image);
      });
    }

    const success = await createComplaint(complaintData);

    if (success) {
      setFormData({
        relatedTarget: "",
        title: "",
        description: "",
        images: [],
      });
      setSuccessMsg("Your complaint was submitted successfully!");
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  const switchActiveTabToOwner = () => {
    setActiveTab("owner");
    setLocalErrorMsg("");
    setFormData((prev) => ({ ...prev, relatedTarget: "" }));
  };

  const switchActiveTabToVehicle = () => {
    setActiveTab("vehicle");
    setLocalErrorMsg("");
    setFormData((prev) => ({ ...prev, relatedTarget: "" }));
  };

  const handleRelatedTargetChange = (e) => {
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

        <div className={styles.complaintTypeContainer}>
          <div className={styles.labelAndInputContainer}>
            <p>Complaint Type</p>
            <div className={styles.btnsContainer}>
              <button
                type="button"
                onClick={switchActiveTabToVehicle}
                className={`${styles.againstVehicleBtn} ${activeTab === "vehicle" && styles.activeBtn}`}
              >
                Against vehicle
              </button>
              <button
                type="button"
                onClick={switchActiveTabToOwner}
                className={`${styles.againstOwnerBtn} ${activeTab === "owner" && styles.activeBtn}`}
              >
                Against owner
              </button>
            </div>
          </div>

          <div className={styles.labelAndInputContainer}>
            <p>Related {activeTab === "vehicle" ? "vehicle" : "owner"}</p>
            <input
              type={activeTab === "vehicle" ? "text" : "email"}
              name="relatedTarget"
              inputMode={activeTab === "vehicle" ? "numeric" : "email"}
              maxLength={activeTab === "vehicle" ? 8 : undefined}
              value={formData.relatedTarget}
              onChange={handleRelatedTargetChange}
              placeholder={
                activeTab === "vehicle"
                  ? "Vehicle plate number (7-8 digits)"
                  : "owner email"
              }
            />
          </div>

          <div className={styles.labelAndInputContainer}>
            <p>Title</p>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
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
            ></textarea>
          </div>
          <label className={styles.customFileUpload}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
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

        <button className={styles.submitBtn}>Submit Complaint</button>
      </form>

      <div className={styles.complaintsHistoryContainer}>
        <h4>Previous complaints</h4>
        {dummyComplaints.map((comp) => {
          return (
            <ComplaintsHistoryCards
              key={comp.id}
              title={comp.title}
              relatedVehOrOwner={comp.relatedVehOrOwner}
              date={comp.date}
              description={comp.description}
              owner={comp.owner}
              status={comp.status}
              type={comp.type}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Complaints;

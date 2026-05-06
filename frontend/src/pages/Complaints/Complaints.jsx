import { useState } from "react";
import styles from "./Complaints.module.css";
import ComplaintsHistoryCards from "../../components/ComplaintsHistoryCards/ComplaintsHistoryCards";

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
  const [activeTab, setActiveTab] = useState("vehicle");

  const handleSubmitForm = (e) => {
    e.preventDefault();
  };

  const switchActiveTabToOwner = (e) => {
    setActiveTab("owner");
  };

  const switchActiveTabToVehicle = () => {
    setActiveTab("vehicle");
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

        <div className={styles.complaintTypeContainer}>
          <div className={styles.labelAndInputContainer}>
            <p>Complaint Type</p>
            <div className={styles.btnsContainer}>
              <button
                onClick={switchActiveTabToVehicle}
                className={`${styles.againstVehicleBtn} ${activeTab === "vehicle" && styles.activeBtn}`}
              >
                Against vehicle
              </button>
              <button
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
              type="text"
              placeholder={activeTab === "vehicle" ? "Vehicle ID" : "Username"}
              disabled
            />
          </div>

          <div className={styles.labelAndInputContainer}>
            <p>Title</p>
            <input type="text" name="title" />
          </div>

          <div className={styles.labelAndInputContainer}>
            <p>Description</p>
            <textarea name="decsription"></textarea>
          </div>

          <label className={styles.customFileUpload}>
            <input type="file" multiple />
            <p>Upload Images</p>
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

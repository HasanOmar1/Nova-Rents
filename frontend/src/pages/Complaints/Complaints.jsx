import { useState } from "react";
import styles from "./Complaints.module.css";

const Complaints = () => {
  const [activeTab, setActiveTab] = useState("vehicle");

  const switchActiveTabToOwner = () => {
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

      <div className={styles.reportContainer}>
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
        </div>
      </div>
    </div>
  );
};

export default Complaints;

import { useState } from "react";
import styles from "./Complaints.module.css";

const Complaints = () => {
  const [vehicleReportTab, setVehicleReportTab] = useState(true);

  const switchActiveTab = () => {
    setVehicleReportTab((prev) => !prev);
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
          <p>Complaint Type</p>
          <div className={styles.btnsContainer}>
            <button
              onClick={switchActiveTab}
              className={`${styles.againstVehicleBtn} ${vehicleReportTab && styles.activeBtn}`}
            >
              Against vehicle
            </button>
            <button
              onClick={switchActiveTab}
              className={`${styles.againstOwnerBtn} ${!vehicleReportTab && styles.activeBtn}`}
            >
              Against owner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Complaints;

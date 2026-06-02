import { useState } from "react";
import styles from "./Profile.module.css";
import DocumentsCards from "../../../components/DocumentsCards/DocumentsCards";
import { useUserContext } from "../../../context/UserContext";

const Profile = () => {
  const [editProfileClicked, setEditProfileClicked] = useState(false);
  const { currentUser } = useUserContext();
  console.log(currentUser);

  const clickEditProfile = () => {
    setEditProfileClicked((prev) => !prev);
  };

  return (
    <div className={`${styles.Profile} page`}>
      <h1>Profile</h1>

      <div className={`${styles.card} ${styles.signedAsContainer}`}>
        <p>Signed in as</p>
        <h4>{currentUser?.firstName}</h4>
        <p className={styles.userEmail}>{currentUser?.email}</p>
      </div>

      <div className={`${styles.card} ${styles.personalInfoContainer}`}>
        <div className={styles.editBtnAndTitleContainer}>
          <p>Personal Information</p>

          {!editProfileClicked && (
            <button onClick={clickEditProfile}>Edit</button>
          )}
        </div>

        <div className={styles.inputsContainer}>
          <div className={styles.labelInputContainer}>
            <label htmlFor="fname">First name</label>
            <input
              type="text"
              name="fname"
              id="fname"
              value={currentUser?.firstName}
              disabled={!editProfileClicked}
            />
          </div>

          <div className={styles.labelInputContainer}>
            <label htmlFor="lfname">Last name</label>
            <input
              type="text"
              name="lname"
              id="lname"
              value={currentUser?.lastName}
              disabled={!editProfileClicked}
            />
          </div>

          <div className={styles.labelInputContainer}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              value={currentUser?.email}
              disabled={!editProfileClicked}
            />
          </div>

          <div className={styles.labelInputContainer}>
            <label htmlFor="phone">Phone</label>
            <input
              type="phone"
              name="phone"
              id="phone"
              value={currentUser?.phone}
              disabled={!editProfileClicked}
            />
          </div>

          <div className={styles.labelInputContainer}>
            <label htmlFor="phone">Birth Date</label>
            <input
              type="text"
              name="birthdate"
              id="birthdate"
              value={currentUser?.birthDate}
              disabled={true}
            />
          </div>
        </div>

        {editProfileClicked && (
          <div className={styles.saveChangesBtnsContainer}>
            <button
              className={styles.saveChangesBtn}
              onClick={clickEditProfile}
            >
              Save Changes
            </button>
            <button className={styles.cancelBtn} onClick={clickEditProfile}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className={styles.documentsContainer}>
        <DocumentsCards />
      </div>
    </div>
  );
};

export default Profile;

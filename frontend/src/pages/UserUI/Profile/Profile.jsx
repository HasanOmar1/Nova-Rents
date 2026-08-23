import { useState, useEffect } from "react";
import styles from "./Profile.module.css";
import DocumentsCards from "../../../components/DocumentsCards/DocumentsCards";
import { useUserContext } from "../../../context/UserContext";
import { useActivityContext } from "../../../context/ActivityContext";
import { formattedMaxDate, formattedMinDate } from "../../../utils/minMaxDate";
import AsyncButton from "../../../components/AsyncButton/AsyncButton";
import { useLocation } from "react-router-dom";

const Profile = () => {
  const { search } = useLocation();
  const [editProfileClicked, setEditProfileClicked] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { currentUser, updateProfile, errorMsg, setErrorMsg } =
    useUserContext();
  const { loadActivities } = useActivityContext();

  const [inputsValues, setInputsValues] = useState({
    firstName: currentUser?.firstName || "",
    lastName: currentUser?.lastName || "",
    email: currentUser?.email.toLowerCase() || "",
    phone: currentUser?.phone || "",
    birthDate: currentUser?.birthDate,
    password: "",
  });

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (currentUser && !editProfileClicked) {
      setInputsValues({
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        email: currentUser.email.toLowerCase() || "",
        phone: currentUser.phone || "",
        birthDate: currentUser?.birthDate || "",
        password: "",
      });
    }
  }, [currentUser, editProfileClicked]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputsValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clickEditProfile = () => {
    setEditProfileClicked(true);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const clickCancel = () => {
    setEditProfileClicked(false);
    setErrorMsg("");
    setSuccessMsg("");
    setInputsValues({
      firstName: currentUser?.firstName || "",
      lastName: currentUser?.lastName || "",
      email: currentUser?.email.toLowerCase() || "",
      phone: currentUser?.phone || "",
      birthDate: currentUser?.birthDate || "",
      password: "",
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const newData = {
      firstName: inputsValues.firstName,
      lastName: inputsValues.lastName,
      newEmail: inputsValues.email.toLowerCase(),
      phone: inputsValues.phone,
      birthDate: inputsValues.birthDate,
    };

    if (inputsValues.password && inputsValues.password.trim() !== "") {
      newData.password = inputsValues.password;
    }

    setIsSaving(true);
    const isSuccess = await updateProfile(newData);
    setIsSaving(false);
    if (isSuccess) {
      setSuccessMsg("Profile updated successfully!");
      setEditProfileClicked(false);
      setInputsValues((prev) => ({ ...prev, password: "" }));
      loadActivities();
    }
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
          <div>
            <p>Personal Information</p>
            {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
            {successMsg && <p className={styles.successMsg}>{successMsg}</p>}
          </div>

          {!editProfileClicked && (
            <button type="button" onClick={clickEditProfile}>
              Edit
            </button>
          )}
        </div>

        <form onSubmit={handleUpdateProfile}>
          <div className={styles.inputsContainer}>
            <div className={styles.labelInputContainer}>
              <label htmlFor="firstName">First name</label>
              <input
                type="text"
                name="firstName"
                id="firstName"
                value={inputsValues.firstName}
                onChange={handleInputChange}
                disabled={!editProfileClicked}
              />
            </div>

            <div className={styles.labelInputContainer}>
              <label htmlFor="lastName">Last name</label>
              <input
                type="text"
                name="lastName"
                id="lastName"
                value={inputsValues.lastName}
                onChange={handleInputChange}
                disabled={!editProfileClicked}
              />
            </div>

            <div className={styles.labelInputContainer}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                value={inputsValues.email}
                onChange={handleInputChange}
                disabled={!editProfileClicked}
              />
            </div>

            <div className={styles.labelInputContainer}>
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={inputsValues.phone}
                onChange={handleInputChange}
                disabled={!editProfileClicked}
              />
            </div>

            <div className={styles.labelInputContainer}>
              <label htmlFor="birthDate">Birth Date</label>
              <input
                type={!editProfileClicked ? "text" : "date"}
                name="birthDate"
                id="birthDate"
                value={
                  !editProfileClicked
                    ? formatDisplayDate(inputsValues.birthDate)
                    : inputsValues.birthDate
                }
                onChange={handleInputChange}
                disabled={!editProfileClicked}
                min={formattedMinDate}
                max={formattedMaxDate}
              />
            </div>

            <div className={styles.labelInputContainer}>
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                name="password"
                id="password"
                placeholder={
                  editProfileClicked
                    ? "Leave blank to keep current"
                    : "********"
                }
                value={inputsValues.password}
                onChange={handleInputChange}
                disabled={!editProfileClicked}
              />
            </div>
          </div>

          {editProfileClicked && (
            <div className={styles.saveChangesBtnsContainer}>
              <button
                className={styles.cancelBtn}
                onClick={clickCancel}
                type="button"
              >
                Cancel
              </button>
              <AsyncButton className={styles.saveChangesBtn} type="submit" loading={isSaving} loadingText="Saving...">
                Save Changes
              </AsyncButton>
            </div>
          )}
        </form>
      </div>

      <div id="documents" className={styles.documentsContainer}>
        <DocumentsCards key={search} />
      </div>
    </div>
  );
};

export default Profile;

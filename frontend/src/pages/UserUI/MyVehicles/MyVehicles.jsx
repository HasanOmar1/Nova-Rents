import { useState } from "react";
import DeleteMenu from "../../../components/DeleteMenu/DeleteMenu";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import MyVehiclesCards from "../../../components/MyVehiclesCards/MyVehiclesCards";
import styles from "./MyVehicles.module.css";
import { Car } from "lucide-react";
import { useVehicleContext } from "../../../context/VehicleContext";
import { useEffect } from "react";
import AddEditVehicleMenu from "../../../components/AddEditVehicleMenu/AddEditVehicleMenu";

const topData = [
  {
    title: "Active listings",
    value: 2,
    icon: <Car size={28} color="#a7d2eb" />,
  },
  {
    title: "Available now",
    value: 2,
    icon: <Car size={28} color="#a7d2eb" />,
  },
  {
    title: "Avg. daily rate",
    value: "$275",
    icon: <Car size={28} color="#a7d2eb" />,
  },
];

const MyVehicles = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { getUserVehicles, userVehicles } = useVehicleContext();

  useEffect(() => {
    getUserVehicles();
  }, []);

  const openAddVehMenu = () => setIsOpen(true);
  const closeAddVehMenu = () => setIsOpen(false);

  return (
    <div className={`${styles.MyVehicles} page`}>
      <h1>My vehicles</h1>
      <div className={styles.btnsContainer}>
        <p>Your listings only — add, edit, or remove vehicles.</p>

        <button className={styles.addVehicleBtn} onClick={openAddVehMenu}>
          Add vehicle
        </button>
      </div>
      <div className={styles.topCardsContainer}>
        {topData.map((item) => {
          return (
            <HomeTopCards
              key={crypto.randomUUID()}
              title={item.title}
              value={item.value}
              icon={item.icon}
            />
          );
        })}
      </div>
      <div className={styles.myVehiclesContainer}>
        <div className={styles.titles}>
          <p className={styles.vehicleTitle}>Vehicle</p>
          <p>Category</p>
          <p>Location</p>
          <p>Price</p>
          <p>Actions</p>
        </div>
        <hr />
        {userVehicles.length ? (
          <>
            {userVehicles.map((veh, i) => {
              return (
                <div key={veh.licensePlate}>
                  <MyVehiclesCards veh={veh} />
                  {i < userVehicles.length - 1 && <hr />}
                </div>
              );
            })}
          </>
        ) : (
          <p className={styles.noVehicles}>
            You don't have any registered vehicles
          </p>
        )}
      </div>
      <AddEditVehicleMenu isOpen={isOpen} onClose={closeAddVehMenu} />
    </div>
  );
};

export default MyVehicles;

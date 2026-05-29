import { useState } from "react";
import AddVehicleMenu from "../../../components/AddVehicleMenu/AddVehicleMenu";
import DeleteMenu from "../../../components/DeleteMenu/DeleteMenu";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import MyVehiclesCards from "../../../components/MyVehiclesCards/MyVehiclesCards";
import styles from "./MyVehicles.module.css";
import { Car } from "lucide-react";

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

const vehicleData = [
  {
    id: 1,
    img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop",
    vehName: "Porsche 911 Carrera",
    price: "$450",
    location: "Tel Aviv",
    type: "Car",
    year: 2023,
  },
  {
    id: 2,
    img: "https://nsimgall.s3.amazonaws.com/wp-content/uploads/2026/02/24134709/20250729_163726-scaled.jpg",
    vehName: "Harley Davidson Iron 883",
    year: 2021,
    price: "$120",
    location: "Haifa",
    type: "Motorcycle",
  },
];

const MyVehicles = () => {
  const [isOpen, setIsOpen] = useState(false);

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

        {vehicleData.map((veh, i) => {
          return (
            <div key={veh.id}>
              <MyVehiclesCards
                img={veh.img}
                location={veh.location}
                name={veh.vehName}
                price={veh.price}
                type={veh.type}
                year={veh.year}
              />
              {i < vehicleData.length - 1 && <hr />}
            </div>
          );
        })}
      </div>
      <AddVehicleMenu isOpen={isOpen} onClose={closeAddVehMenu} />
    </div>
  );
};

export default MyVehicles;

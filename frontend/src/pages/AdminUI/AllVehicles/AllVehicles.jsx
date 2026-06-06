import React, { useEffect } from "react";
import styles from "./AllVehicles.module.css";
import { Car, CheckCircle2, CalendarClock, Wrench } from "lucide-react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import { useVehicleContext } from "../../../context/VehicleContext";
import VehiclesCardsTable from "../../../components/VehiclesCardsTable/VehiclesCardsTable";

const AllVehicles = () => {
  const { getAllVehicles, allVehicles } = useVehicleContext();

  useEffect(() => {
    getAllVehicles();
  }, []);

  const availableCount = allVehicles?.filter(
    (v) => v.status === "available",
  ).length;

  const rentedCount = allVehicles?.filter((v) => v.status === "rented").length;

  const maintenanceCount = allVehicles?.filter(
    (v) => v.status === "maintenance",
  ).length;

  const topData = [
    {
      title: "Total in system",
      value: allVehicles.length,
      icon: <Car size={28} color="#a7d2eb" />,
    },
    {
      title: "Available",
      value: availableCount,
      icon: <CheckCircle2 size={28} color="#a7d2eb" />,
    },
    {
      title: "Booked",
      value: rentedCount,
      icon: <CalendarClock size={28} color="#a7d2eb" />,
    },
    {
      title: "Maintenance",
      value: maintenanceCount,
      icon: <Wrench size={28} color="#a7d2eb" />,
    },
  ];

  return (
    <div className={`${styles.AllVehicles} page`}>
      <div className={styles.title}>
        <h1>All vehicles</h1>
        <p>
          System-wide inventory — every listing, status, and who holds the
          listing
        </p>
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
          <p>Owner</p>
          <p>Status</p>
        </div>
        <hr />

        {allVehicles.map((veh, i) => {
          return (
            <div key={veh.licensePlate}>
              <VehiclesCardsTable veh={veh} admin />

              {i < allVehicles.length - 1 && <hr />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AllVehicles;

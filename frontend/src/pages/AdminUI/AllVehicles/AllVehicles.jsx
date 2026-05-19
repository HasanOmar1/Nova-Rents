import React from "react";
import styles from "./AllVehicles.module.css";
import { Car, CheckCircle2, CalendarClock, Wrench } from "lucide-react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import AllVehiclesCards from "../../../components/AllVehiclesCards/AllVehiclesCards";

const topData = [
  {
    title: "Total in system",
    value: 4,
    icon: <Car size={28} color="#a7d2eb" />,
  },
  {
    title: "Available",
    value: 2,
    icon: <CheckCircle2 size={28} color="#a7d2eb" />,
  },
  {
    title: "Booked",
    value: 1,
    icon: <CalendarClock size={28} color="#a7d2eb" />,
  },
  {
    title: "Maintenance",
    value: 1,
    icon: <Wrench size={28} color="#a7d2eb" />,
  },
];

const vehicleData = [
  {
    img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800",
    id: "1",
    name: "Porsche 911 Carrera",
    year: 2021,
    seats: 2,
    type: "Exotic",
    location: "Los Angeles, CA",
    price: 350,
    owner: "Velocity Rentals",
    status: "Available",
  },
  {
    img: "https://ev-database.org/img/auto/Tesla_Model_S_2026/Tesla_Model_S_2026-01.jpg",
    id: "2",
    name: "Tesla Model S Plaid",
    year: 2023,
    seats: 5,
    type: "Electric",
    location: "San Francisco, CA",
    price: 210,
    owner: "EcoDrive Solutions",
    status: "Booked",
  },
  {
    img: "https://www.insidehook.com/wp-content/uploads/2023/10/ford-f-150-raptor-r-review.jpg?fit=1200%2C800",
    id: "3",
    name: "Ford F-150 Raptor",
    year: 2022,
    seats: 5,
    type: "Truck",
    location: "Austin, TX",
    price: 145,
    owner: "Texan Fleet",
    status: "Maintenance",
  },
  {
    img: "https://hips.hearstapps.com/hmg-prod/images/2025-mercedes-benz-g550-174-67d300d314cb6.jpg?crop=0.694xw:0.587xh;0.131xw,0.236xh&resize=1200:*",
    id: "4",
    name: "Mercedes-Benz G-Wagon",
    year: 2023,
    seats: 5,
    type: "Luxury SUV",
    location: "New York, NY",
    price: 450,
    owner: "Manhattan Elite",
    status: "Available",
  },
];

const AllVehicles = () => {
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

        {vehicleData.map((veh, i) => {
          return (
            <div key={veh.id}>
              <AllVehiclesCards
                img={veh.img}
                location={veh.location}
                name={veh.name}
                price={veh.price}
                type={veh.type}
                year={veh.year}
                id={veh.id}
                owner={veh.owner}
                seats={veh.seats}
                status={veh.status}
              />
              {i < vehicleData.length - 1 && <hr />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AllVehicles;

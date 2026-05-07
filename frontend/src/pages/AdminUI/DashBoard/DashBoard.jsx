import { Car, Users, Shield, CircleDollarSign } from "lucide-react";
import styles from "./DashBoard.module.css";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";

const topData = [
  {
    title: "Total Users",
    value: 4,
    icon: <Users size={28} color="#a7d2eb" />,
  },
  {
    title: "Active Vehicles",
    value: 3,
    icon: <Car size={28} color="#a7d2eb" />,
  },
  {
    title: "Blocked Users",
    value: 1,
    icon: <Shield size={28} color="#a7d2eb" />,
  },
  {
    title: "Total Rentals",
    value: 142,
    icon: <CircleDollarSign size={28} color="#a7d2eb" />,
  },
];

const DashBoard = () => {
  return (
    <div className={`${styles.DashBoard} page`}>
      <h1>Dashboard</h1>

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

      <div className={styles.midContainer}></div>
    </div>
  );
};

export default DashBoard;

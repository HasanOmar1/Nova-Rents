import HomeMidCards from "../../components/HomeCards/HomeMidCards/HomeMidCards";
import HomeTopCards from "../../components/HomeCards/HomeTopCards/HomeTopCards";
import styles from "./Home.module.css";
import { Car, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const topData = [
  {
    title: "Available Vehicles",
    value: 3,
    icon: <Car size={28} color="#a7d2eb" />,
  },
  {
    title: "Your Listings",
    value: 5,
    icon: <CheckCircle2 size={28} color="#a7d2eb" />,
  },
  {
    title: "Open Complaints",
    value: 1,
    icon: <AlertTriangle size={28} color="#a7d2eb" />,
  },
  {
    title: "Upcoming Rentals",
    value: 3,
    icon: <Clock size={28} color="#a7d2eb" />,
  },
];

const Home = () => {
  return (
    <div className={`${styles.Home} page`}>
      <h1>Welcome back</h1>
      <div className={styles.btnsContainer}>
        <button className={styles.browseVehiclesBtn}>Browse Vehicles</button>
        <button className={styles.myVehiclesBtn}>My Vehicles</button>
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

      <div className={styles.midCardsContainer}>
        <HomeMidCards title={"Recent Activity"} />
        <HomeMidCards title={"Notifications"} />
      </div>
    </div>
  );
};

export default Home;

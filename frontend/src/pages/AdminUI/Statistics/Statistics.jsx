import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import styles from "./Statistics.module.css";
import { BadgeDollarSign, Calendar } from "lucide-react";

const topData = [
  {
    title: "Monthly revenue",
    value: "$8900",
    icon: <BadgeDollarSign size={28} color="#a7d2eb" />,
  },
  {
    title: "Bookings",
    value: 35,
    icon: <Calendar size={28} color="#a7d2eb" />,
  },
];

const lineData = [
  { month: "Jan", rentals: 12 },
  { month: "Feb", rentals: 18 },
  { month: "Mar", rentals: 24 },
  { month: "Apr", rentals: 21 },
  { month: "May", rentals: 32 },
  { month: "Jun", rentals: 35 },
];

const barData = [
  { month: "Jan", usage: 48 },
  { month: "Feb", usage: 60 },
  { month: "Mar", usage: 70 },
  { month: "Apr", usage: 65 },
  { month: "May", usage: 85 },
  { month: "Jun", usage: 95 },
];

const Statistics = () => {
  return (
    <div className={`${styles.Statistics} page`}>
      <h1>Statistics</h1>

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

      <div className={styles.bottomCardsContainer}>
        <HomeBottomCards
          title={"Rentals by month"}
          type="line"
          data={lineData}
          dataKey="rentals"
        />
        <HomeBottomCards
          title={"Engagement"}
          type="bar"
          data={barData}
          dataKey="usage"
        />
      </div>
    </div>
  );
};

export default Statistics;

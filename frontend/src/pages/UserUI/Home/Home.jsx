import { Link } from "react-router-dom";
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import HomeMidCards from "../../../components/HomeCards/HomeMidCards/HomeMidCards";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import styles from "./Home.module.css";
import { CalendarDays, Wallet, ClipboardList, Key } from "lucide-react";
import { useRentContext } from "../../../context/RentContext";
import { useEffect } from "react";

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

const Home = () => {
  const { metrics, fetchDashboardMetrics } = useRentContext();

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const topData = [
    {
      title: "Monthly Earnings",
      value: `$${metrics.monthlyEarnings.toLocaleString()}`,
      icon: <Wallet size={28} color="#a7d2eb" />,
    },
    {
      title: "Pending Requests",
      value: metrics.pendingRequests,
      icon: <ClipboardList size={28} color="#a7d2eb" />,
    },
    {
      title: "Upcoming Trips",
      value: metrics.upcomingTrips,
      icon: <CalendarDays size={28} color="#a7d2eb" />,
    },
    {
      title: "Trips Taken",
      value: metrics.tripsTaken,
      icon: <Key size={28} color="#a7d2eb" />,
    },
  ];

  return (
    <div className={`${styles.Home} page`}>
      <h1>Welcome back</h1>
      <div className={styles.btnsContainer}>
        <Link to={"/vehicles"} className={styles.browseVehiclesBtn}>
          Browse Vehicles
        </Link>
        <Link to={"/myVehicles"} className={styles.myVehiclesBtn}>
          My Vehicles
        </Link>
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
        <HomeMidCards title={"Notifications"} />
        <HomeMidCards title={"Recent Activity"} />
      </div>

      <div className={styles.bottomCardsContainer}>
        <HomeBottomCards
          title={"Earnings Overview ($)"}
          type="line"
          data={metrics.chartData || []}
          dataKey="earnings"
        />
        <HomeBottomCards
          title={"Platform Usage"}
          type="bar"
          data={barData}
          dataKey="usage"
        />
      </div>
    </div>
  );
};

export default Home;

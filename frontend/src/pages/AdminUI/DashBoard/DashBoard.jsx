import { Car, Users, Shield, CircleDollarSign } from "lucide-react";
import styles from "./DashBoard.module.css";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import AdminComplaints from "../../../components/AdminComplaints/AdminComplaints";
import HomeBottomCards from "../../../components/HomeCards/HomeBottomCards/HomeBottomCards";
import HomeMidCards from "../../../components/HomeCards/HomeMidCards/HomeMidCards";

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

const complaintsData = [
  {
    title: "Suspicious listing photos",
    description: "Wedding Limousine",
    state: "Review",
    type: "vehicle",
  },
  {
    title: "Late return issue",
    description: "Essa Lwabne",
    state: "Review",
    type: "owner",
  },
];

const closedComplaintsData = [
  {
    title: "Cleaning fee dispute",
    description: "Toyota Camry ",
    state: "Closed",
    type: "vehicle",
  },
  {
    title: "Insurance documentation missing",
    description: "David Miller",
    state: "Closed",
    type: "owner",
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

      <div className={styles.complaintsContainer}>
        <div className={styles.left}>
          <div className={styles.titleContainer}>
            <h4>Open complaints — action required</h4>
            <p>Open and under review only</p>
          </div>

          {complaintsData.map((comp, i) => {
            return (
              <AdminComplaints
                key={i}
                title={comp.title}
                description={comp.description}
                state={comp.state}
                type={comp.type}
              />
            );
          })}
        </div>
        <div className={styles.right}>
          <div className={styles.titleContainer}>
            <h4>Closed complaints — history</h4>
            <p>Archived and resolved issues</p>
          </div>

          {closedComplaintsData.map((comp, i) => {
            return (
              <AdminComplaints
                key={i}
                title={comp.title}
                description={comp.description}
                state={comp.state}
                type={comp.type}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.activitesContainer}>
        <HomeMidCards title={"Recent Activity"} />
      </div>

      <div className={styles.bottomCardsContainer}>
        <HomeBottomCards
          title={"System activity"}
          type="line"
          data={lineData}
          dataKey="rentals"
        />
        <HomeBottomCards
          title={"Rental trends"}
          type="line"
          data={barData}
          dataKey="usage"
        />
      </div>
    </div>
  );
};

export default DashBoard;

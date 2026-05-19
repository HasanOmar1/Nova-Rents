import {
  Users as UsersIcon,
  Shield,
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import styles from "./Users.module.css";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import UsersCards from "../../../components/UsersCards/UsersCards";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const statsData = [
  { month: "Jan", users: 6 },
  { month: "Feb", users: 9 },
  { month: "Mar", users: 12 },
  { month: "Apr", users: 10 },
  { month: "May", users: 17 },
  { month: "Jun", users: 20 },
];

const axisTick = { fill: "rgba(255,255,255,0.45)", fontSize: 11 };
const gridStroke = "rgba(255,255,255,0.06)";

const topData = [
  {
    title: "All Users",
    value: 4,
    icon: <UsersIcon size={28} color="#a7d2eb" />,
  },
  {
    title: "Active",
    value: 3,
    icon: <CheckCircle2 size={28} color="#a7d2eb" />,
  },
  {
    title: "Blocked",
    value: 1,
    icon: <Shield size={28} color="#a7d2eb" />,
  },
];

const dummyUsers = [
  {
    id: 1,
    name: "Essa Lwabne",
    email: "user@autolux.com",
    role: "user",
    status: "Active",
  },
  {
    id: 2,
    name: "Admin Nova Rents",
    email: "admin@autolux.com",
    role: "admin",
    status: "Active",
  },
  {
    id: 3,
    name: "Noor K",
    email: "noor@autolux.com",
    role: "user",
    status: "Blocked",
  },
  {
    id: 4,
    name: "Fadi M",
    email: "fadi@autolux.com",
    role: "user",
    status: "Active",
  },
];

const Users = () => {
  return (
    <div className={`${styles.Users} page`}>
      <h1>Users</h1>

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

      <div className={styles.searchContainer}>
        <div className={styles.left}>
          <label htmlFor="search">Search</label>
          <div className={styles.searchNameContainer}>
            <Search size={20} color="gray" className={styles.searchLogo} />
            <input
              type="text"
              placeholder="Search name or location"
              className={styles.searchNameOrLocationInput}
              name="search"
            />
          </div>
        </div>

        <div className={styles.right}>
          <label htmlFor="status">Status</label>
          <select name="status">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      <div className={styles.usersContainer}>
        <div className={styles.titles}>
          <p>Name</p>
          <p>Email</p>
          <p>Status</p>
          <p>Action</p>
        </div>
        <hr />

        {dummyUsers.map((user, i) => {
          return (
            <div key={user.id}>
              <UsersCards
                name={user.name}
                email={user.email}
                status={user.status}
                action={user.role}
              />
              {i < dummyUsers.length - 1 && <hr />}
            </div>
          );
        })}
        <div className={styles.pagination}>
          <p>Showing 1-4 of 4</p>

          <div className={styles.btnsContainer}>
            <button>
              <ChevronLeft size={20} /> Prev
            </button>
            <p>Page 1 / 1</p>
            <button>
              Next <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.userGrowthContainer}>
        <h4>User growth</h4>
        <p>Registered accounts over time</p>

        <div className={styles.stats}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={statsData}
              margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
              barCategoryGap="18%"
            >
              <CartesianGrid
                stroke={gridStroke}
                vertical={false}
                strokeDasharray="3 6"
              />
              <XAxis
                dataKey="month"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                dy={6}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="users"
                name="Users"
                fill="#3b82f6"
                radius={[5, 5, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Users;

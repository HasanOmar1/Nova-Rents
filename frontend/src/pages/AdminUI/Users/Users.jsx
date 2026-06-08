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
import { useUserContext } from "../../../context/UserContext";
import { useEffect } from "react";
import { useState } from "react";
import AdminUsersTable from "../../../components/AdminUsersTable/AdminUsersTable";

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

const Users = () => {
  const { getUsers, usersStats, pagination } = useUserContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ---  THE DEBOUNCE EFFECT (Only delays typing!) ---
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (debouncedSearch !== searchInput) {
        setDebouncedSearch(searchInput);
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, debouncedSearch]);

  useEffect(() => {
    getUsers(currentPage, statusFilter, debouncedSearch);
  }, [currentPage, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (pagination?.totalPages && currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages);
    }
  }, [pagination?.totalPages, currentPage]);

  const handleNextPage = () => {
    if (pagination?.currentPage < pagination?.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination?.currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const topData = [
    {
      title: "All Users",
      value: usersStats.total,
      icon: <UsersIcon size={28} color="#a7d2eb" />,
    },
    {
      title: "Active",
      value: usersStats.active,
      icon: <CheckCircle2 size={28} color="#a7d2eb" />,
    },
    {
      title: "Blocked",
      value: usersStats.blocked,
      icon: <Shield size={28} color="#a7d2eb" />,
    },
    {
      title: "Admins",
      value: usersStats.admins,
      icon: <UsersIcon size={28} color="#a7d2eb" />,
    },
  ];

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
              placeholder="Search Email"
              name="search"
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <div className={styles.right}>
          <label htmlFor="status">Status</label>
          <select
            name="status"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      <AdminUsersTable
        handleNextPage={handleNextPage}
        handlePrevPage={handlePrevPage}
      />

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

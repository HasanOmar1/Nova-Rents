import { Users as UsersIcon, Shield, CheckCircle2, Search } from "lucide-react";
import styles from "./Users.module.css";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import UsersCards from "../../../components/UsersCards/UsersCards";

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
      </div>
    </div>
  );
};

export default Users;

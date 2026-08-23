import {
  Car,
  MapPin,
  Home,
  User,
  AlertTriangle,
  BarChart3,
  Users,
  FileWarning,
  ShieldCheck,
} from "lucide-react";

export const navByRole = {
  guest: [],
  user: ["home", "vehicles", "map", "myVehicles", "profile", "complaints"],
  admin: ["dashboard", "users", "reportedUsers", "allVehicles", "documentsAdmin", "complaintsAdmin", "statistics"],
};

export const icons = {
  home: Home,
  vehicles: Car,
  map: MapPin,
  myVehicles: Car,
  profile: User,
  complaints: AlertTriangle,
  dashboard: BarChart3,
  users: Users,
  complaintsAdmin: FileWarning,
  documentsAdmin: ShieldCheck,
  statistics: BarChart3,
  allVehicles: Car,
  reportedUsers: AlertTriangle,
};

export const labels = {
  home: "Home",
  dashboard: "Dashboard",
  vehicles: "Vehicles",
  map: "Map",
  myVehicles: "My Vehicles",
  profile: "Profile",
  complaints: "Complaints",
  users: "Users",
  complaintsAdmin: "Complaints",
  documentsAdmin: "Documents",
  statistics: "Statistics",
  allVehicles: "All Vehicles",
  reportedUsers: "Reported Users",
};

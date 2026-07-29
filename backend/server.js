const express = require("express");
const session = require("express-session");
const cors = require("cors");
const errorHandler = require("./middleWare/errorMiddleware");
const path = require("path");
require("dotenv").config({ quiet: true }); // quiet = removes the ad from the dotenv developer

// routes
const usersRoute = require("./routes/usersRoute");
const vehiclesRoute = require("./routes/vehiclesRoute");
const rentalRoute = require("./routes/rentalRoute");
const govRoute = require("./routes/govRoute");
const notificationRoute = require("./routes/notificationRoute");
const { startRentalReminderJob } = require("./jobs/rentalReminderJob");
const activityRoute = require("./routes/activityRoute");
const complaintsRoute = require("./routes/complaintsRoute");
const reportRoute = require("./routes/reportRoute");
const paymentsRoute = require("./routes/paymentsRoute");

const app = express();
const port = process.env.PORT || 3000;
const FRONTEND_URL =
  process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
);

app.use("/users", usersRoute);
app.use("/vehicles", vehiclesRoute);
app.use("/rentals", rentalRoute);
app.use("/gov", govRoute);
app.use("/notifications", notificationRoute);
app.use("/activity", activityRoute);
app.use("/complaints", complaintsRoute);
app.use("/reports", reportRoute);
app.use("/payments", paymentsRoute);
app.use(errorHandler);

startRentalReminderJob();

const isProduction = process.env.NODE_ENV === "production";
app.listen(port, () => {
  console.log(
    `Server is running on ${isProduction ? "https://nova-rents.onrender.com/" : "http://localhost:${port}"} `,
  );
});

module.exports = app;

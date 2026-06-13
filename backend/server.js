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

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
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

app.use(errorHandler);

startRentalReminderJob();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;

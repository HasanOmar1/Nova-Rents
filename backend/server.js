const express = require("express");
const session = require("express-session");
const cors = require("cors");
const errorHandler = require("./middleWare/errorMiddleware");
require("dotenv").config({ quiet: true }); // quiet = removes the ad from the dotenv developer
// routes
const usersRoute = require("./routes/usersRoute");
const vehiclesRoute = require("./routes/vehiclesRoute");
const rentalRoute = require("./routes/rentalRoute");  

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

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
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;

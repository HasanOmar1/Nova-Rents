const express = require("express");
const session = require("express-session");
const cors = require("cors");
const errorHandler = require("./middleWare/errorMiddleware");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  quiet: true,
});
const {
  isSafeStoredImageName,
  safeMimeForStoredFile,
} = require("./utils/imageFile");
const {
  isComplaintEvidenceFilename,
} = require("./database/queries/complaintQueries");

// routes
const usersRoute = require("./routes/usersRoute");
const vehiclesRoute = require("./routes/vehiclesRoute");
const rentalRoute = require("./routes/rentalRoute");
const govRoute = require("./routes/govRoute");
const notificationRoute = require("./routes/notificationRoute");
const { startRentalReminderJob } = require("./jobs/rentalReminderJob");
const { startDocumentExpirationJob } = require("./jobs/documentExpirationJob");
const activityRoute = require("./routes/activityRoute");
const complaintsRoute = require("./routes/complaintsRoute");
const reportRoute = require("./routes/reportRoute");
const paymentsRoute = require("./routes/paymentsRoute");
const reportedUsersRoute = require("./routes/reportedUsersRoute");
const documentsRoute = require("./routes/documentsRoute");
const contactRoute = require("./routes/contactRoute");

const isProduction = process.env.NODE_ENV === "production";
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

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(
  "/uploads",
  async (req, res, next) => {
    const filename = String(req.path || "").replace(/^\/+/, "");
    if (!isSafeStoredImageName(filename)) {
      return res.sendStatus(404);
    }

    try {
      if (await isComplaintEvidenceFilename(filename)) {
        return res.sendStatus(404);
      }
      return next();
    } catch (error) {
      return next(error);
    }
  },
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      const safeMime = safeMimeForStoredFile(filePath);
      if (safeMime) res.setHeader("Content-Type", safeMime);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      );
    },
  }),
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
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
app.use("/reported-users", reportedUsersRoute);
app.use("/documents", documentsRoute);
app.use("/contact", contactRoute);
app.use(errorHandler);

startRentalReminderJob();
startDocumentExpirationJob();

app.listen(port, () => {
  console.log(
    `Server is running on ${isProduction ? "https://nova-rents.onrender.com/" : `http://localhost:${port}`} `,
  );
});

module.exports = app;

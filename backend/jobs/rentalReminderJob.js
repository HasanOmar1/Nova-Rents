const cron = require("node-cron");

const {
  getRentalsStartingTomorrow,
  getRentalsEndingTomorrow,
} = require("../database/queries/rentalQueries");

const {
  createNotification,
  checkIfNotificationExists,
} = require("../database/queries/notificationQueries");

function startRentalReminderJob() {
  cron.schedule("0 9 * * *", async () => {
    console.log("Running rental reminder job...");

    const startingRentals = await getRentalsStartingTomorrow();

    for (const rental of startingRentals) {
      const exists = await checkIfNotificationExists(
        rental.renterId,
        rental.rentalId,
        "rental_reminder",
      );

      if (!exists) {
        await createNotification(
          rental.renterId,
          rental.rentalId,
          "rental_reminder",
          "Rental Starts Tomorrow",
          `Your rental for vehicle ${rental.licensePlate} starts tomorrow`,
        );
      }
    }

    const endingRentals = await getRentalsEndingTomorrow();

    for (const rental of endingRentals) {
      const exists = await checkIfNotificationExists(
        rental.renterId,
        rental.rentalId,
        "rental_ending_soon",
      );

      if (!exists) {
        await createNotification(
          rental.renterId,
          rental.rentalId,
          "rental_ending_soon",
          "Rental Ends Tomorrow",
          `Your rental for vehicle ${rental.licensePlate} ends tomorrow`,
        );
      }
    }
  });
}

module.exports = { startRentalReminderJob };

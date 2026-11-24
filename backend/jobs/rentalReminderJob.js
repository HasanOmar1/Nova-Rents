/** Scheduled background processing for rental reminder tasks.
 * Runs periodic database checks and dispatches the resulting notifications. */
const cron = require("node-cron");

const {
  getRentalsStartingTomorrow,
  getRentalsEndingTomorrow,
} = require("../database/queries/rentalQueries");

const {
  createNotification,
  checkIfNotificationExists,
} = require("../database/queries/notificationQueries");

/** Starts rental reminder job.
 * Accepts no arguments; returns no meaningful value after registering the schedule. */
function startRentalReminderJob() {
  cron.schedule("0 9 * * *",
    /** Runs one scheduled background-job cycle.
     * Accepts no arguments; returns a promise when the scheduled work finishes. */
    async () => {
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

// Defines birth-date input bounds for users between eighteen and seventy years old.
// It exports locally formatted minimum and maximum dates for registration forms.
import { formatDateForInput } from "./dateFormat";

const today = new Date();

// 2. Calculate exactly 18 years ago for the MAX date
const maxAgeDate = new Date(
  today.getFullYear() - 18,
  today.getMonth(),
  today.getDate(),
);
const formattedMaxDate = formatDateForInput(maxAgeDate);

// 3. Calculate 70 years ago for the MIN date
const minAgeDate = new Date(
  today.getFullYear() - 70,
  today.getMonth(),
  today.getDate(),
);
const formattedMinDate = formatDateForInput(minAgeDate);

export { formattedMinDate, formattedMaxDate };

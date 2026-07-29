const today = new Date();

// 2. Calculate exactly 18 years ago for the MAX date
const maxAgeDate = new Date(
  today.getFullYear() - 18,
  today.getMonth(),
  today.getDate(),
);
const formattedMaxDate = maxAgeDate.toISOString().split("T")[0];

// 3. Calculate 100 years ago for the MIN date
const minAgeDate = new Date(
  today.getFullYear() - 70,
  today.getMonth(),
  today.getDate(),
);
const formattedMinDate = minAgeDate.toISOString().split("T")[0];

export { formattedMinDate, formattedMaxDate };

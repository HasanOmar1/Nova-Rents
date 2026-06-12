import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Pagination.module.css";

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  handlePrevPage,
  handleNextPage,
  leftText,
}) => {
  // Safety fallbacks so it never breaks if data is missing
  const current = currentPage || 1;
  const total = totalPages || 1;

  // Don't render the pagination if there are no pages
  if (!totalPages || totalPages === 0) return null;

  return (
    <div className={styles.pagination}>
      <p>{leftText}</p>

      <div className={styles.pagBtnsContainer}>
        <button onClick={handlePrevPage} disabled={current === 1}>
          <ChevronLeft size={20} /> Prev
        </button>

        <p>
          Page {current} / {total}
        </p>

        <button onClick={handleNextPage} disabled={current === total}>
          Next <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

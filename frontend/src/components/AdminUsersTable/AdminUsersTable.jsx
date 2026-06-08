import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUserContext } from "../../context/UserContext";
import UsersCards from "../UsersCards/UsersCards";
import styles from "./AdminUsersTable.module.css";

const AdminUsersTable = ({ handleNextPage, handlePrevPage }) => {
  const { allUsers, pagination, blockUser, unBlockUser } = useUserContext();

  console.log(pagination);

  return (
    <div className={styles.AdminUsersTable}>
      <div className={styles.titles}>
        <p>Name</p>
        <p>Email</p>
        <p>Status</p>
        <p>Action</p>
      </div>
      <hr />

      {allUsers?.length ? (
        <>
          {allUsers?.map((user, i) => {
            return (
              <div key={user.userId}>
                <UsersCards
                  user={user}
                  blockUser={blockUser}
                  unBlockUser={unBlockUser}
                />
                {i < allUsers?.length - 1 && <hr />}
              </div>
            );
          })}

          <div className={styles.pagination}>
            <p>Users Count: {pagination?.totalUsers}</p>

            <div className={styles.btnsContainer}>
              <button
                onClick={handlePrevPage}
                disabled={pagination?.currentPage === 1}
              >
                <ChevronLeft size={20} /> Prev
              </button>

              <p>
                Page {pagination?.currentPage} / {pagination?.totalPages}
              </p>
              <button
                onClick={handleNextPage}
                disabled={pagination?.currentPage === pagination?.totalPages}
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className={styles.noUsers}>No users found</p>
      )}
    </div>
  );
};

export default AdminUsersTable;

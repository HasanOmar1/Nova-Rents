import { useUserContext } from "../../context/UserContext";
import UsersCards from "../UsersCards/UsersCards";
import styles from "./AdminUsersTable.module.css";
import Pagination from "../Pagination/Pagination";

const AdminUsersTable = ({ handleNextPage, handlePrevPage }) => {
  const { allUsers, pagination, blockUser, unBlockUser } = useUserContext();

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

          <Pagination
            currentPage={pagination?.currentPage}
            totalPages={pagination?.totalPages}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
            leftText={`Users Count: ${pagination?.totalUsers || 0}`}
          />
        </>
      ) : (
        <p className={styles.noUsers}>No users found</p>
      )}
    </div>
  );
};

export default AdminUsersTable;

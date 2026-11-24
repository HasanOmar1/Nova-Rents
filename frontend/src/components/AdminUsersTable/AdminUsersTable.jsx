// Defines the Admin Users Table React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useUserContext } from "../../context/UserContext";
import UsersCards from "../UsersCards/UsersCards";
import styles from "./AdminUsersTable.module.css";
import Pagination from "../Pagination/Pagination";

// Renders the Admin Users Table interface.
// Accepts an options object and returns rendered JSX.
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
          {allUsers?.map(
            // Runs the callback required by the surrounding operation.
            // Accepts user and i and returns the callback result.
            (user, i) => {
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

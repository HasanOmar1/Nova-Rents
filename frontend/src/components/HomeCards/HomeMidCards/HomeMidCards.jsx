import styles from "./HomeMidCards.module.css";
import HomeMidCardsData from "./HomeMidCardsData";

const activityData = [
  {
    title: "Booking confirmed - BMW 7 Series",
    data: "Today · 9:24",
  },
  {
    title: "Document verification completed",
    data: "Yesterday · 18:40",
  },
  {
    title: "Complaint under review",
    data: "Yesterday · 13:12",
  },
];

const notificationsData = [
  {
    title: "Insurance renewal",
    description: "Expires in 30 days — upload a new copy",
  },
  {
    title: "Listing views",
    description: "Your Yamaha TMAX had 12 views this week",
  },
];

const HomeMidCards = ({ title }) => {
  return (
    <div className={styles.HomeMidCards}>
      <h4>{title}</h4>

      {title === "Recent Activity" ? (
        <>
          {activityData.map((item) => {
            return (
              <HomeMidCardsData
                key={crypto.randomUUID()}
                title={item.title}
                data={item.data}
              />
            );
          })}
        </>
      ) : (
        <>
          {notificationsData.map((item) => {
            return (
              <HomeMidCardsData
                key={crypto.randomUUID()}
                title={item.title}
                data={item.description}
              />
            );
          })}
        </>
      )}
    </div>
  );
};

export default HomeMidCards;

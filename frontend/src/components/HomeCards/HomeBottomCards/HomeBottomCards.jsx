import style from "./HomeBottomCards.module.css";

const HomeBottomCards = ({ title }) => {
  return (
    <div className={style.HomeBottomCards}>
      <p>{title}</p>
      <div className={style.statistics}></div>
    </div>
  );
};

export default HomeBottomCards;

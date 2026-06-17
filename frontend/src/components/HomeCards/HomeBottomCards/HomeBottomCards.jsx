import style from "./HomeBottomCards.module.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const HomeBottomCards = ({ title, type, data, dataKey }) => {
  return (
    <div className={style.HomeBottomCards}>
      <h3>{title}</h3>

      <div className={style.statistics}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={200}
        >
          {type === "line" ? (
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: -30, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#2a2a2a"
              />
              {/* Clean axes without standard solid lines or tick marks */}
              <XAxis
                dataKey="month"
                stroke="#888"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                dy={10}
              />
              <YAxis
                stroke="#888"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              {/* Dark mode tooltip */}
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e1e",
                  borderColor: "#333",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                itemStyle={{ color: "#5494ff" }}
              />
              {/* type="monotone" creates the smooth curve */}
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke="#5494ff"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -30, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#2a2a2a"
              />

              <XAxis
                dataKey="month"
                stroke="#888"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                dy={10}
              />
              <YAxis
                stroke="#888"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e1e",
                  borderColor: "#333",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                cursor={{ fill: "#2a2a2a" }}
              />

              <Bar
                dataKey={dataKey}
                fill="#2ed199"
                radius={[4, 4, 0, 0]}
                barSize={35}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HomeBottomCards;

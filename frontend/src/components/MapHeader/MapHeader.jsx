import { useEffect, useState } from "react";
import "./MapHeader.css";

function MapHeader() {

  const [time, setTime] = useState("");

  const updateTime = () => {

    const d = new Date();

    const date =
      String(d.getDate()).padStart(2, "0") + "." +
      String(d.getMonth() + 1).padStart(2, "0") + "." +
      d.getFullYear();

    const clock =
      String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0") + ":" +
      String(d.getSeconds()).padStart(2, "0");

    setTime(`${date} | ${clock} UZT`);

  };

  useEffect(() => {

    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);

  }, []);

  return (

    <section className="map-head-section">

      <div className="map-head-panel">

        {/* Left Logo */}
        <div className="map-head-logo left">
          <img
            src="https://www.uzgastrade.uz/uploads/news/5113a47870fc653316eb06792726e67a.png"
            alt="Gerb"
          />
        </div>

        {/* Center */}
        <div className="map-head-center">

          <h1>
            O‘ZBEKISTON RESPUBLIKASI MILLIY GVARDIYASI TOSHKENT TUMANI—
            <span> JAVOBGARLIK MAHALLALARI</span>
          </h1>

          <div className="map-head-time">
            {time}
          </div>

        </div>

        {/* Right Logo */}
        <div className="map-head-logo right">
          <img
            src="https://milliygvardiya.uz/assets/public/images/logo.png"
            alt="Gvardiya"
          />
        </div>

      </div>

    </section>

  );
}

export default MapHeader;
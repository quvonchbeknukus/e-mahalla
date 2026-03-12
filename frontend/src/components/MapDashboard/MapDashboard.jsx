import { useState } from "react";
import "./MapDashboard.css";

function MapDashboard() {

  const [mahalla, setMahalla] = useState("");
  const [direction, setDirection] = useState("");

  const mahallalar = [
    "Bog'bon",
    "Gulzor",
    "Navbahor",
    "Do'stlik",
    "Yangiobod"
  ];

  const directions = [
    "Profilaktika",
    "Jinoyatchilik",
    "Yoshlar",
    "Ijtimoiy",
    "Ma'naviy",
    "Migratsiya",
    "Tadbirkorlik",
    "Ayollar",
    "Boshqa"
  ];

  return (

    <div className="map-dashboard">

      {/* TITLE */}
      <div className="dash-title">
        Mahalla nazorat paneli
      </div>


      {/* STATISTICS */}
      <div className="dash-stats">

        <div className="stat-card">
          <span>Mahallalar</span>
          <b>48</b>
        </div>

        <div className="stat-card">
          <span>Bugungi ishlar</span>
          <b>12</b>
        </div>

      </div>




      {/* MAHALLA SELECT */}
      <div className="dash-filter">

        <label>Mahalla tanlash</label>

        <select
          value={mahalla}
          onChange={(e) => setMahalla(e.target.value)}
        >

          <option value="">Barchasi</option>

          {mahallalar.map((item, i) => (
            <option key={i} value={item}>
              {item}
            </option>
          ))}

        </select>

      </div>


      {/* DIRECTION SELECT */}
      <div className="dash-filter">

        <label>Yo'nalish tanlash</label>

        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        >

          <option value="">Barchasi</option>

          {directions.map((item, i) => (
            <option key={i} value={item}>
              {item}
            </option>
          ))}

        </select>

      </div>


      {/* CATEGORY */}
      <div className="dash-category">

        <div className="cat-item green">
          <span>🟢 Kam jinoyat</span>
          <b>18</b>
        </div>

        <div className="cat-item yellow">
          <span>🟡 O'rtacha</span>
          <b>21</b>
        </div>

        <div className="cat-item red">
          <span>🔴 Yuqori</span>
          <b>9</b>
        </div>

      </div>


      {/* DIRECTIONS */}
      <div className="dash-directions">

        <h4>Yo'nalishlar</h4>

        <div className="direction-list">

          {directions.map((item, i) => (

            <button key={i}>
              {item}
            </button>

          ))}

        </div>

      </div>

    </div>

  );
}

export default MapDashboard;
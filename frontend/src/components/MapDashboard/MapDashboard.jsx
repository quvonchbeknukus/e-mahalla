import { useRef } from "react";
import "./MapDashboard.css";

function MapDashboard({
  authenticated,
  authChecking,
  onLogout,
  totalNeighborhoods = 0,
  totalTasks = 0,
  todayTasks = 0,
  neighborhoodOptions = [],
  directionOptions = [],
  selectedNeighborhoodId = "",
  selectedDirectionId = "",
  onNeighborhoodChange,
  onDirectionChange,
  startDate = "",
  endDate = "",
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
  hasActiveFilters = false,
  summaryTitle = "",
  summaryCards = [],
  directionStatsTitle = "",
  directionStatsSubtitle = "",
  directionStats = [],
}) {
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const directionCountById = directionStats.reduce((lookup, item) => {
    lookup[String(item.id)] = item.count;
    return lookup;
  }, {});

  const openDatePicker = (inputRef) => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  return (
    <div className="map-dashboard">
      <div className="dash-title">Mahalla nazorat paneli</div>

      <div className="dash-stats">
        <div className="stat-card">
          <span>Mahallalar</span>
          <b>{totalNeighborhoods}</b>
        </div>

        <div className="stat-card">
          <span>Jami ishlar</span>
          <b>{totalTasks}</b>
        </div>

        <div className="stat-card">
          <span>Bugungi ishlar</span>
          <b>{todayTasks}</b>
        </div>
      </div>

      <div className="dash-body">
        <div className="dash-main">
          <div className="dash-filter">
            <label>Mahalla tanlash</label>

            <select
              value={selectedNeighborhoodId}
              onChange={(event) => onNeighborhoodChange?.(event.target.value)}
            >
              <option value="">Barchasi</option>

              {neighborhoodOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="dash-filter">
            <label>Yo'nalish tanlash</label>

            <select
              value={selectedDirectionId}
              onChange={(event) => onDirectionChange?.(event.target.value)}
            >
              <option value="">Barchasi</option>

              {directionOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({directionCountById[String(item.id)] ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div className="dash-panel-section">
            <div className="dash-section-head">
              <div>
                <span>{summaryTitle}</span>
                <small>Tanlangan filtrlar bo'yicha ko'rsatkichlar</small>
              </div>
            </div>

            <div
              className={`dash-summary-grid${summaryCards.length === 1 ? " is-single" : ""}`}
            >
              {summaryCards.map((item) => (
                <div
                  key={item.key}
                  className={`summary-card summary-card--${item.tone}${item.fullWidth ? " is-full" : ""}`}
                >
                  <span>{item.label}</span>
                  <small>{item.caption}</small>
                  <b>{item.value}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-date-range">
            <label>Vaqt oralig'i</label>

            <div className="dash-date-inputs">
              <div className="dash-date-field">
                <input
                  ref={startDateRef}
                  type="date"
                  value={startDate}
                  onChange={(event) => onStartDateChange?.(event.target.value)}
                />

                <button
                  type="button"
                  className="date-picker-trigger"
                  onClick={() => openDatePicker(startDateRef)}
                  aria-label="Boshlanish sanasini tanlash"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8ZM5 6a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1H5Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>

              <div className="dash-date-field">
                <input
                  ref={endDateRef}
                  type="date"
                  value={endDate}
                  onChange={(event) => onEndDateChange?.(event.target.value)}
                />

                <button
                  type="button"
                  className="date-picker-trigger"
                  onClick={() => openDatePicker(endDateRef)}
                  aria-label="Tugash sanasini tanlash"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8ZM5 6a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1H5Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="clear-filter-btn"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              Filtrni tozalash
            </button>
          </div>
        </div>
      </div>

      {authenticated && (
        <div className="dash-actions">
          <button
            type="button"
            className="logout-btn"
            onClick={onLogout}
            disabled={authChecking}
          >
            {authChecking ? "Kutilmoqda..." : "Chiqish"}
          </button>
        </div>
      )}
    </div>
  );
}

export default MapDashboard;

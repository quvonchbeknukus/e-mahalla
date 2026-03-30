import { useEffect, useMemo, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { Button } from "reactstrap";
import L from "leaflet";
import MapDashboard from "../../components/MapDashboard/MapDashboard";
import MapHeader from "../../components/MapHeader/MapHeader";
import LoginModal from "../../components/LoginModal/LoginModal";
import MahallaModal from "../../components/MahallaModal/MahallaModal";
import WorkModal from "../../components/WorkModal/WorkModal";
import districts from "../../data/tumanlar.json";
import {
  apiRequest,
  fetchCurrentUser,
  isAuthenticated,
  logoutUser,
} from "../../utils/auth";
import "./style.css";

function getCrimeLevelKey(crimeLevel) {
  if (!crimeLevel) {
    return null;
  }

  const normalizedCrimeLevel = String(crimeLevel).trim().toLowerCase();

  if (["yashil", "past"].includes(normalizedCrimeLevel)) {
    return "green";
  }

  if (["sariq", "o'rta", "orta"].includes(normalizedCrimeLevel)) {
    return "yellow";
  }

  if (["qizil", "yuqori"].includes(normalizedCrimeLevel)) {
    return "red";
  }

  return null;
}

function createEmptyCrimeStats() {
  return {
    green: 0,
    yellow: 0,
    red: 0,
  };
}

function normalizeNeighborhood(item) {
  const lat = Number(item.lat);
  const long = Number(item.long);
  const totalTasksCount = Number(item.total_tasks_count ?? 0);
  const todayTasksCount = Number(item.today_tasks_count ?? 0);

  return {
    ...item,
    lat,
    long,
    total_tasks_count: Number.isFinite(totalTasksCount) ? totalTasksCount : 0,
    today_tasks_count: Number.isFinite(todayTasksCount) ? todayTasksCount : 0,
    description: [
      `Jami ishlar: ${Number.isFinite(totalTasksCount) ? totalTasksCount : 0}`,
      `Mahalla raisi: ${item.neighborhood_chairman}`,
      `Telefon: ${item.neighborhood_phone}`,
      `Profilaktika inspektori: ${item.prevention_inspector}`,
      `Inspektor telefoni: ${item.inspector_phone}`,
    ].join(" | "),
  };
}

function normalizeTaskItem(item) {
  return {
    id: item.id,
    neighborhood_id: Number(item.neighborhood_id),
    direction_id: Number(item.direction_id),
    date: item.date,
  };
}

function createNeighborhoodPinIcon(taskCount, crimeLevelKey = "red") {
  return L.divIcon({
    className: "neighborhood-pin-icon",
    html: `
      <div class="neighborhood-pin neighborhood-pin--${crimeLevelKey}">
        <span class="neighborhood-pin__inner"></span>
        <span class="neighborhood-pin__badge neighborhood-pin__badge--${crimeLevelKey}">${taskCount}</span>
      </div>
    `,
    iconSize: [34, 50],
    iconAnchor: [17, 46],
  });
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createMarkerPositionMap(neighborhoods) {
  const groupedNeighborhoods = neighborhoods.reduce((groups, item) => {
    const key = `${item.lat}:${item.long}`;

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(item);

    return groups;
  }, {});

  return Object.values(groupedNeighborhoods).reduce((positions, group) => {
    const sortedGroup = [...group].sort((firstItem, secondItem) => firstItem.id - secondItem.id);

    if (sortedGroup.length === 1) {
      positions[sortedGroup[0].id] = [sortedGroup[0].lat, sortedGroup[0].long];
      return positions;
    }

    const radius = 0.00018;

    sortedGroup.forEach((item, index) => {
      const angle = (2 * Math.PI * index) / sortedGroup.length;

      positions[item.id] = [
        item.lat + Math.sin(angle) * radius,
        item.long + Math.cos(angle) * radius,
      ];
    });

    return positions;
  }, {});
}

function MapViewportController({ focusNeighborhood, visibleNeighborhoods }) {
  const map = useMap();

  useEffect(() => {
    if (focusNeighborhood) {
      map.flyTo([focusNeighborhood.lat, focusNeighborhood.long], 15, {
        animate: true,
        duration: 0.8,
      });
      return;
    }

    if (visibleNeighborhoods.length === 1) {
      map.flyTo(
        [visibleNeighborhoods[0].lat, visibleNeighborhoods[0].long],
        14,
        {
          animate: true,
          duration: 0.8,
        }
      );
      return;
    }

    if (visibleNeighborhoods.length > 1) {
      const bounds = L.latLngBounds(
        visibleNeighborhoods.map((item) => [item.lat, item.long])
      );

      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 13,
      });
    }
  }, [focusNeighborhood, map, visibleNeighborhoods]);

  return null;
}

function Map() {
  const position = [41.42623827519427, 69.26237574615256];
  const tashkentDistrict = districts.find(
    (item) => item.id === 2722 && item.geo_polygon
  );
  const geoData = tashkentDistrict?.geo_polygon
    ? {
        type: "Feature",
        properties: {
          name: tashkentDistrict.name,
        },
        geometry: tashkentDistrict.geo_polygon,
      }
    : null;

  const [selectedMahalla, setSelectedMahalla] = useState(null);
  const [allNeighborhoods, setAllNeighborhoods] = useState([]);
  const [directionOptions, setDirectionOptions] = useState([]);
  const [taskItems, setTaskItems] = useState([]);
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState("");
  const [selectedDirectionId, setSelectedDirectionId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [open, setOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());
  const [authChecking, setAuthChecking] = useState(true);
  const todayDateKey = getTodayDateKey();

  useEffect(() => {
    let active = true;

    const syncAuthState = async () => {
      if (!isAuthenticated()) {
        if (active) {
          setAuthenticated(false);
          setAuthChecking(false);
        }

        return;
      }

      try {
        const user = await fetchCurrentUser();

        if (!active) {
          return;
        }

        setAuthenticated(Boolean(user));
      } catch (error) {
        if (!active) {
          return;
        }

        setAuthenticated(false);
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    };

    syncAuthState();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadMapData = async () => {
      try {
        const [neighborhoodResponse, directionResponse, taskResponse] =
          await Promise.all([
            apiRequest("/neighborhoods"),
            apiRequest("/directions"),
            apiRequest("/tasks"),
          ]);

        if (!active) {
          return;
        }

        setAllNeighborhoods(
          (neighborhoodResponse.data ?? []).map(normalizeNeighborhood)
        );
        setDirectionOptions(directionResponse.data ?? []);
        setTaskItems((taskResponse.data ?? []).map(normalizeTaskItem));
      } catch (error) {
        if (active) {
          setAllNeighborhoods([]);
          setDirectionOptions([]);
          setTaskItems([]);
        }
      }
    };

    loadMapData();

    return () => {
      active = false;
    };
  }, []);

  const mappableNeighborhoods = useMemo(
    () =>
      allNeighborhoods.filter(
        (item) =>
          Number.isFinite(item.lat) &&
          Number.isFinite(item.long) &&
          item.lat !== 0 &&
          item.long !== 0
      ),
    [allNeighborhoods]
  );

  const dateFilteredTaskItems = useMemo(
    () =>
      taskItems.filter((item) => {
        if (startDate && item.date < startDate) {
          return false;
        }

        if (endDate && item.date > endDate) {
          return false;
        }

        return true;
      }),
    [endDate, startDate, taskItems]
  );

  const filteredTaskItems = useMemo(
    () =>
      dateFilteredTaskItems.filter((item) => {
        if (
          selectedDirectionId &&
          String(item.direction_id) !== selectedDirectionId
        ) {
          return false;
        }

        return true;
      }),
    [dateFilteredTaskItems, selectedDirectionId]
  );

  const hasTaskFilters = Boolean(selectedDirectionId || startDate || endDate);

  const selectedNeighborhoodTaskItems = useMemo(
    () =>
      selectedNeighborhoodId
        ? dateFilteredTaskItems.filter(
            (item) => String(item.neighborhood_id) === selectedNeighborhoodId
          )
        : [],
    [dateFilteredTaskItems, selectedNeighborhoodId]
  );

  const taskCountsByNeighborhood = useMemo(
    () =>
      filteredTaskItems.reduce((counts, item) => {
        counts[item.neighborhood_id] = (counts[item.neighborhood_id] ?? 0) + 1;
        return counts;
      }, {}),
    [filteredTaskItems]
  );

  const visibleNeighborhoodIds = useMemo(
    () => {
      const ids = new Set(
        hasTaskFilters
          ? filteredTaskItems.map((item) => item.neighborhood_id)
          : mappableNeighborhoods.map((item) => item.id)
      );

      if (selectedNeighborhoodId) {
        ids.add(Number(selectedNeighborhoodId));
      }

      return ids;
    },
    [filteredTaskItems, hasTaskFilters, mappableNeighborhoods, selectedNeighborhoodId]
  );

  const visibleNeighborhoods = useMemo(
    () =>
      mappableNeighborhoods.filter((item) => visibleNeighborhoodIds.has(item.id)),
    [mappableNeighborhoods, visibleNeighborhoodIds]
  );

  const markerPositions = useMemo(
    () => createMarkerPositionMap(visibleNeighborhoods),
    [visibleNeighborhoods]
  );

  const neighborhoodOptions = useMemo(
    () => mappableNeighborhoods,
    [mappableNeighborhoods]
  );

  const focusedNeighborhood = useMemo(
    () =>
      neighborhoodOptions.find((item) => String(item.id) === selectedNeighborhoodId),
    [neighborhoodOptions, selectedNeighborhoodId]
  );

  const dashboardNeighborhoodSource = useMemo(
    () => (hasTaskFilters ? visibleNeighborhoods : allNeighborhoods),
    [allNeighborhoods, hasTaskFilters, visibleNeighborhoods]
  );

  const dashboardTaskItems = useMemo(
    () =>
      dateFilteredTaskItems.filter((item) => {
        if (
          selectedNeighborhoodId &&
          String(item.neighborhood_id) !== selectedNeighborhoodId
        ) {
          return false;
        }

        if (
          selectedDirectionId &&
          String(item.direction_id) !== selectedDirectionId
        ) {
          return false;
        }

        return true;
      }),
    [dateFilteredTaskItems, selectedDirectionId, selectedNeighborhoodId]
  );

  const dashboardStats = useMemo(
    () => ({
      totalNeighborhoods: dashboardNeighborhoodSource.length,
      totalTasks: dashboardTaskItems.length,
      todayTasks: dashboardNeighborhoodSource.reduce(
        (total, item) => total + Number(item.today_tasks_count ?? 0),
        0
      ),
    }),
    [dashboardNeighborhoodSource, dashboardTaskItems]
  );

  const neighborhoodCrimeStats = useMemo(
    () =>
      dashboardNeighborhoodSource.reduce(
        (stats, item) => {
          const crimeLevelKey = getCrimeLevelKey(item.crime_level);

          if (crimeLevelKey) {
            stats[crimeLevelKey] += 1;
          }

          return stats;
        },
        createEmptyCrimeStats()
      ),
    [dashboardNeighborhoodSource]
  );

  const neighborhoodsById = useMemo(
    () =>
      allNeighborhoods.reduce((lookup, item) => {
        lookup[item.id] = item;
        return lookup;
      }, {}),
    [allNeighborhoods]
  );

  const crimeLevelByNeighborhoodId = useMemo(
    () =>
      allNeighborhoods.reduce((lookup, item) => {
        lookup[item.id] = getCrimeLevelKey(item.crime_level);
        return lookup;
      }, {}),
    [allNeighborhoods]
  );

  const directionCrimeStats = useMemo(
    () =>
      filteredTaskItems.reduce(
        (stats, item) => {
          const crimeLevelKey = crimeLevelByNeighborhoodId[item.neighborhood_id];

          if (crimeLevelKey) {
            stats[crimeLevelKey] += 1;
          }

          return stats;
        },
        createEmptyCrimeStats()
      ),
    [crimeLevelByNeighborhoodId, filteredTaskItems]
  );

  const selectedNeighborhoodData = useMemo(
    () =>
      selectedNeighborhoodId
        ? neighborhoodsById[Number(selectedNeighborhoodId)] ?? null
        : null,
    [neighborhoodsById, selectedNeighborhoodId]
  );

  const directionTaskCounts = useMemo(
    () => {
      const source = selectedNeighborhoodId
        ? selectedNeighborhoodTaskItems
        : dateFilteredTaskItems;

      return source.reduce((counts, item) => {
        counts[item.direction_id] = (counts[item.direction_id] ?? 0) + 1;
        return counts;
      }, {});
    },
    [dateFilteredTaskItems, selectedNeighborhoodId, selectedNeighborhoodTaskItems]
  );

  const directionStats = useMemo(
    () =>
      directionOptions.map((item) => ({
        id: item.id,
        name: item.name,
        count: directionTaskCounts[item.id] ?? 0,
      })),
    [directionOptions, directionTaskCounts]
  );

  const summaryCards = useMemo(() => {
    if (selectedNeighborhoodData) {
      return [
        {
          key: `neighborhood-${selectedNeighborhoodData.id}`,
          label: selectedNeighborhoodData.name,
          caption: "Jami tadbirlar soni",
          value: selectedNeighborhoodTaskItems.length,
          tone: "info",
          fullWidth: true,
        },
      ];
    }

    const activeCrimeStats = selectedDirectionId
      ? directionCrimeStats
      : neighborhoodCrimeStats;
    const caption = selectedDirectionId
      ? "Tadbirlar soni"
      : "Mahallalar soni";

    return [
      {
        key: "green",
        label: "Yashil mahalla",
        caption,
        value: activeCrimeStats.green,
        tone: "green",
      },
      {
        key: "yellow",
        label: "Sariq mahalla",
        caption,
        value: activeCrimeStats.yellow,
        tone: "yellow",
      },
      {
        key: "red",
        label: "Qizil mahalla",
        caption,
        value: activeCrimeStats.red,
        tone: "red",
      },
    ];
  }, [
    directionCrimeStats,
    neighborhoodCrimeStats,
    selectedDirectionId,
    selectedNeighborhoodData,
    selectedNeighborhoodTaskItems.length,
  ]);

  const summaryTitle = selectedNeighborhoodData
    ? "Tanlangan mahalla"
    : selectedDirectionId
      ? "Yo'nalish bo'yicha taqsimot"
      : "Mahalla toifalari";

  const directionStatsTitle = selectedNeighborhoodData
    ? "Tanlangan mahallada yo'nalishlar"
    : "Yo'nalishlar bo'yicha jami";

  const directionStatsSubtitle = selectedNeighborhoodData
    ? `${selectedNeighborhoodData.name} mahallasidagi tadbirlar`
    : "Har yo'nalish bo'yicha o'tkazilgan tadbirlar soni";

  useEffect(() => {
    if (
      selectedNeighborhoodId &&
      !neighborhoodOptions.some(
        (item) => String(item.id) === selectedNeighborhoodId
      )
    ) {
      setSelectedNeighborhoodId("");
    }
  }, [neighborhoodOptions, selectedNeighborhoodId]);

  const handleActionButtonClick = () => {
    if (authChecking) {
      return;
    }

    if (authenticated) {
      setOpen(true);
      return;
    }

    setLoginModalOpen(true);
  };

  const handleLoginSuccess = () => {
    setAuthenticated(true);
    setAuthChecking(false);
    setLoginModalOpen(false);
  };

  const handleLogout = async () => {
    setAuthChecking(true);

    try {
      await logoutUser();
    } finally {
      setOpen(false);
      setLoginModalOpen(false);
      setAuthenticated(false);
      setAuthChecking(false);
    }
  };

  const handleStartDateChange = (value) => {
    setStartDate(value);

    if (endDate && value && value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value) => {
    setEndDate(value);

    if (startDate && value && value < startDate) {
      setStartDate(value);
    }
  };

  const handleClearFilters = () => {
    setSelectedNeighborhoodId("");
    setSelectedDirectionId("");
    setStartDate("");
    setEndDate("");
    setSelectedMahalla(null);
  };

  const handleNeighborhoodUpdated = (updatedNeighborhood) => {
    const normalizedNeighborhood = normalizeNeighborhood(updatedNeighborhood);

    setAllNeighborhoods((currentNeighborhoods) =>
      currentNeighborhoods.map((item) =>
        item.id === normalizedNeighborhood.id
          ? {
              ...item,
              ...normalizedNeighborhood,
            }
          : item
      )
    );
  };

  const handleNeighborhoodCreated = (createdNeighborhood) => {
    const normalizedNeighborhood = normalizeNeighborhood(createdNeighborhood);

    setAllNeighborhoods((currentNeighborhoods) => [
      normalizedNeighborhood,
      ...currentNeighborhoods.filter((item) => item.id !== normalizedNeighborhood.id),
    ]);
  };

  const handleNeighborhoodDeleted = (deletedNeighborhoodId) => {
    setAllNeighborhoods((currentNeighborhoods) =>
      currentNeighborhoods.filter((item) => item.id !== deletedNeighborhoodId)
    );
    setTaskItems((currentTaskItems) =>
      currentTaskItems.filter((item) => item.neighborhood_id !== deletedNeighborhoodId)
    );
    setSelectedNeighborhoodId((currentNeighborhoodId) =>
      String(deletedNeighborhoodId) === currentNeighborhoodId
        ? ""
        : currentNeighborhoodId
    );
  };

  const handleTaskUpdated = (updatedTask, previousTask) => {
    setTaskItems((currentTaskItems) =>
      currentTaskItems.map((item) =>
        item.id === updatedTask.id ? normalizeTaskItem(updatedTask) : item
      )
    );

    if (!previousTask || previousTask.date === updatedTask.date) {
      return;
    }

    setAllNeighborhoods((currentNeighborhoods) =>
      currentNeighborhoods.map((item) => {
        if (item.id !== updatedTask.neighborhood_id) {
          return item;
        }

        const currentTodayCount = Number(item.today_tasks_count ?? 0);
        const nextTodayCount =
          currentTodayCount +
          (updatedTask.date === todayDateKey ? 1 : 0) -
          (previousTask.date === todayDateKey ? 1 : 0);

        return {
          ...item,
          today_tasks_count: Math.max(0, nextTodayCount),
        };
      })
    );
  };

  const handleTaskDeleted = (task) => {
    setTaskItems((currentTaskItems) =>
      currentTaskItems.filter((item) => item.id !== task.id)
    );

    setAllNeighborhoods((currentNeighborhoods) =>
      currentNeighborhoods.map((item) => {
        if (item.id !== task.neighborhood_id) {
          return item;
        }

        return {
          ...item,
          total_tasks_count: Math.max(0, Number(item.total_tasks_count ?? 0) - 1),
          today_tasks_count:
            task.date === todayDateKey
              ? Math.max(0, Number(item.today_tasks_count ?? 0) - 1)
              : Number(item.today_tasks_count ?? 0),
        };
      })
    );
  };

  return (
    <>
      <MapHeader />
      <MapDashboard
        authenticated={authenticated}
        authChecking={authChecking}
        onLogout={handleLogout}
        totalNeighborhoods={dashboardStats.totalNeighborhoods}
        totalTasks={dashboardStats.totalTasks}
        todayTasks={dashboardStats.todayTasks}
        neighborhoodOptions={neighborhoodOptions}
        directionOptions={directionOptions}
        selectedNeighborhoodId={selectedNeighborhoodId}
        selectedDirectionId={selectedDirectionId}
        onNeighborhoodChange={setSelectedNeighborhoodId}
        onDirectionChange={setSelectedDirectionId}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={Boolean(
          selectedNeighborhoodId || selectedDirectionId || startDate || endDate
        )}
        summaryTitle={summaryTitle}
        summaryCards={summaryCards}
        directionStatsTitle={directionStatsTitle}
        directionStatsSubtitle={directionStatsSubtitle}
        directionStats={directionStats}
      />

      <WorkModal open={open} setOpen={setOpen} />

      <Button
        color="success"
        className="add-work-btn"
        onClick={handleActionButtonClick}
        disabled={authChecking}
      >
        {authChecking
          ? "Tekshirilmoqda..."
          : authenticated
            ? "+ Kiritish"
            : "Kirish"}
      </Button>

      <LoginModal
        isOpen={loginModalOpen}
        toggle={() => setLoginModalOpen((currentValue) => !currentValue)}
        onSuccess={handleLoginSuccess}
      />

      <MapContainer
        center={position}
        zoom={12}
        style={{ height: "100vh", width: "100%" }}
      >
        <MapViewportController
          focusNeighborhood={focusedNeighborhood}
          visibleNeighborhoods={visibleNeighborhoods}
        />

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoData && (
          <GeoJSON
            data={geoData}
            interactive={false}
            style={{
              color: "#1e3a8a",
              weight: 2,
              fillColor: "#3b82f6",
              fillOpacity: 0.45,
            }}
          />
        )}

        {visibleNeighborhoods.map((item) => (
          <Marker
            key={`neighborhood-${item.id}`}
            position={markerPositions[item.id] ?? [item.lat, item.long]}
            icon={createNeighborhoodPinIcon(
              hasTaskFilters
                ? taskCountsByNeighborhood[item.id] ?? 0
                : item.total_tasks_count,
              getCrimeLevelKey(item.crime_level) ?? "red"
            )}
            eventHandlers={{
              click: () => setSelectedMahalla(item),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              {item.name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      <MahallaModal
        selectedMahalla={selectedMahalla}
        setSelectedMahalla={setSelectedMahalla}
        authenticated={authenticated}
        selectedDirectionId={selectedDirectionId}
        startDate={startDate}
        endDate={endDate}
        onNeighborhoodUpdated={handleNeighborhoodUpdated}
        onNeighborhoodCreated={handleNeighborhoodCreated}
        onNeighborhoodDeleted={handleNeighborhoodDeleted}
        directionOptions={directionOptions}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
    </>
  );
}

export default Map;

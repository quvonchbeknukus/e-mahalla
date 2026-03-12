import { MapContainer, TileLayer, GeoJSON, Marker } from "react-leaflet";
import { Button } from "reactstrap";
import { useState } from "react";
import L from "leaflet";
import districts from "../../data/tumanlar.json";
import mahallalar from "../../data/mahallalar.json";
import MapHeader from "../../components/MapHeader/MapHeader";
import MapDashboard from "../../components/MapDashboard/MapDashboard";
import WorkModal from "../../components/WorkModal/WorkModal";
import MahallaModal from "../../components/MahallaModal/MahallaModal";
import "./style.css";

function Map() {

const createIcon = (item) => {

  let iconUrl = "";

  if(item.category === "low"){
    iconUrl = "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
  }

  if(item.category === "medium"){
    iconUrl = "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
  }

  if(item.category === "high"){
    iconUrl = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";
  }

  return L.divIcon({

    className: "custom-marker",

    html: `
      <div class="marker-wrapper">

        <img 
        src="${iconUrl}"
        class="marker-icon"
        />

        <div class="marker-count">
          ${item.works}
        </div>

      </div>
    `,

    iconSize: [30, 40],
    iconAnchor: [16, 32]

  });

};

    const position = [41.42623827519427, 69.26237574615256];
    const [selectedMahalla, setSelectedMahalla] = useState(null);

    const tashkentDistrict = districts.find(
        (item) => item.name === "Тошкент тумани"
    );

    const geoData = {
        type: "Feature",
        properties: {
        name: tashkentDistrict.name,
        },
        geometry: tashkentDistrict.geo_polygon,
    };

    const handleMarkerClick = (item) => {
          console.log("bosildi", item)
        setSelectedMahalla(item);
  
    };

    const [open,setOpen]=useState(false);

  

  return (
    <>
      <MapHeader />
      <MapDashboard />
      <WorkModal
        open={open}
        setOpen={setOpen}
        />
        <Button
        color="success"
        className="add-work-btn"
        onClick={()=>setOpen(true)}
        >
        + Kiritish
        </Button>
      <MapContainer center={position} zoom={12} style={{ height: "100vh", width: "100%" }}>
        
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

        {/* Tuman polygon */}
      <GeoJSON
            data={geoData}
            interactive={false}
            style={{
                color: "#1e3a8a",
                weight: 2,
                fillColor: "#3b82f6",
                fillOpacity: 0.45
            }}
            />

     {mahallalar.map((item) => (

        <Marker
          key={item.id}
          position={[item.lat, item.lng]}
          icon={createIcon(item)}
          eventHandlers={{
            click: () => handleMarkerClick(item)
          }}
        />

      ))}

      </MapContainer>

      <MahallaModal
        selectedMahalla={selectedMahalla}
        setSelectedMahalla={setSelectedMahalla}
        />
    </>
  );
}

export default Map;
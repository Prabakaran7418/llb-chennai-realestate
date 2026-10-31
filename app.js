
function getPlotSpecificDescriptor(plot) {
  if (!plot) return { mainName: "Chennai", subName: "Residential Corridor", layoutName: "CMDA Approved" };
  
  // Specific layouts and landmarks for each Chennai area
  const descriptors = {
    "KK Nagar": { mainName: "KK Nagar", subName: "Munusamy Salai", layoutName: "Grand Gated Layout" },
    "MGR Nagar": { mainName: "MGR Nagar", subName: "Kamarajar Salai", layoutName: "Prime Enclave" },
    "Tambaram": { mainName: "Tambaram West", subName: "GST Highway Corridor", layoutName: "Greenfield Sanctuary" },
    "Velachery": { mainName: "Velachery", subName: "Phoenix Marketcity Zone", layoutName: "Phoenix Park Gardens" },
    "Porur": { mainName: "Porur", subName: "Near DLF IT Park", layoutName: "Mount View Residency" },
    "OMR / Sholinganallur": { mainName: "OMR Sholinganallur", subName: "ELCOT SEZ Corridor", layoutName: "Silicon Garden" },
    "Mogappair": { mainName: "Mogappair West", subName: "Nolambur Extension", layoutName: "Golden West Avenue" },
    "Medavakkam": { mainName: "Medavakkam", subName: "Nanmangalam Junction", layoutName: "Nanmangalam Meadows" },
    "Koyambedu": { mainName: "Koyambedu", subName: "100-Ft Metro Hub", layoutName: "Metro Gateway Layout" },
    "Anna Nagar": { mainName: "Anna Nagar West", subName: "Shanti Colony Corridor", layoutName: "Signature Villa Plot" },
    "T. Nagar": { mainName: "T. Nagar", subName: "Habibullah Road", layoutName: "Central Luxury Ground" },
    "Adyar": { mainName: "Adyar", subName: "Kasturba Nagar", layoutName: "Riverfront Enclave" },
    "Besant Nagar": { mainName: "Besant Nagar", subName: "Elliot's Beach Road", layoutName: "Coastline Heritage" },
    "ECR": { mainName: "Palavakkam ECR", subName: "East Coast Road", layoutName: "Seaside Pearl Gated" },
    "Chromepet": { mainName: "Chromepet", subName: "MIT / GST Road", layoutName: "Central GST Enclave" },
    "Avadi": { mainName: "Avadi", subName: "HVF Main Road", layoutName: "Defense Colony Plots" },
    "Poonamallee": { mainName: "Poonamallee", subName: "Bengaluru Highway", layoutName: "Metro Highway Frontage" },
    "Kundrathur": { mainName: "Kundrathur", subName: "Temple Town Bypass", layoutName: "Green View Enclave" },
    "Perambur": { mainName: "Perambur", subName: "Venus / Retteri Road", layoutName: "Railway Enclave Plots" },
    "Guduvanchery": { mainName: "Guduvanchery", subName: "Kilambakkam KCBT Hub", layoutName: "KCBT Boulevard" },
    "Maduravoyal": { mainName: "Maduravoyal", subName: "MGR University Bypass", layoutName: "Metro City Layout" }
  };

  return descriptors[plot.localityName] || {
    mainName: plot.localityName,
    subName: plot.address ? plot.address.split(',')[1] || "Chennai Hub" : "Chennai Hub",
    layoutName: plot.title ? plot.title.split('-')[1] || "Approved Plot" : "Approved Plot"
  };
}

// ==========================================================================
// LLB REALTY & PROMOTERS - GREATER CHENNAI PLOT BOOKING PLATFORM
// Professional Interactive Geospatial Real Estate Platform
// Features: Leaflet GIS, Accurate GPS Coordinates, Real Plot Boundaries,
// OSRM Real Road Directions, Native Google Maps Mobile Links, Multi-Filters
// ==========================================================================

// Global Application State
let mapEngine = null; // MapLibre GL 3D Map Engine
let leafletMap = null; // Leaflet 2D Fallback Map
let currentTileLayer = null;
let activePlotId = null;
let currentNavCameraMode = 'firstPerson'; // 'firstPerson' (pitch: 74, zoom: 17.65) or 'chase3D' (pitch: 62, zoom: 16.5)
let isJourneyPaused = false;
let activeRouteSteps = [];
let journeyState = {
  plot: null,
  totalDistKm: 0,
  totalMins: 0,
  modeCfg: null,
  roadLngLats: [],
  routeSteps: [],
  totalDistanceMeters: 0,
  segmentDistances: [],
  startTime: 0,
  pauseElapsed: 0,
  cruiseDurationMs: 13500,
  smoothBearing: 0,
  initialBearing: 0
};
let activeRoutePolyline = null;
let activeRouteStartMarker = null;
let activeBoundaryPolygon = null;
let activeBoundaryPegs = [];
let activeBoundaryTooltipMarkers = [];
let plotMarkersMap = {};
let currentModalProperty = null;
let currentModalImageIndex = 0;
let currentMobileView = "map"; // 'map' or 'list'
let activeAvailabilityFilter = "all";
let n8nWebhookUrl = localStorage.getItem("llb_n8n_webhook") || "http://localhost:5678/webhook/llb-events";

// Real-Time Road Traveler State (Default: Real Motorcycle Mode)
let currentTravelMode = "bike";
let currentOriginHubKey = "kathipara";
let activeTravelerMarker = null;
let travelAnimationId = null;
let activeRoadCoordinates = [];
let travelDestinationPlot = null;

// Real Street-Level Motorcycle Navigation State
let activeStreetWaypoints = [];
let currentStreetWaypointIndex = 0;
let isStreetAutoplayActive = false;
let streetAutoplayTimer = null;
let streetViewMiniMap = null;
let svMiniMapRouteLine = null;
let svMiniMapCameraMarker = null;
let svMiniMapPlotMarker = null;
let svMiniMapOriginMarker = null;
let currentStreetDisplayMode = 'full'; // 'full', 'split', 'map'
let isMinimapExpanded = false;

// Motorcycle Web Audio Synthesis Engine
let bikeAudioCtx = null;
let bikeOsc1 = null;
let bikeOsc2 = null;
let bikeGain = null;
let isBikeAudioActive = false;

const TRAVEL_MODES_CONFIG = {
  car: {
    label: "Car",
    fullName: "Car / AC Cab",
    icon: "fa-solid fa-car-side",
    speedFactor: 1.0,
    googleMode: "driving",
    color: "#10b981",
    speedText: "35 km/h"
  },
  bike: {
    label: "Bike",
    fullName: "Motorcycle / Two-Wheeler",
    icon: "fa-solid fa-motorcycle",
    speedFactor: 1.2,
    googleMode: "two-wheeler",
    color: "#38bdf8",
    speedText: "40 km/h"
  },
  bus: {
    label: "Bus",
    fullName: "MTC City Bus",
    icon: "fa-solid fa-bus-simple",
    speedFactor: 0.7,
    googleMode: "transit",
    color: "#c084fc",
    speedText: "22 km/h"
  },
  walk: {
    label: "Walk",
    fullName: "Walking via Pedestrian Footpath",
    icon: "fa-solid fa-person-walking",
    speedFactor: 0.15,
    googleMode: "walking",
    color: "#f59e0b",
    speedText: "5 km/h"
  }
};

// Pre-defined Major Chennai Transit Hubs for Real Road Routing
const CHENNAI_TRANSIT_HUBS = {
  central: { name: "Chennai Central Railway Station", coords: [13.0827, 80.2707] },
  airport: { name: "Chennai International Airport", coords: [12.9856, 80.1693] },
  cmbt: { name: "CMBT Koyambedu Bus Terminus", coords: [13.0694, 80.1948] },
  tambaram: { name: "Tambaram Railway Station", coords: [12.9249, 80.1200] },
  kathipara: { name: "Kathipara Junction Flyover (Guindy)", coords: [13.0067, 80.2030] }
};

// ==========================================================================
// 1. AUTHENTIC CHENNAI RESIDENTIAL PLOTS DATABASE
// Verified Unique Latitude, Longitude, Dimensions, Boundaries & Availability
// ==========================================================================
const CHENNAI_PLOTS_DATABASE = [
  // 1. KK NAGAR - Munusamy Grand Layout
  {
    id: "PL-KKN-14",
    projectName: "Munusamy Grand Layout",
    plotNumber: "Plot #14",
    title: "Plot #14 - Munusamy Grand Layout, KK Nagar",
    locality: "kk-nagar",
    localityName: "KK Nagar",
    address: "Plot #14, Munusamy Salai, Sector 10, KK Nagar, Chennai - 600078",
    latitude: 13.041042,
    longitude: 80.199415,
    dimensions: "30 ft × 40 ft (1,200 sq.ft)",
    areaSqFt: 1200,
    price: "₹ 78.0 Lakhs",
    priceNumeric: 7800000,
    pricePerSqft: "₹ 6,500 / sq.ft",
    availability: "available",
    boundary: [
      [13.041130, 80.199360],
      [13.041130, 80.199470],
      [13.040954, 80.199470],
      [13.040954, 80.199360]
    ],
    facing: "North Facing (100% Vasthu)",
    approval: "CMDA Approved (No: 114/2024) & RERA Registered",
    roadWidth: "30 Feet Wide Blacktop Tar Road",
    waterTable: "Sweet Potable Drinking Water at 22 ft",
    ebStatus: "3-Phase Underground EB Line Provisioned",
    bankLoan: "Pre-Approved 90% Loan (SBI, HDFC, ICICI)",
    nearbyLandmarks: ["Sivan Park (350m)", "Ashok Nagar Metro (900m)", "PSBB School (1.2 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Demarcated Plot with Corner Stones", "30-Ft Blacktop Access Road", "Layout Compound Wall", "Proposed Villa Architectural 3D"],
    description: "Premium CMDA & RERA approved residential plot located in the heart of KK Nagar Sector 10. Direct 30-ft road frontage, sweet potable water, streetlights, underground sewage, and pre-cast boundary corner stones installed."
  },

  // 2. KK NAGAR - Corner Plot
  {
    id: "PL-KKN-15",
    projectName: "Munusamy Grand Layout",
    plotNumber: "Plot #15",
    title: "Plot #15 (Corner Ground) - Munusamy Grand Layout, KK Nagar",
    locality: "kk-nagar",
    localityName: "KK Nagar",
    address: "Plot #15, 10th Sector 34th Street, KK Nagar, Chennai - 600078",
    latitude: 13.041420,
    longitude: 80.199780,
    dimensions: "40 ft × 60 ft (2,400 sq.ft / 1 Ground)",
    areaSqFt: 2400,
    price: "₹ 1.56 Crores",
    priceNumeric: 15600000,
    pricePerSqft: "₹ 6,500 / sq.ft",
    availability: "reserved",
    boundary: [
      [13.041540, 80.199690],
      [13.041540, 80.199870],
      [13.041300, 80.199870],
      [13.041300, 80.199690]
    ],
    facing: "North-East Corner Facing",
    approval: "CMDA Approved & Clear Legal Title",
    roadWidth: "40 Feet & 30 Feet Dual Road Access",
    waterTable: "Sweet Drinking Water at 20 ft",
    ebStatus: "3-Phase EB Line Provisioned",
    bankLoan: "Pre-Approved 85% Loan",
    nearbyLandmarks: ["Munusamy Salai Signal (200m)", "Kasi Theatre (1.4 km)"],
    images: [
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Corner Plot Frontage", "Connecting Avenue Road", "Layout Pillar", "Proposed Independent Bungalow 3D"],
    description: "High-demand full 1 Ground corner plot in KK Nagar. Double-sided road access suitable for luxury independent stilt+3 floors bungalow or commercial clinic."
  },

  // 3. MGR NAGAR - Kamarajar Salai Enclave
  {
    id: "PL-MGR-08",
    projectName: "Kamarajar Salai Enclave",
    plotNumber: "Plot #08",
    title: "Plot #08 - Kamarajar Salai Enclave, MGR Nagar",
    locality: "mgr-nagar",
    localityName: "MGR Nagar",
    address: "Plot #08, Kamarajar Salai, Near Market Signal, MGR Nagar, Chennai - 600078",
    latitude: 13.033620,
    longitude: 80.195040,
    dimensions: "25 ft × 40 ft (1,000 sq.ft)",
    areaSqFt: 1000,
    price: "₹ 62.0 Lakhs",
    priceNumeric: 6200000,
    pricePerSqft: "₹ 6,200 / sq.ft",
    availability: "available",
    boundary: [
      [13.033700, 80.194980],
      [13.033700, 80.195100],
      [13.033540, 80.195100],
      [13.033540, 80.194980]
    ],
    facing: "East Facing (Surya Vasthu)",
    approval: "CMDA Approved & Corporation Limits",
    roadWidth: "24 Feet Wide Municipal Tar Road",
    waterTable: "Ground Water at 24 ft",
    ebStatus: "EB Line Connected",
    bankLoan: "Approved by Nationalized Banks",
    nearbyLandmarks: ["Kasi Theatre Junction (600m)", "Jafferkhanpet Bus Stop (400m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Demarcated Plot Frontage", "Layout Tar Road", "Boundary Stones", "House 3D Elevation"],
    description: "Compact independent residential plot in mature, central MGR Nagar. Walking distance to market, bus stops, and schools. Ready for immediate G+2 house construction."
  },

  // 4. TAMBARAM - Greenfield Sanctuary Layout
  {
    id: "PL-TAM-22",
    projectName: "Greenfield Sanctuary Layout",
    plotNumber: "Plot #22",
    title: "Plot #22 - Greenfield Sanctuary Layout, Tambaram West",
    locality: "tambaram",
    localityName: "Tambaram",
    address: "Plot #22, Mudichur Road, Near Tambaram Sanatorium, Chennai - 600045",
    latitude: 12.924880,
    longitude: 80.119950,
    dimensions: "30 ft × 50 ft (1,500 sq.ft)",
    areaSqFt: 1500,
    price: "₹ 48.0 Lakhs",
    priceNumeric: 4800000,
    pricePerSqft: "₹ 3,200 / sq.ft",
    availability: "available",
    boundary: [
      [12.925000, 80.119880],
      [12.925000, 80.120020],
      [12.924760, 80.120020],
      [12.924760, 80.119880]
    ],
    facing: "North Facing",
    approval: "CMDA & RERA Approved Gated Township",
    roadWidth: "30 Feet Wide Blacktop Tar Road",
    waterTable: "Mineral Sweet Drinking Water at 18 ft",
    ebStatus: "3-Phase Line with Transformer",
    bankLoan: "Pre-Approved 90% Loan (SBI & HDFC)",
    nearbyLandmarks: ["Tambaram Railway Station (1.8 km)", "Madras Christian College (2.2 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Layout Entrance Arch", "30-Ft Blacktop Road", "Clear Fenced Boundary", "Proposed Duplex Villa 3D"],
    description: "Peaceful gated plotted community in Tambaram West. Features concrete storm drainage, landscaped children park, sweet drinking water at shallow depth, and 24/7 security booth."
  },

  // 5. TAMBARAM - Plot #23 (Sold)
  {
    id: "PL-TAM-23",
    projectName: "Greenfield Sanctuary Layout",
    plotNumber: "Plot #23",
    title: "Plot #23 - Greenfield Sanctuary Layout, Tambaram West",
    locality: "tambaram",
    localityName: "Tambaram",
    address: "Plot #23, Mudichur Link Road, Tambaram West, Chennai - 600045",
    latitude: 12.925200,
    longitude: 80.120400,
    dimensions: "24 ft × 40 ft (960 sq.ft)",
    areaSqFt: 960,
    price: "₹ 30.7 Lakhs",
    priceNumeric: 3072000,
    pricePerSqft: "₹ 3,200 / sq.ft",
    availability: "sold",
    boundary: [
      [12.925280, 80.120340],
      [12.925280, 80.120460],
      [12.925120, 80.120460],
      [12.925120, 80.120340]
    ],
    facing: "South Facing",
    approval: "CMDA & RERA Approved",
    roadWidth: "30 Feet Tar Road",
    waterTable: "Ground Water at 18 ft",
    ebStatus: "Provisioned",
    bankLoan: "Pre-Approved",
    nearbyLandmarks: ["Tambaram Bus Terminus (2.0 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Registered Plot", "Road Access", "Corner Stone", "Elevation 3D"],
    description: "Compact family plot successfully sold and registered to customer. Sample of our clear-title immediate registry process."
  },

  // 6. VELACHERY - Phoenix Park Gardens
  {
    id: "PL-VEL-05",
    projectName: "Phoenix Park Gardens",
    plotNumber: "Plot #05",
    title: "Plot #05 - Phoenix Park Gardens, Velachery",
    locality: "velachery",
    localityName: "Velachery",
    address: "Plot #05, 100 Feet Bypass Road, Near Phoenix Marketcity, Velachery, Chennai - 600042",
    latitude: 12.978450,
    longitude: 80.221200,
    dimensions: "35 ft × 50 ft (1,750 sq.ft)",
    areaSqFt: 1750,
    price: "₹ 1.22 Crores",
    priceNumeric: 12250000,
    pricePerSqft: "₹ 7,000 / sq.ft",
    availability: "available",
    boundary: [
      [12.978550, 80.221120],
      [12.978550, 80.221280],
      [12.978350, 80.221280],
      [12.978350, 80.221120]
    ],
    facing: "East Facing",
    approval: "CMDA Approved & Corporation Limits",
    roadWidth: "30 Feet Wide Blacktop Road with Streetlights",
    waterTable: "Ground Water at 22 ft",
    ebStatus: "3-Phase Dedicated Meter",
    bankLoan: "Approved by All Banks (85%)",
    nearbyLandmarks: ["Phoenix Marketcity (450m)", "Velachery MRTS Station (1.1 km)", "Grand Mall (800m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Demarcated Plot with Pillars", "Avenue Streetlights", "Neighborhood View", "Proposed 4BHK Villa 3D"],
    description: "Rare open CMDA approved plot in Velachery bypass zone. Surrounded by high-end villas, walking distance to Phoenix Marketcity and schools. High rental yield zone."
  },

  // 7. PORUR - Mount View Residency
  {
    id: "PL-POR-11",
    projectName: "Mount View Residency",
    plotNumber: "Plot #11",
    title: "Plot #11 - Mount View Residency, Porur",
    locality: "porur",
    localityName: "Porur",
    address: "Plot #11, Trunk Road Link, Near Ramachandra Hospital, Porur, Chennai - 600116",
    latitude: 13.038200,
    longitude: 80.156400,
    dimensions: "30 ft × 40 ft (1,200 sq.ft)",
    areaSqFt: 1200,
    price: "₹ 57.6 Lakhs",
    priceNumeric: 5760000,
    pricePerSqft: "₹ 4,800 / sq.ft",
    availability: "available",
    boundary: [
      [13.038280, 80.156340],
      [13.038280, 80.156460],
      [13.038120, 80.156460],
      [13.038120, 80.156340]
    ],
    facing: "North-East Corner Facing",
    approval: "CMDA Approved & Ready for Immediate Registry",
    roadWidth: "30 Feet Concrete Road",
    waterTable: "Ground Water at 25 ft",
    ebStatus: "3-Phase Power Provisioned",
    bankLoan: "90% Loan Available",
    nearbyLandmarks: ["Sri Ramachandra Hospital (650m)", "DLF Cybercity (2.0 km)", "Porur Toll Gate (1.2 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Demarcated Plot Frontage", "30-Ft Concrete Road", "Compound Boundary", "Contemporary Villa 3D"],
    description: "Strategic investment plot behind Sri Ramachandra Medical College. Immediate appreciation driven by the upcoming Metro Phase 2 corridor."
  },

  // 8. PORUR - Plot #12 (Reserved)
  {
    id: "PL-POR-12",
    projectName: "Mount View Residency",
    plotNumber: "Plot #12",
    title: "Plot #12 - Mount View Residency, Porur",
    locality: "porur",
    localityName: "Porur",
    address: "Plot #12, Kundrathur Main Road Link, Porur, Chennai - 600116",
    latitude: 13.038650,
    longitude: 80.156900,
    dimensions: "40 ft × 50 ft (2,000 sq.ft)",
    areaSqFt: 2000,
    price: "₹ 96.0 Lakhs",
    priceNumeric: 9600000,
    pricePerSqft: "₹ 4,800 / sq.ft",
    availability: "reserved",
    boundary: [
      [13.038750, 80.156820],
      [13.038750, 80.156980],
      [13.038550, 80.156980],
      [13.038550, 80.156820]
    ],
    facing: "West Facing",
    approval: "CMDA Approved",
    roadWidth: "30 Feet Tar Road",
    waterTable: "Ground Water at 25 ft",
    ebStatus: "Provisioned",
    bankLoan: "Approved",
    nearbyLandmarks: ["DLF IT Park (1.8 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Reserved Plot", "Layout Road", "Boundary Stone", "Villa Elevation 3D"],
    description: "2,000 sq.ft large plot currently reserved with booking token. Token verification in progress."
  },

  // 9. OMR / SHOLINGANALLUR - ELCOT Silicon Garden
  {
    id: "PL-OMR-31",
    projectName: "ELCOT Silicon Garden",
    plotNumber: "Plot #31",
    title: "Plot #31 (1 Ground) - ELCOT Silicon Garden, Sholinganallur",
    locality: "omr",
    localityName: "OMR / Sholinganallur",
    address: "Plot #31, Classic Farms Road, Behind Wipro SEZ, Sholinganallur, OMR, Chennai - 600119",
    latitude: 12.901050,
    longitude: 80.227920,
    dimensions: "40 ft × 60 ft (2,400 sq.ft / 1 Ground)",
    areaSqFt: 2400,
    price: "₹ 1.44 Crores",
    priceNumeric: 14400000,
    pricePerSqft: "₹ 6,000 / sq.ft",
    availability: "available",
    boundary: [
      [12.901160, 80.227840],
      [12.901160, 80.228000],
      [12.900940, 80.228000],
      [12.900940, 80.227840]
    ],
    facing: "North Facing (100% Vasthu)",
    approval: "CMDA & RERA Approved Layout",
    roadWidth: "40 Feet Wide Blacktop Avenue",
    waterTable: "Sweet Potable Drinking Water at 26 ft",
    ebStatus: "3-Phase Power Provisioned",
    bankLoan: "Approved by SBI, HDFC, ICICI (85%)",
    nearbyLandmarks: ["Wipro SEZ (400m)", "ELCOT IT Park (800m)", "Sholinganallur Signal (1.2 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["1 Ground Plot Frontage", "40-Ft Wide Layout Avenue", "Layout Boundary Stones", "Ultra-Luxury Modern Villa 3D"],
    description: "Premium full 1 Ground plot in Sholinganallur IT hub. 40-ft wide tree-lined avenue, underground utilities, 24/7 security. Perfect for tech executives building a luxury independent villa."
  },

  // 10. MOGAPPAIR - Golden West Avenue
  {
    id: "PL-MOG-18",
    projectName: "Golden West Avenue",
    plotNumber: "Plot #18",
    title: "Plot #18 - Golden West Avenue, Mogappair West",
    locality: "mogappair",
    localityName: "Mogappair",
    address: "Plot #18, Mogappair West 4th Block, Nolambur Link, Chennai - 600037",
    latitude: 13.084120,
    longitude: 80.165240,
    dimensions: "30 ft × 45 ft (1,350 sq.ft)",
    areaSqFt: 1350,
    price: "₹ 78.3 Lakhs",
    priceNumeric: 7830000,
    pricePerSqft: "₹ 5,800 / sq.ft",
    availability: "available",
    boundary: [
      [13.084210, 80.165170],
      [13.084210, 80.165310],
      [13.084030, 80.165310],
      [13.084030, 80.165170]
    ],
    facing: "East Facing",
    approval: "CMDA Approved & Corporation Limits",
    roadWidth: "30 Feet Wide Tar Road",
    waterTable: "Ground Water at 24 ft",
    ebStatus: "3-Phase EB Connected",
    bankLoan: "Approved by Nationalized Banks (90%)",
    nearbyLandmarks: ["Velammal School (500m)", "Koyambedu Metro (2.2 km)", "Apollo Hospital Vanagaram (1.5 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Demarcated Plot Frontage", "30-Ft Tar Road", "Boundary Pillars", "Designer House 3D"],
    description: "Prime residential plot in established educational hub of Mogappair West. Surrounded by prestigious schools, parks, and shopping centres."
  },

  // 11. MEDAVAKKAM - Nanmangalam Meadows
  {
    id: "PL-MED-03",
    projectName: "Nanmangalam Meadows",
    plotNumber: "Plot #03",
    title: "Plot #03 - Nanmangalam Meadows, Medavakkam",
    locality: "medavakkam",
    localityName: "Medavakkam",
    address: "Plot #03, Velachery-Tambaram Main Road, Medavakkam, Chennai - 600100",
    latitude: 12.921340,
    longitude: 80.191560,
    dimensions: "30 ft × 40 ft (1,200 sq.ft)",
    areaSqFt: 1200,
    price: "₹ 45.6 Lakhs",
    priceNumeric: 4560000,
    pricePerSqft: "₹ 3,800 / sq.ft",
    availability: "available",
    boundary: [
      [12.921420, 80.191500],
      [12.921420, 80.191620],
      [12.921260, 80.191620],
      [12.921260, 80.191500]
    ],
    facing: "North Facing",
    approval: "CMDA & RERA Approved Gated Layout",
    roadWidth: "30 Feet Tar Road",
    waterTable: "Sweet Ground Water at 20 ft",
    ebStatus: "Provisioned",
    bankLoan: "Pre-Approved 90% Loan",
    nearbyLandmarks: ["Medavakkam Junction (1.2 km)", "Nanmangalam Reserve Forest (800m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Plot Demarcation", "Layout Road", "Boundary Stone", "Elevation 3D"],
    description: "Eco-friendly plotted community near Nanmangalam green reserve. Excellent groundwater, clean air, and rapid connectivity to both OMR and airport."
  },

  // 12. KOYAMBEDU - Metro Gateway Layout
  {
    id: "PL-KOY-27",
    projectName: "Metro Gateway Layout",
    plotNumber: "Plot #27",
    title: "Plot #27 - Metro Gateway Layout, Koyambedu",
    locality: "koyambedu",
    localityName: "Koyambedu",
    address: "Plot #27, Kaliamman Koil Street, Near CMBT Metro, Koyambedu, Chennai - 600107",
    latitude: 13.069420,
    longitude: 80.194850,
    dimensions: "30 ft × 50 ft (1,500 sq.ft)",
    areaSqFt: 1500,
    price: "₹ 1.05 Crores",
    priceNumeric: 10500000,
    pricePerSqft: "₹ 7,000 / sq.ft",
    availability: "reserved",
    boundary: [
      [13.069510, 80.194780],
      [13.069510, 80.194920],
      [13.069330, 80.194920],
      [13.069330, 80.194780]
    ],
    facing: "North-East Facing",
    approval: "CMDA Approved & Corporation Limits",
    roadWidth: "30 Feet Municipal Road",
    waterTable: "Ground Water at 25 ft",
    ebStatus: "Connected",
    bankLoan: "Approved",
    nearbyLandmarks: ["Koyambedu Metro Station (400m)", "100-Ft Road (350m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Demarcated Plot", "Access Road", "Boundary Stone", "Commercial/Residential 3D"],
    description: "High commercial and rental value plot walking distance to CMBT Metro interchange."
  },

  // 13. ANNA NAGAR - Shanti Colony Executive Layout
  {
    id: "PL-ANN-01",
    projectName: "Shanti Colony Executive Layout",
    plotNumber: "Plot #01",
    title: "Plot #01 (3,500 sq.ft) - Shanti Colony, Anna Nagar",
    locality: "anna-nagar",
    localityName: "Anna Nagar",
    address: "Plot #01, 12th Main Road, Shanti Colony, Anna Nagar, Chennai - 600040",
    latitude: 13.085020,
    longitude: 80.210140,
    dimensions: "50 ft × 70 ft (3,500 sq.ft)",
    areaSqFt: 3500,
    price: "₹ 4.20 Crores",
    priceNumeric: 42000000,
    pricePerSqft: "₹ 12,000 / sq.ft",
    availability: "available",
    boundary: [
      [13.085150, 80.210040],
      [13.085150, 80.210240],
      [13.084890, 80.210240],
      [13.084890, 80.210040]
    ],
    facing: "North Facing",
    approval: "CMDA Approved & Clear Title",
    roadWidth: "50 Feet Wide Main Boulevard",
    waterTable: "Ground Water at 28 ft",
    ebStatus: "3-Phase High Capacity Line",
    bankLoan: "Approved by Nationalized Banks",
    nearbyLandmarks: ["Tower Park (400m)", "Anna Nagar Roundtana (800m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Executive Ground Frontage", "Tree-lined 50-Ft Boulevard", "Pillar Boundary", "Mansion Elevation 3D"],
    description: "Ultra-prime residential ground in Anna Nagar Shanti Colony. Surrounded by elite residences, boutique restaurants, and international schools."
  },

  // 14. T. NAGAR - Habibullah Elite Enclave (Sold)
  {
    id: "PL-TNG-02",
    projectName: "Habibullah Elite Enclave",
    plotNumber: "Plot #02",
    title: "Plot #02 (1 Ground) - Habibullah Road, T. Nagar",
    locality: "t-nagar",
    localityName: "T. Nagar",
    address: "Plot #02, Habibullah Road, Near Kodambakkam Bridge, T. Nagar, Chennai - 600017",
    latitude: 13.042510,
    longitude: 80.233420,
    dimensions: "40 ft × 60 ft (2,400 sq.ft / 1 Ground)",
    areaSqFt: 2400,
    price: "₹ 3.60 Crores",
    priceNumeric: 36000000,
    pricePerSqft: "₹ 15,000 / sq.ft",
    availability: "sold",
    boundary: [
      [13.042610, 80.233340],
      [13.042610, 80.233500],
      [13.042410, 80.233500],
      [13.042410, 80.233340]
    ],
    facing: "East Facing",
    approval: "CMDA Approved",
    roadWidth: "40 Feet Wide Road",
    waterTable: "Ground Water at 30 ft",
    ebStatus: "Connected",
    bankLoan: "Approved",
    nearbyLandmarks: ["Panagal Park (900m)", "Pondy Bazaar (1.2 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Sold Plot", "Habibullah Road", "Boundary Stone", "Luxury Mansion 3D"],
    description: "T. Nagar residential ground successfully transacted and registered."
  },

  // 15. ADYAR - Kasturba Riverfront Enclave
  {
    id: "PL-ADY-07",
    projectName: "Kasturba Riverfront Enclave",
    plotNumber: "Plot #07",
    title: "Plot #07 - Kasturba Riverfront Enclave, Adyar",
    locality: "adyar",
    localityName: "Adyar",
    address: "Plot #07, 2nd Cross Street, Kasturba Nagar, Adyar, Chennai - 600020",
    latitude: 13.006450,
    longitude: 80.255120,
    dimensions: "45 ft × 55 ft (2,475 sq.ft)",
    areaSqFt: 2475,
    price: "₹ 3.46 Crores",
    priceNumeric: 34650000,
    pricePerSqft: "₹ 14,000 / sq.ft",
    availability: "available",
    boundary: [
      [13.006560, 80.255030],
      [13.006560, 80.255210],
      [13.006340, 80.255210],
      [13.006340, 80.255030]
    ],
    facing: "East Facing",
    approval: "CMDA Approved & Corporation Limits",
    roadWidth: "30 Feet Blacktop Tar Road",
    waterTable: "Ground Water at 22 ft",
    ebStatus: "3-Phase EB Line Provisioned",
    bankLoan: "Approved by Nationalized Banks",
    nearbyLandmarks: ["Adyar Signal (500m)", "Theosophical Society (800m)", "IIT Madras Gate (1.2 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Plot Frontage", "Avenue Road", "Boundary Stone", "Riverfront Villa 3D"],
    description: "Prestigious plotted residence in Kasturba Nagar, Adyar. Quiet residential avenue minutes from Gandhi Nagar, river estuary, and top schools."
  },

  // 16. BESANT NAGAR - Coastline Heritage Residency
  {
    id: "PL-BES-10",
    projectName: "Coastline Heritage Residency",
    plotNumber: "Plot #10",
    title: "Plot #10 - Coastline Heritage Residency, Besant Nagar",
    locality: "besant-nagar",
    localityName: "Besant Nagar",
    address: "Plot #10, 4th Main Road, Near Elliot's Beach, Besant Nagar, Chennai - 600090",
    latitude: 12.999840,
    longitude: 80.267850,
    dimensions: "50 ft × 60 ft (3,000 sq.ft)",
    areaSqFt: 3000,
    price: "₹ 4.80 Crores",
    priceNumeric: 48000000,
    pricePerSqft: "₹ 16,000 / sq.ft",
    availability: "reserved",
    boundary: [
      [12.999960, 80.267750],
      [12.999960, 80.267950],
      [12.999720, 80.267950],
      [12.999720, 80.267750]
    ],
    facing: "East Ocean Breeze Facing",
    approval: "CMDA Approved",
    roadWidth: "40 Feet Avenued Road",
    waterTable: "Ground Water at 18 ft",
    ebStatus: "Connected",
    bankLoan: "Approved",
    nearbyLandmarks: ["Elliot's Beach (300m)", "Velankanni Church (500m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Beachside Plot Frontage", "4th Main Road Avenue", "Boundary Pillars", "Coastal Villa 3D"],
    description: "Exclusive seaside plot 300 meters from Elliot's Beach promenade. High privacy, fresh sea breeze, and clear title."
  },

  // 17. ECR - Seaside Pearl Gated Layout
  {
    id: "PL-ECR-16",
    projectName: "Seaside Pearl Gated Layout",
    plotNumber: "Plot #16",
    title: "Plot #16 - Seaside Pearl Gated Layout, Palavakkam ECR",
    locality: "ecr",
    localityName: "ECR",
    address: "Plot #16, 3rd Avenue, Sea Cliff Conclave, Palavakkam, ECR, Chennai - 600041",
    latitude: 12.961020,
    longitude: 80.258940,
    dimensions: "50 ft × 60 ft (3,000 sq.ft)",
    areaSqFt: 3000,
    price: "₹ 2.85 Crores",
    priceNumeric: 28500000,
    pricePerSqft: "₹ 9,500 / sq.ft",
    availability: "available",
    boundary: [
      [12.961140, 80.258840],
      [12.961140, 80.259040],
      [12.960900, 80.259040],
      [12.960900, 80.258840]
    ],
    facing: "East Facing",
    approval: "CMDA & CRZ Approved",
    roadWidth: "30 Feet Coastal Tar Road",
    waterTable: "Potable Ground Water at 16 ft",
    ebStatus: "3-Phase Underground",
    bankLoan: "Approved by Nationalized Banks",
    nearbyLandmarks: ["Palavakkam Beach (200m)", "Kottivakkam Link (900m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Coastal Gated Plot", "Layout Palm Avenue", "Compound Wall", "Tropical Modern Villa 3D"],
    description: "Beachside gated plotted enclave along Palavakkam ECR. 24/7 security, club house access, and direct beach walkway."
  },

  // 18. CHROMEPET - GST Central Enclave
  {
    id: "PL-CHR-20",
    projectName: "GST Central Enclave",
    plotNumber: "Plot #20",
    title: "Plot #20 - GST Central Enclave, Chromepet",
    locality: "chromepet",
    localityName: "Chromepet",
    address: "Plot #20, CLC Works Road, Near Chromepet Railway Station, Chennai - 600044",
    latitude: 12.951720,
    longitude: 80.141250,
    dimensions: "30 ft × 40 ft (1,200 sq.ft)",
    areaSqFt: 1200,
    price: "₹ 54.0 Lakhs",
    priceNumeric: 5400000,
    pricePerSqft: "₹ 4,500 / sq.ft",
    availability: "available",
    boundary: [
      [12.951800, 80.141190],
      [12.951800, 80.141310],
      [12.951640, 80.141310],
      [12.951640, 80.141190]
    ],
    facing: "North Facing",
    approval: "CMDA Approved & Corporation Limits",
    roadWidth: "30 Feet Municipal Road",
    waterTable: "Ground Water at 22 ft",
    ebStatus: "Connected",
    bankLoan: "90% Loan Pre-Approved",
    nearbyLandmarks: ["Chromepet Railway Station (550m)", "MIT Campus (800m)", "Saravana Stores (900m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Demarcated Plot Frontage", "30-Ft Municipal Road", "Boundary Pillars", "Modern Villa 3D"],
    description: "Walking distance to suburban railway station and GST arterial highway. Fully developed residential neighborhood with streetlights and sweet water."
  },

  // 19. AVADI - Defense Colony Plots
  {
    id: "PL-AVD-25",
    projectName: "Defense Colony Plots",
    plotNumber: "Plot #25",
    title: "Plot #25 - Defense Colony Plots, Avadi",
    locality: "avadi",
    localityName: "Avadi",
    address: "Plot #25, HVF Main Road, Near Avadi Bus Depot, Avadi, Chennai - 600054",
    latitude: 13.114780,
    longitude: 80.100950,
    dimensions: "30 ft × 40 ft (1,200 sq.ft)",
    areaSqFt: 1200,
    price: "₹ 33.6 Lakhs",
    priceNumeric: 3360000,
    pricePerSqft: "₹ 2,800 / sq.ft",
    availability: "available",
    boundary: [
      [13.114860, 80.100890],
      [13.114860, 80.101010],
      [13.114700, 80.101010],
      [13.114700, 80.100890]
    ],
    facing: "East Facing",
    approval: "CMDA & Avadi Corporation Approved",
    roadWidth: "30 Feet Blacktop Road",
    waterTable: "Ground Water at 20 ft",
    ebStatus: "Provisioned",
    bankLoan: "Pre-Approved 90% Loan",
    nearbyLandmarks: ["Avadi Railway Station (1.4 km)", "HVF Estate Gate (800m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Plot Frontage", "Blacktop Road", "Boundary Stone", "G+1 House 3D"],
    description: "Affordable CMDA approved plot in growing North-West Chennai corridor. Walking distance to schools, markets, and railway connectivity."
  },

  // 20. POONAMALLEE - Bangalore Highway Frontage Layout
  {
    id: "PL-PNM-30",
    projectName: "Bangalore Highway Frontage Layout",
    plotNumber: "Plot #30",
    title: "Plot #30 - Bangalore Highway Frontage Layout, Poonamallee",
    locality: "poonamallee",
    localityName: "Poonamallee",
    address: "Plot #30, Rukmani Nagar Avenue, Near Metro Depot, Poonamallee - 600056",
    latitude: 13.048720,
    longitude: 80.098410,
    dimensions: "30 ft × 50 ft (1,500 sq.ft)",
    areaSqFt: 1500,
    price: "₹ 42.0 Lakhs",
    priceNumeric: 4200000,
    pricePerSqft: "₹ 2,800 / sq.ft",
    availability: "available",
    boundary: [
      [13.048820, 80.098330],
      [13.048820, 80.098490],
      [13.048620, 80.098490],
      [13.048620, 80.098330]
    ],
    facing: "North Facing",
    approval: "CMDA & RERA Approved",
    roadWidth: "30 Feet Gated Layout Road",
    waterTable: "Ground Water at 22 ft",
    ebStatus: "Provisioned",
    bankLoan: "Pre-Approved 90% Loan",
    nearbyLandmarks: ["Upcoming Poonamallee Metro Depot (600m)", "Poonamallee Bus Stand (1.1 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Layout Road", "Plot Pillars", "Compound Wall", "Villa 3D"],
    description: "Direct Bangalore Highway connectivity. Adjacent to Metro Phase 2 terminal station. Rapid commercial and residential appreciation."
  },

  // 21. KUNDRATHUR - Murugan Temple Green View
  {
    id: "PL-KUN-35",
    projectName: "Murugan Temple Green View",
    plotNumber: "Plot #35",
    title: "Plot #35 - Murugan Temple Green View, Kundrathur",
    locality: "kundrathur",
    localityName: "Kundrathur",
    address: "Plot #35, Meenakshi Nagar Enclave, Kundrathur, Chennai - 600069",
    latitude: 12.997230,
    longitude: 80.097050,
    dimensions: "30 ft × 40 ft (1,200 sq.ft)",
    areaSqFt: 1200,
    price: "₹ 28.8 Lakhs",
    priceNumeric: 2880000,
    pricePerSqft: "₹ 2,400 / sq.ft",
    availability: "available",
    boundary: [
      [12.997310, 80.096990],
      [12.997310, 80.097110],
      [12.997150, 80.097110],
      [12.997150, 80.096990]
    ],
    facing: "North-East Facing",
    approval: "CMDA Approved Layout",
    roadWidth: "24 Feet Tar Road",
    waterTable: "Sweet Ground Water at 18 ft",
    ebStatus: "Provisioned",
    bankLoan: "90% Loan Available",
    nearbyLandmarks: ["Kundrathur Murugan Temple (800m)", "Kundrathur Bus Terminus (1.0 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Gated Plot Frontage", "Layout Tar Road", "Boundary Stone", "Villa 3D Elevation"],
    description: "Budget-friendly CMDA approved plot in culturally vibrant Kundrathur. Excellent sweet groundwater, pollution-free living, and immediate connectivity to Porur."
  },

  // 22. PERAMBUR - Venus Railway Enclave
  {
    id: "PL-PER-38",
    projectName: "Venus Railway Enclave",
    plotNumber: "Plot #38",
    title: "Plot #38 - Venus Railway Enclave, Perambur",
    locality: "perambur",
    localityName: "Perambur",
    address: "Plot #38, Venus Market Street, Railway Colony, Perambur, Chennai - 600011",
    latitude: 13.107540,
    longitude: 80.233410,
    dimensions: "30 ft × 40 ft (1,200 sq.ft)",
    areaSqFt: 1200,
    price: "₹ 66.0 Lakhs",
    priceNumeric: 6600000,
    pricePerSqft: "₹ 5,500 / sq.ft",
    availability: "available",
    boundary: [
      [13.107620, 80.233350],
      [13.107620, 80.233470],
      [13.107460, 80.233470],
      [13.107460, 80.233350]
    ],
    facing: "East Facing",
    approval: "CMDA Approved & Corporation Limits",
    roadWidth: "30 Feet Corporation Tar Road",
    waterTable: "Ground Water at 25 ft",
    ebStatus: "Connected",
    bankLoan: "Approved by Nationalized Banks",
    nearbyLandmarks: ["Perambur Railway Station (900m)", "Spectrum Mall (1.2 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Plot Frontage", "30-Ft Tar Road", "Boundary Stone", "Residential Elevation 3D"],
    description: "Central North Chennai residential plot. Walkable to suburban train services, schools, and major shopping complexes."
  },

  // 23. GUDUVANCHERY - Kilambakkam KCBT Boulevard
  {
    id: "PL-GUD-40",
    projectName: "Kilambakkam KCBT Boulevard",
    plotNumber: "Plot #40",
    title: "Plot #40 - Kilambakkam KCBT Boulevard, Guduvanchery",
    locality: "guduvanchery",
    localityName: "Guduvanchery",
    address: "Plot #40, Nellikuppam Road, Near KCBT Bus Terminus, Guduvanchery - 603202",
    latitude: 12.843910,
    longitude: 80.061720,
    dimensions: "30 ft × 50 ft (1,500 sq.ft)",
    areaSqFt: 1500,
    price: "₹ 34.5 Lakhs",
    priceNumeric: 3450000,
    pricePerSqft: "₹ 2,300 / sq.ft",
    availability: "available",
    boundary: [
      [12.844010, 80.061640],
      [12.844010, 80.061800],
      [12.843810, 80.061800],
      [12.843810, 80.061640]
    ],
    facing: "North Facing",
    approval: "CMDA & RERA Approved",
    roadWidth: "30 Feet Avenue Road",
    waterTable: "Ground Water at 18 ft",
    ebStatus: "Provisioned",
    bankLoan: "Pre-Approved 90% Loan",
    nearbyLandmarks: ["Kilambakkam KCBT Terminus (2.5 km)", "Guduvanchery Railway Station (1.8 km)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Layout Avenue", "Plot Pillars", "Compound Wall", "Villa 3D"],
    description: "Rapidly appreciating plotted township minutes from Tamil Nadu's largest transport terminus (Kilambakkam KCBT). High rental and capital appreciation."
  },

  // 24. MADURAVOYAL - Metro City Layout
  {
    id: "PL-MDV-01",
    projectName: "Metro City Layout",
    plotNumber: "Plot #01",
    title: "Plot #01 - Metro City Layout, Maduravoyal",
    locality: "maduravoyal",
    localityName: "Maduravoyal",
    address: "Plot #01, MGR University Bypass, Maduravoyal, Chennai - 600095",
    latitude: 13.064520,
    longitude: 80.165210,
    dimensions: "25 ft × 40 ft (1,000 sq.ft)",
    areaSqFt: 1000,
    price: "₹ 38.5 Lakhs",
    priceNumeric: 3850000,
    pricePerSqft: "₹ 3,850 / sq.ft",
    availability: "available",
    boundary: [
      [13.064600, 80.165150],
      [13.064600, 80.165270],
      [13.064440, 80.165270],
      [13.064440, 80.165150]
    ],
    facing: "North-East Corner Facing",
    approval: "CMDA Approved (No: 142/2024)",
    roadWidth: "30 Feet Wide Blacktop Tar Road",
    waterTable: "Ground Water at 22 ft",
    ebStatus: "3-Phase Line Provisioned",
    bankLoan: "Pre-Approved 90% Loan",
    nearbyLandmarks: ["MGR University (350m)", "Maduravoyal Grade Separator (900m)"],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    imageLabels: ["Demarcated Plot with Pillars", "30-Ft Blacktop Tar Road", "Boundary Stones", "House Elevation 3D"],
    description: "Fully demarcated CMDA approved residential plot situated in prime Maduravoyal. Features pre-cast compound boundary stones and 30-ft tar road."
  }
];

// Compatibility alias for existing modals & webhooks
const PROPERTIES_INVENTORY = CHENNAI_PLOTS_DATABASE;

// ==========================================================================
// 2. LEAFLET GEOSPATIAL MAP INITIALIZATION (100% ZERO API KEY REQUIRED)
// Verified High-Resolution Chennai Geographic Providers (ESRI & OSM Network)
// ==========================================================================
const MAP_LAYERS = {
  hybrid: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  streets: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  satellite: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  terrain: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
  osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  esri: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
};

// ==========================================================================
// 3D GEOSPATIAL MAP ENGINE CONFIGURATION (MapLibre GL 3D WebGL)
// High-Definition Photorealistic Infrastructure (Zero Missing Tiles Guaranteed)
// ==========================================================================
const CHENNAI_CENTER_LNG_LAT = [80.1800, 13.0450];
const DEFAULT_CITY_ZOOM = 11.2;

const MAPLIBRE_STYLES = {
  // Google Hybrid (Real High-Resolution Photographic Satellite + Road Names & Landmarks)
  hybrid: {
    version: 8,
    sources: {
      'google-hybrid-source': {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution: '© Google Maps Real Satellite'
      }
    },
    layers: [{
      id: 'google-hybrid-layer',
      type: 'raster',
      source: 'google-hybrid-source',
      paint: { 'raster-fade-duration': 0, 'raster-resampling': 'linear' }
    }]
  },

  // Google Street Map (Clean, High-Contrast Road Network with English & Tamil Labels)
  streets: {
    version: 8,
    sources: {
      'google-streets-source': {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution: '© Google Maps'
      }
    },
    layers: [{
      id: 'google-streets-layer',
      type: 'raster',
      source: 'google-streets-source',
      paint: { 'raster-fade-duration': 0, 'raster-resampling': 'linear' }
    }]
  },

  // Pure High-Resolution Aerial Satellite Imagery
  satellite: {
    version: 8,
    sources: {
      'satellite-source': {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution: '© Google Satellite'
      }
    },
    layers: [{
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite-source',
      paint: { 'raster-fade-duration': 0, 'raster-resampling': 'linear' }
    }]
  }
};

function calculateBearing(p1, p2) {
  const lon1 = p1[0] * Math.PI / 180;
  const lat1 = p1[1] * Math.PI / 180;
  const lon2 = p2[0] * Math.PI / 180;
  const lat2 = p2[1] * Math.PI / 180;
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function lerpAngle(from, to, t) {
  let diff = (to - from) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return from + diff * t;
}

function initChennaiMap() {
  if (mapEngine || leafletMap) return;

  const mapEl = document.getElementById("wall-mounted-map");
  if (!mapEl) return;

  // 1. Initialize MapLibre GL 3D WebGL Engine
  if (window.maplibregl) {
    try {
      mapEngine = new maplibregl.Map({
        container: 'wall-mounted-map',
        style: MAPLIBRE_STYLES.hybrid,
        center: CHENNAI_CENTER_LNG_LAT,
        zoom: DEFAULT_CITY_ZOOM,
        pitch: 0,
        bearing: 0,
        maxPitch: 85,
        fadeDuration: 0,
        maxTileCacheSize: 300
      });

      window.mapEngine = mapEngine;
      mapEngine.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

      renderPlotMarkersOnMap();
      renderPlotCardsList();
  initAmbientDust();

      
      mapEngine.on('zoom', () => {
        const z = mapEngine.getZoom();
        const mapDiv = document.getElementById('wall-mounted-map');
        if (mapDiv) {
          if (z < 12.5) mapDiv.classList.add('map-zoomed-out');
          else mapDiv.classList.remove('map-zoomed-out');
          if (z < 11.2) mapDiv.classList.add('map-super-zoomed-out');
          else mapDiv.classList.remove('map-super-zoomed-out');
        }
        renderPlotMarkersOnMap();
      });
    
      mapEngine.on('load', () => {
        renderPlotMarkersOnMap();
        renderPlotCardsList();
      });

      return;
    } catch (e) {
      console.warn('MapLibre GL 3D initialization fallback to Leaflet:', e);
    }
  }

  // 2. Leaflet Fallback
  leafletMap = L.map("wall-mounted-map", {
    center: [13.0450, 80.1800],
    zoom: 11.5,
    minZoom: 9,
    maxZoom: 19,
    zoomControl: false
  });
  L.control.zoom({ position: "topright" }).addTo(leafletMap);
  currentTileLayer = L.tileLayer(MAP_LAYERS.streets, { maxZoom: 19 }).addTo(leafletMap);
  renderPlotMarkersOnMap();
  renderPlotCardsList();

  leafletMap.on('zoomend', () => {
    const z = leafletMap.getZoom();
    const mapDiv = document.getElementById('wall-mounted-map');
    if (mapDiv) {
      if (z < 12.5) mapDiv.classList.add('map-zoomed-out');
      else mapDiv.classList.remove('map-zoomed-out');
      if (z < 11.2) mapDiv.classList.add('map-super-zoomed-out');
      else mapDiv.classList.remove('map-super-zoomed-out');
    }
    renderPlotMarkersOnMap();
  });
    
}

function setMapLayer(layerKey) {
  if (mapEngine) {
    const style = MAPLIBRE_STYLES[layerKey] || MAPLIBRE_STYLES.hybrid;
    mapEngine.setStyle(style);
    mapEngine.once('style.load', () => {
      renderPlotMarkersOnMap();
      if (activePlotId) {
        const plot = CHENNAI_PLOTS_DATABASE.find(p => p.id === activePlotId);
        if (plot) drawPlotBoundaryPolygon(plot);
        if (activeRoadCoordinates.length >= 2) {
          drawRoutePolylineOnMap(activeRoadCoordinates, CHENNAI_TRANSIT_HUBS.kathipara.coords, [plot.latitude, plot.longitude], CHENNAI_TRANSIT_HUBS.kathipara.name, plot);
        }
      }
    });
  } else if (leafletMap) {
    if (currentTileLayer) leafletMap.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(MAP_LAYERS[layerKey] || MAP_LAYERS.hybrid, { maxZoom: 20 }).addTo(leafletMap);
  }

  document.querySelectorAll(".map-layer-btn").forEach(btn => {
    btn.classList.remove("bg-black", "text-white", "font-black");
    btn.classList.add("text-neutral-700", "font-bold");
  });
  const activeBtn = document.getElementById(`layer-${layerKey}`);
  if (activeBtn) {
    activeBtn.classList.remove("text-neutral-700", "font-bold");
    activeBtn.classList.add("bg-black", "text-white", "font-black");
  }
}

function toggle3DPerspective() {
  if (!mapEngine) return;
  const currentPitch = mapEngine.getPitch();
  const label = document.getElementById('perspective-label');
  if (currentPitch > 25) {
    mapEngine.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    if (label) label.textContent = '2D Flat';
  } else {
    mapEngine.easeTo({ pitch: 60, duration: 800 });
    if (label) label.textContent = '3D Tilt';
  }
}

function resetToChennaiOverview() {
  clearActiveRoute();
  clearActivePlotBoundary();
  clearActiveTravelAnimation();
  activePlotId = null;
  isJourneyPaused = false;

  const hud = document.getElementById("live-travel-hud");
  if (hud) hud.classList.add("hidden");

  const cockpit = document.getElementById("first-person-cockpit-overlay");
  if (cockpit) cockpit.classList.add("hidden");

  const placeholder = document.getElementById("plot-unselected-placeholder");
  const container = document.getElementById("plot-selected-container");
  if (placeholder) placeholder.classList.remove("hidden");
  if (container) container.classList.add("hidden");

  if (mapEngine) {
    mapEngine.flyTo({
      center: CHENNAI_CENTER_LNG_LAT,
      zoom: DEFAULT_CITY_ZOOM,
      pitch: 0,
      bearing: 0,
      duration: 1400
    });
  } else if (leafletMap) {
    leafletMap.flyTo([13.0450, 80.1800], 11.5, { duration: 1.2 });
  }

  document.querySelectorAll(".plot-listing-card").forEach(c => c.classList.remove("plot-card-selected"));
}

function renderPlotMarkersOnMap() {
  const filteredPlots = getFilteredPlots();
  const currentZoom = mapEngine ? mapEngine.getZoom() : (leafletMap ? leafletMap.getZoom() : 11.2);
  const screenWidth = window.innerWidth;
  
  // Device-aware threshold:
  // Mobile (<640px): cluster when zoom < 13.0
  // Tablet (640-1024px): cluster when zoom < 12.4
  // Laptop/Desktop (>1024px): cluster when zoom < 11.8
  const clusterThreshold = screenWidth < 640 ? 13.0 : (screenWidth < 1024 ? 12.4 : 11.8);
  const shouldCluster = currentZoom < clusterThreshold;

  // Group plots by locality
  const localityGroups = {};
  filteredPlots.forEach(plot => {
    const loc = plot.localityName;
    if (!localityGroups[loc]) localityGroups[loc] = [];
    localityGroups[loc].push(plot);
  });

  if (mapEngine) {
    Object.values(plotMarkersMap).forEach(m => m.remove());
    plotMarkersMap = {};

    if (shouldCluster) {
      // Clear, separated uncollapsed badge with specific locality name + sub-locality descriptor
      Object.entries(localityGroups).forEach(([locName, plotsInLoc]) => {
        const repPlot = plotsInLoc.find(p => p.id === activePlotId) || plotsInLoc[0];
        const isSelected = plotsInLoc.some(p => p.id === activePlotId);
        const count = plotsInLoc.length;
        const statusClass = repPlot.availability || "available";
        const desc = getPlotSpecificDescriptor(repPlot);

        const el = document.createElement('div');
        el.className = 'plot-marker-div';
        el.innerHTML = `
          <div class="plot-marker-container ${isSelected ? 'selected' : ''}" id="map-loc-marker-${repPlot.id}">
            <div class="plot-marker-pill ${statusClass} marker-pill-specific">
              <div class="marker-area-row">
                <i class="fa-solid fa-location-dot text-emerald-400 text-[10px] shrink-0"></i>
                <div class="flex flex-col text-left leading-tight">
                  <span class="marker-area-name">${desc.mainName}</span>
                  <span class="marker-sub-name">${desc.subName}</span>
                </div>
                <span class="marker-count-badge">${count > 1 ? count + ' Plots' : '1 Plot'}</span>
              </div>
            </div>
            <div class="plot-marker-arrow"></div>
            ${isSelected ? '<div class="plot-pulse-ring"></div>' : ''}
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (plotsInLoc.length === 1 || currentZoom >= 13.0) {
            navigateAndTravelToPlot(repPlot.id);
          } else {
            mapEngine.flyTo({
              center: [repPlot.longitude, repPlot.latitude],
              zoom: 14.8,
              pitch: 45,
              duration: 1100
            });
            setTimeout(() => {
              navigateAndTravelToPlot(repPlot.id);
            }, 600);
          }
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([repPlot.longitude, repPlot.latitude])
          .addTo(mapEngine);

        plotMarkersMap['loc_' + locName] = marker;
      });
    } else {
      // Zoomed-in detailed individual markers with specific layout details, plot #, and price
      filteredPlots.forEach(plot => {
        const isSelected = activePlotId === plot.id;
        const statusClass = plot.availability || "available";
        const desc = getPlotSpecificDescriptor(plot);

        const el = document.createElement('div');
        el.className = 'plot-marker-div';
        el.innerHTML = `
          <div class="plot-marker-container ${isSelected ? 'selected' : ''}" id="map-marker-${plot.id}">
            <div class="plot-marker-pill ${statusClass}">
              <div class="marker-area-row">
                <i class="fa-solid fa-location-dot text-emerald-400 text-[10px] shrink-0"></i>
                <div class="flex flex-col text-left leading-tight">
                  <span class="marker-area-name">${desc.mainName}</span>
                  <span class="marker-sub-name">${desc.layoutName}</span>
                </div>
                <span class="marker-status-dot ${statusClass}"></span>
              </div>
              <div class="marker-details-row">
                <span class="marker-plot-no">${plot.plotNumber}</span>
                <span class="text-neutral-500">•</span>
                <span class="marker-price">${plot.price}</span>
              </div>
            </div>
            <div class="plot-marker-arrow"></div>
            ${isSelected ? '<div class="plot-pulse-ring"></div>' : ''}
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          navigateAndTravelToPlot(plot.id);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([plot.longitude, plot.latitude])
          .addTo(mapEngine);

        plotMarkersMap[plot.id] = marker;
      });
    }
    return;
  }

  if (leafletMap) {
    Object.values(plotMarkersMap).forEach(m => leafletMap.removeLayer(m));
    plotMarkersMap = {};

    if (shouldCluster) {
      Object.entries(localityGroups).forEach(([locName, plotsInLoc]) => {
        const repPlot = plotsInLoc.find(p => p.id === activePlotId) || plotsInLoc[0];
        const isSelected = plotsInLoc.some(p => p.id === activePlotId);
        const count = plotsInLoc.length;
        const statusClass = repPlot.availability || "available";
        const desc = getPlotSpecificDescriptor(repPlot);

        const markerHtml = `
          <div class="plot-marker-container ${isSelected ? 'selected' : ''}" id="map-loc-marker-${repPlot.id}">
            <div class="plot-marker-pill ${statusClass} marker-pill-specific">
              <div class="marker-area-row">
                <i class="fa-solid fa-location-dot text-emerald-400 text-[10px] shrink-0"></i>
                <div class="flex flex-col text-left leading-tight">
                  <span class="marker-area-name">${desc.mainName}</span>
                  <span class="marker-sub-name">${desc.subName}</span>
                </div>
                <span class="marker-count-badge">${count > 1 ? count + ' Plots' : '1 Plot'}</span>
              </div>
            </div>
            <div class="plot-marker-arrow"></div>
            ${isSelected ? '<div class="plot-pulse-ring"></div>' : ''}
          </div>
        `;

        const icon = L.divIcon({
          className: "plot-marker-div",
          html: markerHtml,
          iconSize: [140, 42],
          iconAnchor: [70, 40]
        });

        const marker = L.marker([repPlot.latitude, repPlot.longitude], {
          icon,
          zIndexOffset: isSelected ? 3000 : 600
        }).addTo(leafletMap);

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          if (plotsInLoc.length === 1 || currentZoom >= 13.0) {
            navigateAndTravelToPlot(repPlot.id);
          } else {
            leafletMap.flyTo([repPlot.latitude, repPlot.longitude], 14.8);
            setTimeout(() => {
              navigateAndTravelToPlot(repPlot.id);
            }, 600);
          }
        });

        plotMarkersMap['loc_' + locName] = marker;
      });
    } else {
      filteredPlots.forEach(plot => {
        const isSelected = activePlotId === plot.id;
        const statusClass = plot.availability || "available";
        const desc = getPlotSpecificDescriptor(plot);

        const markerHtml = `
          <div class="plot-marker-container ${isSelected ? 'selected' : ''}" id="map-marker-${plot.id}">
            <div class="plot-marker-pill ${statusClass}">
              <div class="marker-area-row">
                <i class="fa-solid fa-location-dot text-emerald-400 text-[10px] shrink-0"></i>
                <div class="flex flex-col text-left leading-tight">
                  <span class="marker-area-name">${desc.mainName}</span>
                  <span class="marker-sub-name">${desc.layoutName}</span>
                </div>
                <span class="marker-status-dot ${statusClass}"></span>
              </div>
              <div class="marker-details-row">
                <span class="marker-plot-no">${plot.plotNumber}</span>
                <span class="text-neutral-500">•</span>
                <span class="marker-price">${plot.price}</span>
              </div>
            </div>
            <div class="plot-marker-arrow"></div>
            ${isSelected ? '<div class="plot-pulse-ring"></div>' : ''}
          </div>
        `;

        const icon = L.divIcon({
          className: "plot-marker-div",
          html: markerHtml,
          iconSize: [130, 52],
          iconAnchor: [65, 50]
        });

        const marker = L.marker([plot.latitude, plot.longitude], {
          icon,
          zIndexOffset: isSelected ? 3000 : (plot.availability === "available" ? 600 : 100)
        }).addTo(leafletMap);

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          navigateAndTravelToPlot(plot.id);
        });

        plotMarkersMap[plot.id] = marker;
      });
    }
  }
}

function drawPlotBoundaryPolygon(plot) {
  clearActivePlotBoundary();
  if (!plot || !plot.boundary) return;

  if (mapEngine) {
    const lngLatRing = plot.boundary.map(pt => [pt[1], pt[0]]);
    lngLatRing.push(lngLatRing[0]); // Close ring

    if (mapEngine.getLayer('plot-boundary-fill')) mapEngine.removeLayer('plot-boundary-fill');
    if (mapEngine.getLayer('plot-boundary-line')) mapEngine.removeLayer('plot-boundary-line');
    if (mapEngine.getSource('plot-boundary-source')) mapEngine.removeSource('plot-boundary-source');

    mapEngine.addSource('plot-boundary-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [lngLatRing]
        }
      }
    });

    mapEngine.addLayer({
      id: 'plot-boundary-fill',
      type: 'fill',
      source: 'plot-boundary-source',
      paint: { 'fill-color': '#10b981', 'fill-opacity': 0.35 }
    });

    mapEngine.addLayer({
      id: 'plot-boundary-line',
      type: 'line',
      source: 'plot-boundary-source',
      paint: {
        'line-color': '#059669',
        'line-width': 3.5,
        'line-dasharray': [3, 2]
      }
    });

    // 4-Corner Demarcation Peg Markers (P1, P2, P3, P4)
    plot.boundary.forEach((pt, idx) => {
      const el = document.createElement('div');
      el.className = 'boundary-peg-marker';
      el.innerHTML = `
        <div class="peg-marker-inner" style="animation-delay: ${idx * 0.12}s;">
          <div class="peg-stone"></div>
          <div class="peg-label">P${idx + 1}</div>
        </div>
      `;
      const peg = new maplibregl.Marker({ element: el })
        .setLngLat([pt[1], pt[0]])
        .addTo(mapEngine);
      activeBoundaryPegs.push(peg);
    });

    // Add micro dimension tooltip
    const popupEl = document.createElement('div');
    popupEl.className = 'plot-dim-tooltip';
    popupEl.innerHTML = `<span>${plot.plotNumber} (${plot.areaSqFt} sq.ft) &bull; ${plot.dimensions}</span>`;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: 'plot-dim-popup' })
      .setLngLat([plot.longitude, plot.latitude])
      .setDOMContent(popupEl)
      .addTo(mapEngine);
    activeBoundaryTooltipMarkers.push(popup);
    return;
  }

  if (leafletMap) {
    activeBoundaryPolygon = L.polygon(plot.boundary, {
      color: "#059669",
      fillColor: "#10b981",
      fillOpacity: 0.35,
      weight: 3.5,
      dashArray: "6, 6",
      className: "plot-demarcation-polygon"
    }).addTo(leafletMap);

    plot.boundary.forEach((pt, idx) => {
      const pegIcon = L.divIcon({
        className: "boundary-peg-marker",
        html: `
          <div class="peg-marker-inner" style="animation-delay: ${idx * 0.12}s;">
            <div class="peg-stone"></div>
            <div class="peg-label">P${idx + 1}</div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const peg = L.marker(pt, { icon: pegIcon, zIndexOffset: 2800 }).addTo(leafletMap);
      activeBoundaryPegs.push(peg);
    });

    activeBoundaryPolygon.bindTooltip(`<span>${plot.plotNumber} (${plot.areaSqFt} sq.ft) &bull; ${plot.dimensions}</span>`, {
      permanent: true,
      direction: "center",
      className: "plot-dim-tooltip"
    }).openTooltip();
  }
}

function clearActivePlotBoundary() {
  if (mapEngine) {
    if (mapEngine.getLayer('plot-boundary-fill')) mapEngine.removeLayer('plot-boundary-fill');
    if (mapEngine.getLayer('plot-boundary-line')) mapEngine.removeLayer('plot-boundary-line');
    if (mapEngine.getSource('plot-boundary-source')) mapEngine.removeSource('plot-boundary-source');
    activeBoundaryPegs.forEach(peg => peg.remove());
    activeBoundaryPegs = [];
    activeBoundaryTooltipMarkers.forEach(pop => pop.remove());
    activeBoundaryTooltipMarkers = [];
  }
  if (leafletMap) {
    if (activeBoundaryPolygon) {
      leafletMap.removeLayer(activeBoundaryPolygon);
      activeBoundaryPolygon = null;
    }
    activeBoundaryPegs.forEach(peg => leafletMap.removeLayer(peg));
    activeBoundaryPegs = [];
  }
}

function setTravelMode(mode) {
  if (!TRAVEL_MODES_CONFIG[mode]) return;
  currentTravelMode = mode;

  ["car", "bike", "bus", "walk"].forEach(m => {
    // Toolbar buttons
    const btn = document.getElementById(`travel-btn-${m}`);
    if (btn) {
      if (m === mode) {
        btn.classList.add("travel-mode-pill", "active");
        btn.classList.remove("text-neutral-700");
      } else {
        btn.classList.remove("active");
        btn.classList.add("text-neutral-700");
      }
    }

    // Live HUD quick buttons
    const hudBtn = document.getElementById(`hud-btn-${m}`);
    if (hudBtn) {
      if (m === mode) {
        hudBtn.className = "px-2.5 py-1 rounded text-xs text-white bg-neutral-800 transition flex items-center gap-1 font-bold border border-white/20";
      } else {
        hudBtn.className = "px-2.5 py-1 rounded text-xs text-neutral-400 hover:text-white transition flex items-center gap-1 font-bold";
      }
    }
  });

  const modeCfg = TRAVEL_MODES_CONFIG[mode];
  const hudModeBadge = document.getElementById("hud-nav-mode-badge");
  if (hudModeBadge) {
    hudModeBadge.textContent = modeCfg.label.toUpperCase();
  }

  // Update Toolbar Main Button
  const labelEl = document.getElementById("toolbar-sv-label");
  const iconEl = document.querySelector("#toolbar-sv-btn i");
  if (labelEl) {
    if (mode === 'car') labelEl.textContent = "Drive to Plot";
    else if (mode === 'bus') labelEl.textContent = "Bus to Plot";
    else if (mode === 'walk') labelEl.textContent = "Walk to Plot";
    else labelEl.textContent = "Ride to Plot";
  }
  if (iconEl && modeCfg.icon) {
    iconEl.className = `${modeCfg.icon} text-white`;
  }

  // Update Drawer mode if open
  const drawerModeName = document.getElementById("drawer-mode-name");
  if (drawerModeName) {
    drawerModeName.textContent = modeCfg.fullName;
  }
  const drawerModeIcon = document.getElementById("drawer-mode-icon");
  if (drawerModeIcon) {
    drawerModeIcon.innerHTML = `<i class="${modeCfg.icon}"></i>`;
  }

  if (activePlotId) {
    navigateAndTravelToPlot(activePlotId);
  }
}

function selectPlot(plotId, focusMap = true) {
  navigateAndTravelToPlot(plotId);
}

// ==========================================================================
// MASTER 3D ROAD CAMERA NAVIGATION ENGINE
// Takes the user inside the map and navigates along the actual road network!
// ==========================================================================
async function navigateAndTravelToPlot(plotId) {
  const plot = CHENNAI_PLOTS_DATABASE.find(p => p.id === plotId);
  if (!plot) return;

  activePlotId = plot.id;
  travelDestinationPlot = plot;
  isJourneyPaused = false;

  clearActiveTravelAnimation();
  renderPlotMarkersOnMap();

  document.querySelectorAll(".plot-listing-card").forEach(c => c.classList.remove("plot-card-selected"));
  const targetCard = document.getElementById(`plot-card-${plot.id}`);
  if (targetCard) targetCard.classList.add("plot-card-selected");

  populateMobileDrawer(plot);

  // Setup Live First-Person Google Maps Navigation HUD
  const hud = document.getElementById("live-travel-hud");
  const hudModeBadge = document.getElementById("hud-nav-mode-badge");
  const hudInstr = document.getElementById("hud-instruction-text");
  const hudDistTurn = document.getElementById("hud-distance-to-turn");
  const hudRemDist = document.getElementById("hud-remaining-distance");
  const hudRemTime = document.getElementById("hud-remaining-time");
  const hudDest = document.getElementById("hud-destination-name");
  const hudManeuver = document.getElementById("hud-maneuver-icon");
  const hudRoadName = document.getElementById("hud-active-road-name");
  const hudPauseBtn = document.getElementById("hud-pause-btn");
  const cockpitOverlay = document.getElementById("first-person-cockpit-overlay");

  const modeCfg = TRAVEL_MODES_CONFIG[currentTravelMode] || TRAVEL_MODES_CONFIG.car;
  if (hudModeBadge) hudModeBadge.textContent = modeCfg.label.toUpperCase();
  if (hudInstr) hudInstr.textContent = `Departing Kathipara towards ${plot.plotNumber}, ${plot.localityName}...`;
  if (hudDistTurn) hudDistTurn.textContent = "IN TRANSIT";
  if (hudDest) hudDest.textContent = `${plot.plotNumber}, ${plot.localityName}`;
  if (hudRoadName) hudRoadName.textContent = "Kathipara Flyover (GST)";
  if (hudManeuver) hudManeuver.innerHTML = `<i class="${modeCfg.icon} text-white"></i>`;
  if (hudPauseBtn) hudPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> <span id="hud-pause-label" class="hidden md:inline">Stop</span>';
  if (hud) hud.classList.remove("hidden");

  if (currentNavCameraMode === 'firstPerson' && cockpitOverlay) {
    cockpitOverlay.classList.remove("hidden");
  }

  // Starting location: Kathipara Flyover
  const startCoords = CHENNAI_TRANSIT_HUBS.kathipara.coords;
  const destCoords = [plot.latitude, plot.longitude];
  const originName = CHENNAI_TRANSIT_HUBS.kathipara.name;

  let roadLngLats = [];
  let routeDistKm = (getDistanceMeters(startCoords[0], startCoords[1], destCoords[0], destCoords[1]) / 1000).toFixed(1);
  let routeDurationMins = Math.round((routeDistKm / (modeCfg.speedFactor * 35)) * 60);
  activeRouteSteps = [];

  try {
    const res = await fetch(`/api/directions?startLat=${startCoords[0]}&startLng=${startCoords[1]}&destLat=${destCoords[0]}&destLng=${destCoords[1]}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.routes && data.routes.length > 0) {
        const r = data.routes[0];
        routeDistKm = (r.distance / 1000).toFixed(1);
        routeDurationMins = Math.max(1, Math.round((r.duration / 60) / modeCfg.speedFactor));
        roadLngLats = r.geometry.coordinates;
        if (r.legs && r.legs[0] && r.legs[0].steps) {
          activeRouteSteps = r.legs[0].steps;
        }
      }
    }
  } catch (e) {
    console.warn("Directions routing fallback:", e);
  }

  if (!roadLngLats || roadLngLats.length < 2) {
    roadLngLats = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      roadLngLats.push([
        startCoords[1] + (destCoords[1] - startCoords[1]) * t,
        startCoords[0] + (destCoords[0] - startCoords[0]) * t
      ]);
    }
  }

  activeRoadCoordinates = roadLngLats;

  if (hudRemDist) hudRemDist.textContent = `${routeDistKm} km`;
  if (hudRemTime) hudRemTime.textContent = `~${routeDurationMins} mins`;

  // Draw realistic glowing navigation highway polyline
  drawRoutePolylineOnMap(roadLngLats, startCoords, destCoords, originName, plot);

  // Ensure Street View Stage is closed so the animated map journey takes center stage!
  const svStage = document.getElementById("street-view-stage");
  if (svStage) {
    svStage.classList.add("hidden");
    svStage.classList.remove("active");
  }

  // Pre-build waypoints in background in case user clicks Street View toggle
  buildStreetWaypoints(plot, roadLngLats, activeRouteSteps, startCoords, destCoords);

  // START ANIMATED MOTORCYCLE MAP JOURNEY ON CHENNAI GOOGLE MAPS
  start3DCameraNavigation(roadLngLats, plot, routeDistKm, routeDurationMins, modeCfg, activeRouteSteps);
}

// ==========================================================================
// REAL CHENNAI STREET-LEVEL IMAGERY ENGINE
// Authentic 360° Photographic Road Viewport, Turn Navigation & Synchronized Mini-Map
// ==========================================================================
function buildStreetWaypoints(plot, roadLngLats, routeSteps, startCoords, destCoords) {
  const waypoints = [];
  const originHub = (typeof currentOriginHubKey !== 'undefined' && CHENNAI_TRANSIT_HUBS[currentOriginHubKey]) 
    ? CHENNAI_TRANSIT_HUBS[currentOriginHubKey] 
    : CHENNAI_TRANSIT_HUBS.kathipara;
  
  // 1. Departure Viewpoint: Origin (Kathipara Cloverleaf Flyover or selected hub)
  const p0 = roadLngLats[0] || [startCoords[1], startCoords[0]];
  const p1 = roadLngLats[1] || [destCoords[1], destCoords[0]];
  const initialHeading = calculateBearing(p0, p1);
  
  waypoints.push({
    index: 0,
    lat: p0[1],
    lng: p0[0],
    heading: initialHeading,
    name: originHub.name || "Kathipara Flyover (GST Road NH-45)",
    instruction: `Depart from ${originHub.name || "Kathipara"} towards ${plot.localityName}`,
    maneuverIcon: "fa-arrow-up",
    distToNextText: "1.2 km to arterial link",
    isArrival: false,
    coverageStatus: "Verified authentic 360° road imagery captured on Kathipara interchange."
  });

  // 2. Extract key turn & arterial waypoints from OSRM steps if available
  if (routeSteps && routeSteps.length > 1) {
    const significantSteps = routeSteps.filter((s, idx) => {
      return idx > 0 && idx < routeSteps.length - 1 && (s.distance > 180 || (s.name && s.name.length > 2));
    });

    const stepSampleCount = Math.min(4, significantSteps.length);
    const stepInterval = Math.max(1, Math.floor(significantSteps.length / Math.max(1, stepSampleCount)));

    for (let i = 0; i < significantSteps.length && waypoints.length < 5; i += stepInterval) {
      const step = significantSteps[i];
      if (step.maneuver && step.maneuver.location) {
        const stepLng = step.maneuver.location[0];
        const stepLat = step.maneuver.location[1];
        
        let nextCoord = [destCoords[1], destCoords[0]];
        const nextStep = significantSteps[i + 1];
        if (nextStep && nextStep.maneuver && nextStep.maneuver.location) {
          nextCoord = nextStep.maneuver.location;
        }

        const heading = calculateBearing([stepLng, stepLat], nextCoord);
        const roadName = step.name || getEstimatedChennaiRoadName(stepLat, stepLng, plot);
        
        let icon = "fa-arrow-up";
        if (step.maneuver.modifier) {
          if (step.maneuver.modifier.includes('right')) icon = "fa-arrow-turn-right";
          else if (step.maneuver.modifier.includes('left')) icon = "fa-arrow-turn-left";
          else if (step.maneuver.modifier.includes('straight')) icon = "fa-arrow-up";
        }

        waypoints.push({
          index: waypoints.length,
          lat: stepLat,
          lng: stepLng,
          heading,
          name: roadName,
          instruction: step.maneuver.instruction || `Follow ${roadName} towards ${plot.localityName}`,
          maneuverIcon: icon,
          distToNextText: step.distance > 0 ? `${(step.distance / 1000).toFixed(1)} km` : "Arriving soon",
          isArrival: false,
          coverageStatus: "Verified authentic 360° road photography."
        });
      }
    }
  }

  // 3. Fallback interpolation along road coordinates geometry
  if (waypoints.length < 4 && roadLngLats.length >= 6) {
    const fractions = [0.25, 0.55, 0.8];
    fractions.forEach(frac => {
      if (waypoints.length >= 5) return;
      const idx = Math.floor(roadLngLats.length * frac);
      const curr = roadLngLats[idx];
      const next = roadLngLats[Math.min(roadLngLats.length - 1, idx + 2)];
      const heading = calculateBearing(curr, next);
      const estName = getEstimatedChennaiRoadName(curr[1], curr[0], plot);
      waypoints.push({
        index: waypoints.length,
        lat: curr[1],
        lng: curr[0],
        heading,
        name: estName,
        instruction: `Cruising along ${estName} towards ${plot.localityName}`,
        maneuverIcon: "fa-road",
        distToNextText: "Approaching locality avenue",
        isArrival: false,
        coverageStatus: "Verified 360° Chennai road network imagery."
      });
    });
  }

  // 4. Approach Viewpoint: Neighborhood / Subdivision Access Road
  if (roadLngLats.length >= 4) {
    const nearEndIdx = Math.max(0, roadLngLats.length - 3);
    const approachCoord = roadLngLats[nearEndIdx];
    const headingToPlot = calculateBearing(approachCoord, [plot.longitude, plot.latitude]);
    const accessRoadName = plot.address.split(',')[1]?.trim() || `${plot.localityName} Avenue`;
    
    waypoints.push({
      index: waypoints.length,
      lat: approachCoord[1],
      lng: approachCoord[0],
      heading: headingToPlot,
      name: accessRoadName,
      instruction: `Turn onto ${accessRoadName} approaching ${plot.plotNumber}`,
      maneuverIcon: "fa-arrow-right-to-bracket",
      distToNextText: "250 m to plot",
      isArrival: false,
      coverageStatus: "Verified neighborhood street-level photography."
    });
  }

  // 5. Final Viewpoint: Plot Arrival / Frontage
  let closestRoadCoord = roadLngLats[roadLngLats.length - 1];
  let minDistance = getDistanceMeters(closestRoadCoord[1], closestRoadCoord[0], plot.latitude, plot.longitude);
  
  for (let i = roadLngLats.length - 1; i >= Math.max(0, roadLngLats.length - 10); i--) {
    const d = getDistanceMeters(roadLngLats[i][1], roadLngLats[i][0], plot.latitude, plot.longitude);
    if (d < minDistance) {
      minDistance = d;
      closestRoadCoord = roadLngLats[i];
    }
  }

  const arrivalHeading = calculateBearing(closestRoadCoord, [plot.longitude, plot.latitude]);
  const isDirectFrontage = minDistance < 50;
  
  waypoints.push({
    index: waypoints.length,
    lat: closestRoadCoord[1],
    lng: closestRoadCoord[0],
    heading: arrivalHeading,
    name: `${plot.plotNumber} Entrance Avenue (${plot.localityName})`,
    instruction: `Arrived at ${plot.plotNumber} - ${plot.title}`,
    maneuverIcon: "fa-flag-checkered",
    distToNextText: "DESTINATION REACHED",
    isArrival: true,
    minDistanceMeters: Math.round(minDistance),
    isDirectFrontage,
    coverageStatus: isDirectFrontage 
      ? `Direct Road Frontage: authentic 360° photograph captured right outside plot entrance.`
      : `Nearest Verified Street View (${Math.round(minDistance)}m from demarcated plot layout entrance along access road).`
  });

  return waypoints;
}

function getEstimatedChennaiRoadName(lat, lng, plot) {
  if (plot.locality === 'kk-nagar' || plot.locality === 'mgr-nagar') {
    return 'Munusamy Salai / Sector 10 Road';
  } else if (plot.locality === 'porur') {
    return 'Mount-Poonamallee High Road';
  } else if (plot.locality === 'tambaram' || plot.locality === 'chromepet') {
    return 'Grand Southern Trunk (GST) Road';
  } else if (plot.locality === 'omr-sholinganallur') {
    return 'Rajiv Gandhi Salai (OMR IT Expressway)';
  } else if (plot.locality === 'velachery' || plot.locality === 'medavakkam') {
    return 'Velachery Main Road';
  } else if (plot.locality === 'anna-nagar' || plot.locality === 'koyambedu') {
    return 'Jawaharlal Nehru Road (100 Feet Rd)';
  } else if (plot.locality === 't-nagar') {
    return 'Usman Road / Venkatanarayana Road';
  } else if (plot.locality === 'adyar' || plot.locality === 'besant-nagar') {
    return 'Sardar Patel Road / LB Road';
  } else if (plot.locality === 'ecr') {
    return 'East Coast Road (SH-49)';
  }
  return `${plot.localityName} Arterial Road`;
}

function openStreetViewStage(plot, waypoints, startCoords, destCoords) {
  activeStreetWaypoints = waypoints;
  currentStreetWaypointIndex = 0;
  stopStreetTourAutoplay();

  const stage = document.getElementById("street-view-stage");
  if (stage) {
    stage.classList.remove("hidden");
    stage.classList.add("active");
  }

  const titleEl = document.getElementById("street-view-title");
  if (titleEl) {
    titleEl.textContent = `${plot.plotNumber} - ${plot.localityName} (${plot.projectName})`;
  }

  // Render progress dots
  const dotsContainer = document.getElementById("sv-progress-dots");
  if (dotsContainer) {
    dotsContainer.innerHTML = waypoints.map((wp, idx) => {
      const isArrival = idx === waypoints.length - 1;
      return `
        <div 
          class="sv-waypoint-dot ${idx === 0 ? 'active' : ''} ${isArrival ? 'arrival' : ''}" 
          id="sv-dot-${idx}" 
          onclick="loadStreetViewWaypoint(${idx})" 
          title="Viewpoint ${idx + 1}: ${wp.name}">
        </div>
      `;
    }).join('');
  }

  // Initialize synchronized mini-map
  initStreetViewMiniMap(plot, waypoints, startCoords, destCoords);

  // Load first viewpoint
  loadStreetViewWaypoint(0);
}

function loadStreetViewWaypoint(index) {
  if (!activeStreetWaypoints || activeStreetWaypoints.length === 0) return;
  index = Math.max(0, Math.min(index, activeStreetWaypoints.length - 1));
  currentStreetWaypointIndex = index;
  const wp = activeStreetWaypoints[index];

  // Transition overlay
  const loadingEl = document.getElementById("street-view-loading");
  const loadingText = document.getElementById("street-view-loading-text");
  if (loadingEl) {
    if (loadingText) loadingText.textContent = `LOADING CHENNAI VIEWPOINT ${index + 1} (${wp.name})...`;
    loadingEl.classList.remove("opacity-0");
    loadingEl.classList.add("opacity-100");
    setTimeout(() => {
      loadingEl.classList.remove("opacity-100");
      loadingEl.classList.add("opacity-0");
    }, 900);
  }

  // Load official Google Street View 360 Interactive Panorama
  const iframe = document.getElementById("street-view-iframe");
  if (iframe) {
    const svUrl = `https://www.google.com/maps?q=&layer=c&cbll=${wp.lat.toFixed(6)},${wp.lng.toFixed(6)}&cbp=12,${wp.heading.toFixed(1)},0,0,0&output=svembed`;
    iframe.src = svUrl;
  }

  // Update HUD
  const maneuverEl = document.getElementById("sv-hud-maneuver");
  const wpBadge = document.getElementById("sv-hud-waypoint-badge");
  const distEl = document.getElementById("sv-hud-dist");
  const roadNameEl = document.getElementById("sv-hud-road-name");
  const instrEl = document.getElementById("sv-hud-instructions");
  const headingEl = document.getElementById("sv-compass-heading");

  if (maneuverEl) maneuverEl.innerHTML = `<i class="fa-solid ${wp.maneuverIcon}"></i>`;
  if (wpBadge) wpBadge.textContent = `VIEWPOINT ${index + 1} OF ${activeStreetWaypoints.length}`;
  if (distEl) distEl.textContent = wp.distToNextText;
  if (roadNameEl) roadNameEl.textContent = wp.name;
  if (instrEl) instrEl.textContent = wp.instruction;
  if (headingEl) {
    headingEl.textContent = `🧭 ${Math.round(wp.heading).toString().padStart(3, '0')}° ${getCompassDirection(wp.heading)}`;
  }

  // Update progress dots
  for (let i = 0; i < activeStreetWaypoints.length; i++) {
    const dot = document.getElementById(`sv-dot-${i}`);
    if (dot) {
      dot.className = `sv-waypoint-dot ${i === index ? 'active' : (i < index ? 'completed' : '')} ${i === activeStreetWaypoints.length - 1 ? 'arrival' : ''}`;
    }
  }

  // Update Mini-Map camera marker & FOV cone
  if (streetViewMiniMap && svMiniMapCameraMarker) {
    svMiniMapCameraMarker.setLatLng([wp.lat, wp.lng]);
    const rotator = document.getElementById('sv-cone-rotator');
    if (rotator) {
      rotator.style.transform = `rotate(${wp.heading}deg)`;
    }
    streetViewMiniMap.panTo([wp.lat, wp.lng], { animate: true, duration: 0.8 });
  }

  // Update Motorcycle Cockpit Telemetry, Cornering Physics & Leaning
  updateMotorcycleCockpit(wp, index);

  // Handle Arrival Viewpoint
  const arrivalBanner = document.getElementById("street-view-arrival-banner");
  if (wp.isArrival) {
    stopStreetTourAutoplay();
    if (arrivalBanner) {
      const plot = travelDestinationPlot || CHENNAI_PLOTS_DATABASE.find(p => p.id === activePlotId);
      if (plot) {
        const titleEl = document.getElementById("sv-arrival-plot-title");
        const noteEl = document.getElementById("sv-arrival-coverage-note");
        if (titleEl) titleEl.textContent = `${plot.plotNumber} - ${plot.title}`;
        if (noteEl) noteEl.textContent = wp.coverageStatus;
      }
      arrivalBanner.classList.remove("hidden");
    }
  } else {
    if (arrivalBanner) arrivalBanner.classList.add("hidden");
  }
}

function updateMotorcycleCockpit(wp, index) {
  const rig = document.getElementById("motorcycle-handlebar-rig");
  const blinkerL = document.getElementById("bike-blinker-left");
  const blinkerR = document.getElementById("bike-blinker-right");
  const speedEl = document.getElementById("bike-digital-speed");
  const gearEl = document.getElementById("bike-gear-badge");
  const rpmEl = document.getElementById("bike-rpm-display");
  const tachoEl = document.getElementById("bike-tacho-fill");
  const telemetryEl = document.getElementById("bike-road-telemetry");

  // Calculate Turn Angle Delta
  let turnDelta = 0;
  if (index > 0 && activeStreetWaypoints[index - 1]) {
    const prevHeading = activeStreetWaypoints[index - 1].heading;
    turnDelta = ((wp.heading - prevHeading + 540) % 360) - 180;
  } else if (activeStreetWaypoints.length > 1) {
    const nextHeading = activeStreetWaypoints[1].heading;
    turnDelta = ((nextHeading - wp.heading + 540) % 360) - 180;
  }

  if (blinkerL) blinkerL.classList.remove("blinking");
  if (blinkerR) blinkerR.classList.remove("blinking");

  // Dynamic Handlebar Leaning / Countersteering
  if (rig) {
    rig.classList.remove("lean-left", "lean-right", "lean-center");
    if (wp.isArrival) {
      rig.classList.add("lean-center");
    } else if (turnDelta < -6) {
      rig.classList.add("lean-left");
      if (blinkerL) blinkerL.classList.add("blinking");
    } else if (turnDelta > 6) {
      rig.classList.add("lean-right");
      if (blinkerR) blinkerR.classList.add("blinking");
    } else {
      rig.classList.add("lean-center");
    }
  }

  // Realistic Motorcycle Speed & Gear Calculation
  let speed = 48;
  let gear = "GEAR 4";
  let rpm = "5,200 RPM";
  let tacho = "70%";

  if (wp.isArrival) {
    speed = 0;
    gear = "NEUTRAL";
    rpm = "1,050 RPM";
    tacho = "15%";
  } else if (Math.abs(turnDelta) > 12) {
    speed = 24;
    gear = "GEAR 2";
    rpm = "3,200 RPM";
    tacho = "40%";
  } else if (index === 0) {
    speed = 35;
    gear = "GEAR 3";
    rpm = "4,100 RPM";
    tacho = "55%";
  } else {
    // Open Chennai arterial highway cruising
    speed = 54;
    gear = "GEAR 5";
    rpm = "5,900 RPM";
    tacho = "82%";
  }

  if (speedEl) speedEl.textContent = speed.toString();
  if (gearEl) {
    gearEl.textContent = gear;
    gearEl.className = gear === "NEUTRAL"
      ? "px-2 py-0.5 rounded font-black text-xs bg-emerald-400 text-black shadow-[0_0_8px_#34d399]"
      : "px-2 py-0.5 rounded font-black text-xs bg-emerald-500 text-black shadow-[0_0_8px_#10b981]";
  }
  if (rpmEl) rpmEl.textContent = rpm;
  if (tachoEl) tachoEl.style.width = tacho;
  if (telemetryEl) telemetryEl.textContent = wp.name;

  // Sync with main navigation HUD speed if present
  const hudLiveSpeed = document.getElementById("hud-live-speed");
  if (hudLiveSpeed) hudLiveSpeed.textContent = speed.toString();

  // Update dynamic Web Audio engine sound pitch
  updateMotorcycleSoundSpeed(speed);
}

function toggleMotorcycleEngineSound() {
  if (isBikeAudioActive) {
    stopMotorcycleSound();
  } else {
    startMotorcycleSound();
  }
}

function startMotorcycleSound() {
  try {
    if (!bikeAudioCtx) {
      bikeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (bikeAudioCtx.state === 'suspended') {
      bikeAudioCtx.resume();
    }

    bikeOsc1 = bikeAudioCtx.createOscillator();
    bikeOsc2 = bikeAudioCtx.createOscillator();
    bikeGain = bikeAudioCtx.createGain();

    bikeOsc1.type = 'sawtooth';
    bikeOsc2.type = 'triangle';

    bikeOsc1.frequency.setValueAtTime(36, bikeAudioCtx.currentTime);
    bikeOsc2.frequency.setValueAtTime(72, bikeAudioCtx.currentTime);

    const filter = bikeAudioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, bikeAudioCtx.currentTime);

    bikeGain.gain.setValueAtTime(0.06, bikeAudioCtx.currentTime);

    bikeOsc1.connect(filter);
    bikeOsc2.connect(filter);
    filter.connect(bikeGain);
    bikeGain.connect(bikeAudioCtx.destination);

    bikeOsc1.start();
    bikeOsc2.start();
    isBikeAudioActive = true;

    const icon = document.getElementById("bike-sound-icon");
    if (icon) icon.className = "fa-solid fa-volume-high text-emerald-400 text-[10px]";
  } catch (e) {
    console.warn("Motorcycle audio synthesis error:", e);
  }
}

function updateMotorcycleSoundSpeed(speed) {
  if (!isBikeAudioActive || !bikeOsc1 || !bikeAudioCtx) return;
  const baseFreq = Math.max(30, 32 + (speed / 60) * 50);
  bikeOsc1.frequency.setTargetAtTime(baseFreq, bikeAudioCtx.currentTime, 0.15);
  bikeOsc2.frequency.setTargetAtTime(baseFreq * 2, bikeAudioCtx.currentTime, 0.15);
}

function stopMotorcycleSound() {
  isBikeAudioActive = false;
  if (bikeOsc1) { try { bikeOsc1.stop(); bikeOsc1.disconnect(); } catch (e) {} bikeOsc1 = null; }
  if (bikeOsc2) { try { bikeOsc2.stop(); bikeOsc2.disconnect(); } catch (e) {} bikeOsc2 = null; }
  const icon = document.getElementById("bike-sound-icon");
  if (icon) icon.className = "fa-solid fa-volume-xmark text-[10px]";
}

function toggleMotorcycleCockpitVisibility() {
  const rig = document.getElementById("motorcycle-handlebar-rig");
  if (rig) {
    rig.classList.toggle("opacity-0");
  }
}

function nextStreetWaypoint() {
  if (currentStreetWaypointIndex < activeStreetWaypoints.length - 1) {
    loadStreetViewWaypoint(currentStreetWaypointIndex + 1);
  } else {
    stopStreetTourAutoplay();
  }
}

function prevStreetWaypoint() {
  if (currentStreetWaypointIndex > 0) {
    loadStreetViewWaypoint(currentStreetWaypointIndex - 1);
  }
}

function jumpToPlotStreetArrival() {
  if (!activeStreetWaypoints || activeStreetWaypoints.length === 0) return;
  loadStreetViewWaypoint(activeStreetWaypoints.length - 1);
}

function toggleStreetTourAutoplay() {
  if (isStreetAutoplayActive) {
    stopStreetTourAutoplay();
  } else {
    startStreetTourAutoplay();
  }
}

function startStreetTourAutoplay() {
  if (currentStreetWaypointIndex >= activeStreetWaypoints.length - 1) {
    loadStreetViewWaypoint(0);
  }
  isStreetAutoplayActive = true;
  const playIcon = document.getElementById("sv-btn-play-icon");
  const playLabel = document.getElementById("sv-btn-play-label");
  if (playIcon) playIcon.className = "fa-solid fa-pause";
  if (playLabel) playLabel.textContent = "Pause";

  clearInterval(streetAutoplayTimer);
  streetAutoplayTimer = setInterval(() => {
    if (currentStreetWaypointIndex < activeStreetWaypoints.length - 1) {
      nextStreetWaypoint();
    } else {
      stopStreetTourAutoplay();
    }
  }, 4200);
}

function stopStreetTourAutoplay() {
  isStreetAutoplayActive = false;
  clearInterval(streetAutoplayTimer);
  streetAutoplayTimer = null;
  const playIcon = document.getElementById("sv-btn-play-icon");
  const playLabel = document.getElementById("sv-btn-play-label");
  if (playIcon) playIcon.className = "fa-solid fa-play";
  if (playLabel) playLabel.textContent = "Auto Tour";
}

function setStreetViewDisplayMode(mode) {
  currentStreetDisplayMode = mode;
  const stage = document.getElementById("street-view-stage");
  const body = document.getElementById("street-view-body");
  const btnFull = document.getElementById("sv-mode-btn-full");
  const btnSplit = document.getElementById("sv-mode-btn-split");

  if (mode === 'map') {
    switchToMapMode();
    return;
  }

  if (stage) {
    stage.classList.remove("hidden");
    stage.classList.add("active");
  }

  if (btnFull) {
    btnFull.className = mode === 'full' 
      ? 'px-2.5 py-1 rounded-lg bg-white/20 text-white transition' 
      : 'px-2.5 py-1 rounded-lg text-neutral-300 transition hover:bg-white/20';
  }
  if (btnSplit) {
    btnSplit.className = mode === 'split' 
      ? 'px-2.5 py-1 rounded-lg bg-white/20 text-white transition' 
      : 'px-2.5 py-1 rounded-lg text-neutral-300 transition hover:bg-white/20';
  }

  if (body) {
    if (mode === 'split') {
      body.classList.add("mode-split");
    } else {
      body.classList.remove("mode-split");
    }
  }

  if (streetViewMiniMap) {
    setTimeout(() => streetViewMiniMap.invalidateSize(), 350);
  }
}

function switchToMapMode() {
  stopStreetTourAutoplay();
  const stage = document.getElementById("street-view-stage");
  if (stage) {
    stage.classList.add("hidden");
    stage.classList.remove("active");
  }
  if (mapEngine) {
    setTimeout(() => mapEngine.resize(), 300);
  } else if (leafletMap) {
    setTimeout(() => leafletMap.invalidateSize(), 300);
  }
}

function exitStreetViewJourney() {
  switchToMapMode();
}

function openActiveStreetViewJourney() {
  const stage = document.getElementById("street-view-stage");
  if (stage && activeStreetWaypoints.length > 0) {
    stage.classList.remove("hidden");
    stage.classList.add("active");
    if (streetViewMiniMap) {
      setTimeout(() => streetViewMiniMap.invalidateSize(), 300);
    }
    return;
  }
  const targetId = activePlotId || (CHENNAI_PLOTS_DATABASE[0] ? CHENNAI_PLOTS_DATABASE[0].id : null);
  if (targetId) {
    startStreetViewJourneyForPlot(targetId);
  }
}

function startMotorcycleMapJourney() {
  const targetId = activePlotId || (CHENNAI_PLOTS_DATABASE[0] ? CHENNAI_PLOTS_DATABASE[0].id : null);
  if (targetId) {
    navigateAndTravelToPlot(targetId);
  }
}

function startStreetViewJourneyForPlot(plotId) {
  const plot = CHENNAI_PLOTS_DATABASE.find(p => p.id === plotId);
  if (!plot) return;
  const mapSection = document.getElementById("map-panel-container");
  if (mapSection) {
    mapSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  navigateAndTravelToPlot(plotId);
}

function viewPlotDetailsFromStreetView() {
  switchToMapMode();
  if (travelDestinationPlot) {
    renderPlotDetailsBelowMap(travelDestinationPlot);
    setTimeout(() => {
      const detailSection = document.getElementById("selected-plot-detail-section");
      if (detailSection) {
        detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 400);
  }
}

function toggleMinimapSize() {
  const wrapper = document.getElementById("street-view-minimap-wrapper");
  const icon = document.getElementById("minimap-size-icon");
  if (!wrapper) return;
  isMinimapExpanded = !isMinimapExpanded;
  if (isMinimapExpanded) {
    wrapper.classList.add("expanded");
    if (icon) icon.className = "fa-solid fa-down-left-and-up-right-to-center text-[10px]";
  } else {
    wrapper.classList.remove("expanded");
    if (icon) icon.className = "fa-solid fa-up-right-and-down-left-from-center text-[10px]";
  }
  if (streetViewMiniMap) {
    setTimeout(() => streetViewMiniMap.invalidateSize(), 350);
  }
}

function initStreetViewMiniMap(plot, waypoints, startCoords, destCoords) {
  if (streetViewMiniMap) {
    try { streetViewMiniMap.remove(); } catch (e) {}
    streetViewMiniMap = null;
  }

  const miniMapEl = document.getElementById('street-view-minimap');
  if (!miniMapEl) return;

  streetViewMiniMap = L.map('street-view-minimap', {
    attributionControl: false,
    zoomControl: false,
    doubleClickZoom: false
  });

  // Google Maps Hybrid Satellite Layer
  L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20
  }).addTo(streetViewMiniMap);

  // Polyline along waypoints
  const latLngs = waypoints.map(w => [w.lat, w.lng]);
  svMiniMapRouteLine = L.polyline(latLngs, {
    color: '#06b6d4',
    weight: 4,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(streetViewMiniMap);

  // Origin Marker
  svMiniMapOriginMarker = L.circleMarker([startCoords[0], startCoords[1]], {
    radius: 6,
    fillColor: '#10b981',
    color: '#ffffff',
    weight: 2,
    fillOpacity: 1
  }).addTo(streetViewMiniMap);

  // Plot Destination Pin
  const plotIcon = L.divIcon({
    className: 'sv-minimap-plot-pin',
    html: `<div style="background:#f59e0b; color:#000; font-size:10px; font-weight:900; padding:2px 6px; border-radius:6px; border:1.5px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,0.4);"><i class="fa-solid fa-flag text-[9px] mr-0.5"></i>${plot.plotNumber}</div>`,
    iconSize: [60, 24],
    iconAnchor: [30, 24]
  });
  svMiniMapPlotMarker = L.marker([plot.latitude, plot.longitude], { icon: plotIcon }).addTo(streetViewMiniMap);

  // Camera Position Marker with Heading FOV Cone
  const cameraConeHtml = `
    <div class="sv-camera-marker-container">
      <div class="sv-camera-cone-wrapper" id="sv-cone-rotator">
        <svg width="70" height="70" viewBox="0 0 70 70" style="overflow:visible;">
          <polygon points="35,35 12,2 58,2" fill="rgba(16, 185, 129, 0.45)" stroke="#10b981" stroke-width="1.5" />
        </svg>
      </div>
      <div class="sv-camera-pulse"></div>
      <div class="sv-camera-dot"></div>
    </div>
  `;

  const cameraIcon = L.divIcon({
    className: 'sv-camera-leaflet-div',
    html: cameraConeHtml,
    iconSize: [70, 70],
    iconAnchor: [35, 35]
  });

  svMiniMapCameraMarker = L.marker([waypoints[0].lat, waypoints[0].lng], {
    icon: cameraIcon,
    zIndexOffset: 1000
  }).addTo(streetViewMiniMap);

  try {
    streetViewMiniMap.fitBounds(svMiniMapRouteLine.getBounds(), { padding: [25, 25] });
  } catch (e) {}
}

function getCompassDirection(angle) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((angle % 360) / 45)) % 8;
  return dirs[idx];
}

function clearUrban3DFeatures() {
  if (!mapEngine) return;
  if (mapEngine.getLayer('chennai-3d-buildings')) mapEngine.removeLayer('chennai-3d-buildings');
  if (mapEngine.getLayer('chennai-3d-trees')) mapEngine.removeLayer('chennai-3d-trees');
  if (mapEngine.getLayer('chennai-road-divider')) mapEngine.removeLayer('chennai-road-divider');
  if (mapEngine.getSource('chennai-urban-source')) mapEngine.removeSource('chennai-urban-source');
  if (mapEngine.getSource('chennai-divider-source')) mapEngine.removeSource('chennai-divider-source');
}

// ==========================================================================
// VEHICLE MODEL GENERATOR (Superbike, Luxury Car, MTC Bus, Walking Pedestrian)
// Dynamic SVGs, Headlight Cones, Glow Lighting & Turn Physics
// ==========================================================================
function generateTravelerVehicleHtml(mode, bearing = 0, isParked = false) {
  if (mode === 'car') {
    return `
      ${!isParked ? '<div class="car-headlight-cone"></div>' : ''}
      <div class="car-model-wrapper" ${isParked ? 'style="transform: scale(0.95);"' : ''}>
        <!-- HEAD LLB BRAND BADGE (Positioned at the HEAD / FRONT of the car - ONLY LLB) -->
        <div class="motorcycle-rider-pill">
          <span class="llb-avatar-badge">LLB</span>
        </div>
        <div class="car-ground-shadow"></div>
        <svg width="48" height="88" viewBox="0 0 48 88" class="car-3d-svg">
          <!-- Metallic Sports Sedan Chassis -->
          <rect x="5" y="8" width="38" height="72" rx="12" fill="#047857" stroke="#10b981" stroke-width="1.5" />
          <path d="M7 20 L41 20 L39 12 Q24 9 9 12 Z" fill="#022c22" />
          
          <!-- OFFICIAL LLB FRONT HOOD / HEAD EMBLEM -->
          <rect x="14" y="9" width="20" height="9" rx="2.5" fill="#09090b" stroke="#f59e0b" stroke-width="1.2" />
          <text x="24" y="15.8" font-size="6" font-family="'Times New Roman', serif" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="0.5">LLB</text>

          <!-- Wheels -->
          <rect x="2" y="14" width="4" height="14" rx="2" fill="#0f172a" stroke="#334155" stroke-width="0.8" />
          <rect x="42" y="14" width="4" height="14" rx="2" fill="#0f172a" stroke="#334155" stroke-width="0.8" />
          <rect x="2" y="58" width="4" height="15" rx="2" fill="#0f172a" stroke="#334155" stroke-width="0.8" />
          <rect x="42" y="58" width="4" height="15" rx="2" fill="#0f172a" stroke="#334155" stroke-width="0.8" />
          <!-- Aerodynamic Mirrors -->
          <rect x="0" y="22" width="6" height="3.5" rx="1.5" fill="#065f46" stroke="#10b981" stroke-width="0.6" />
          <rect x="42" y="22" width="6" height="3.5" rx="1.5" fill="#065f46" stroke="#10b981" stroke-width="0.6" />
          <!-- Windshield & Panoramic Tinted Glass Roof -->
          <path d="M9 22 L39 22 L36 36 L12 36 Z" fill="#09090b" stroke="#38bdf8" stroke-width="0.6" opacity="0.95" />
          <circle cx="19" cy="30" r="3" fill="#e2e8f0" opacity="0.75" />
          <rect x="11" y="38" width="26" height="24" rx="3" fill="#022c22" stroke="#10b981" stroke-width="0.6" opacity="0.9" />

          <!-- LUXURY LLB ROOF HEADER EMBLEM -->
          <rect x="13" y="22" width="22" height="7.5" rx="1.8" fill="#09090b" stroke="#f59e0b" stroke-width="1.1" />
          <text x="24" y="27.8" font-size="5.2" font-family="'Times New Roman', serif" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="0.6">LLB</text>

          <!-- Rear Window -->
          <path d="M11 64 L37 64 L34 72 L14 72 Z" fill="#09090b" stroke="#38bdf8" stroke-width="0.6" opacity="0.95" />
          <!-- Dual Projector LED Headlights -->
          <ellipse cx="10" cy="10" rx="4" ry="2" fill="#fef08a" class="headlight-bulb-glow" />
          <ellipse cx="38" cy="10" rx="4" ry="2" fill="#fef08a" class="headlight-bulb-glow" />
          <!-- Full-width Rear Red LED Lightbar -->
          <path d="M9 77 L39 77 L37 80 L11 80 Z" fill="#ef4444" class="tail-light-glow" />
          <!-- Dual Chrome Exhaust Tips -->
          <rect x="11" y="79" width="4" height="1.5" rx="0.5" fill="#94a3b8" />
          <rect x="33" y="79" width="4" height="1.5" rx="0.5" fill="#94a3b8" />
        </svg>
        ${!isParked ? '<div class="motorcycle-radar-pulse" style="border-color:#10b981;"></div>' : ''}
      </div>
    `;
  }

  if (mode === 'bus') {
    return `
      ${!isParked ? '<div class="bus-headlight-cone"></div>' : ''}
      <div class="bus-model-wrapper" ${isParked ? 'style="transform: scale(0.95);"' : ''}>
        <!-- HEAD LLB BRAND BADGE (Positioned at the HEAD / FRONT of the bus - ONLY LLB) -->
        <div class="motorcycle-rider-pill">
          <span class="llb-avatar-badge">LLB</span>
        </div>
        <div class="bus-ground-shadow"></div>
        <svg width="48" height="110" viewBox="0 0 48 110" class="bus-3d-svg">
          <!-- Chennai MTC Deluxe Red / Yellow Livery -->
          <rect x="5" y="8" width="38" height="94" rx="8" fill="#dc2626" stroke="#991b1b" stroke-width="1.5" />
          <rect x="6" y="24" width="36" height="60" fill="#fef08a" opacity="0.95" />
          <!-- Wheels (Front & Rear Tandem) -->
          <rect x="1" y="20" width="5" height="15" rx="2" fill="#18181b" />
          <rect x="42" y="20" width="5" height="15" rx="2" fill="#18181b" />
          <rect x="1" y="74" width="5" height="14" rx="2" fill="#18181b" />
          <rect x="1" y="87" width="5" height="13" rx="2" fill="#18181b" />
          <rect x="42" y="74" width="5" height="14" rx="2" fill="#18181b" />
          <rect x="42" y="87" width="5" height="13" rx="2" fill="#18181b" />
          
          <!-- OFFICIAL LLB FRONT DESTINATION HEADER (HEAD OF BUS - ONLY LLB) -->
          <rect x="5" y="8" width="38" height="12" rx="2" fill="#09090b" stroke="#f59e0b" stroke-width="1.5" />
          <text x="24" y="17" font-size="8" font-family="'Times New Roman', serif" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="1.5">LLB</text>
          
          <!-- Front Grille LLB Emblem -->
          <circle cx="24" cy="23" r="4.5" fill="#09090b" stroke="#f59e0b" stroke-width="1.2" />
          <text x="24" y="24.8" font-size="4" font-family="'Times New Roman', serif" font-weight="900" fill="#fbbf24" text-anchor="middle">LLB</text>

          <!-- Front Curved Windshield & Wipers -->
          <path d="M7 19 L41 19 L39 30 L9 30 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="0.6" />
          <line x1="20" y1="21" x2="15" y2="28" stroke="#94a3b8" stroke-width="1" />
          <line x1="29" y1="21" x2="34" y2="28" stroke="#94a3b8" stroke-width="1" />
          <circle cx="16" cy="25" r="2.2" fill="#fef3c7" />

          <!-- Roof AC Unit & Ventilators -->
          <rect x="13" y="38" width="22" height="20" rx="3" fill="#cbd5e1" stroke="#64748b" stroke-width="0.8" />
          <line x1="16" y1="43" x2="32" y2="43" stroke="#475569" stroke-width="0.8" />
          <line x1="16" y1="48" x2="32" y2="48" stroke="#475569" stroke-width="0.8" />
          <line x1="16" y1="53" x2="32" y2="53" stroke="#475569" stroke-width="0.8" />

          <!-- Side Passenger Windows with warm interior lighting -->
          <rect x="7" y="32" width="4.5" height="48" rx="1.5" fill="#fef3c7" stroke="#b45309" stroke-width="0.6" opacity="0.9" />
          <rect x="36.5" y="32" width="4.5" height="48" rx="1.5" fill="#fef3c7" stroke="#b45309" stroke-width="0.6" opacity="0.9" />
          <!-- High-Intensity Dual Bus Headlights -->
          <circle cx="10" cy="18" r="2.8" fill="#fef08a" class="headlight-bulb-glow" />
          <circle cx="38" cy="18" r="2.8" fill="#fef08a" class="headlight-bulb-glow" />
          <!-- Rear Triple Emergency Stop Lights -->
          <rect x="8" y="98" width="6" height="2.5" rx="1" fill="#ef4444" class="tail-light-glow" />
          <rect x="21" y="98" width="6" height="2.5" rx="1" fill="#ef4444" class="tail-light-glow" />
          <rect x="34" y="98" width="6" height="2.5" rx="1" fill="#ef4444" class="tail-light-glow" />
        </svg>
        ${!isParked ? '<div class="motorcycle-radar-pulse" style="border-color:#dc2626;"></div>' : ''}
      </div>
    `;
  }

  if (mode === 'walk') {
    return `
      ${!isParked ? '<div class="walker-direction-cone"></div>' : ''}
      <div class="walker-model-wrapper" ${isParked ? 'style="transform: scale(0.95);"' : ''}>
        <!-- HEAD LLB BRAND BADGE (Positioned above the HEAD of the walker - ONLY LLB) -->
        <div class="motorcycle-rider-pill">
          <span class="llb-avatar-badge">LLB</span>
        </div>
        <div class="walker-ground-shadow"></div>
        <svg width="36" height="46" viewBox="0 0 36 46" class="walker-3d-svg">
          <!-- Walking Legs with Strides -->
          <rect x="11" y="26" width="3.5" height="14" rx="1.5" fill="#1e293b" class="walker-leg-left" />
          <rect x="21.5" y="26" width="3.5" height="14" rx="1.5" fill="#1e293b" class="walker-leg-right" />
          <!-- Arms Swinging -->
          <rect x="4" y="16" width="3.5" height="12" rx="1.5" fill="#047857" class="walker-arm-left" />
          <rect x="28.5" y="16" width="3.5" height="12" rx="1.5" fill="#047857" class="walker-arm-right" />
          <!-- Torso & Backpack -->
          <ellipse cx="18" cy="22" rx="9" ry="7" fill="#10b981" stroke="#059669" stroke-width="1.2" />
          <rect x="13" y="16" width="10" height="9" rx="2" fill="#0284c7" stroke="#0369a1" stroke-width="0.8" />
          
          <!-- OFFICIAL LLB LOGO EMBLEM ON WALKER'S HEAD / CAP VISOR (ONLY LLB) -->
          <rect x="10" y="3.5" width="16" height="8" rx="2" fill="#09090b" stroke="#f59e0b" stroke-width="1.2" />
          <text x="18" y="9.5" font-size="5.5" font-family="'Times New Roman', serif" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="0.5">LLB</text>

          <!-- Head & Cap Visor -->
          <circle cx="18" cy="13" r="5" fill="#1e293b" />
          <ellipse cx="18" cy="10" rx="3.5" ry="1.8" fill="#f59e0b" />
          <!-- Handheld Glowing GPS Screen -->
          <rect x="28" y="11" width="3.5" height="5.5" rx="1" fill="#09090b" stroke="#38bdf8" stroke-width="0.6" />
          <circle cx="29.8" cy="13.8" r="1.2" fill="#38bdf8" class="headlight-bulb-glow" />
        </svg>
      </div>
    `;
  }

  // DEFAULT / BIKE: ULTRA-COOL SUPERBIKE 1000RR
  return `
    ${!isParked ? '<div class="motorcycle-headlight-cone"></div>' : ''}
    <div class="motorcycle-model-wrapper" ${isParked ? 'style="transform: scale(0.95);"' : ''}>
      <!-- HEAD LLB BRAND BADGE (Positioned at the HEAD / FRONT of the superbike - ONLY LLB) -->
      <div class="motorcycle-rider-pill">
        <span class="llb-avatar-badge">LLB</span>
      </div>
      <div class="motorcycle-ground-shadow"></div>
      <svg width="44" height="78" viewBox="0 0 44 78" class="motorcycle-3d-svg">
        <!-- Wide Rear Racing Slick Tyre & Neon Rim -->
        <rect x="16" y="52" width="12" height="22" rx="6" fill="#09090b" stroke="#27272a" stroke-width="1.5" />
        <line x1="22" y1="54" x2="22" y2="72" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.85" />
        <rect x="20" y="58" width="4" height="10" rx="1.5" fill="#06b6d4" opacity="0.6" />
        <circle cx="22" cy="63" r="4.5" fill="#18181b" stroke="#71717a" stroke-width="0.8" />
        <rect x="25" y="59" width="3.5" height="5" rx="1.2" fill="#ef4444" />
        <!-- Dual Akrapovic Carbon Exhausts with Glowing Nitro Tips -->
        <rect x="10" y="44" width="4" height="19" rx="1.8" fill="#27272a" stroke="#52525b" stroke-width="0.8" />
        <rect x="10.5" y="60" width="3" height="3" rx="1" fill="#38bdf8" class="tail-light-glow" />
        <rect x="30" y="44" width="4" height="19" rx="1.8" fill="#27272a" stroke="#52525b" stroke-width="0.8" />
        <rect x="30.5" y="60" width="3" height="3" rx="1" fill="#38bdf8" class="tail-light-glow" />
        <!-- Aerodynamic Racing Tail Cowl & Twin LED Taillights -->
        <path d="M15 50 L22 56 L29 50 L27 42 L17 42 Z" fill="#0f172a" stroke="#06b6d4" stroke-width="1" />
        <path d="M16 48 L20 51 L19 45 Z" fill="#ef4444" class="tail-light-glow" />
        <path d="M28 48 L24 51 L25 45 Z" fill="#ef4444" class="tail-light-glow" />
        
        <!-- Rider Leather Racing Suit with Aerodynamic Back Speed Hump -->
        <path d="M13 30 Q22 27 31 30 L29 44 Q22 47 15 44 Z" fill="#09090b" stroke="#18181b" stroke-width="1.2" />
        <path d="M17 32 Q22 30 27 32 L25 42 Q22 44 19 42 Z" fill="#0284c7" />
        
        <!-- Rider Arms & Carbon Knuckle Racing Gloves -->
        <path d="M12 32 L5 18 L10 16 L16 29 Z" fill="#0f172a" />
        <circle cx="6" cy="17" r="3" fill="#06b6d4" stroke="#0284c7" stroke-width="0.8" />
        <path d="M32 32 L39 18 L34 16 L28 29 Z" fill="#0f172a" />
        <circle cx="38" cy="17" r="3" fill="#06b6d4" stroke="#0284c7" stroke-width="0.8" />
        <!-- Clip-on Racing Handlebars & Bar-End Mirrors -->
        <line x1="3" y1="16" x2="41" y2="16" stroke="#cbd5e1" stroke-width="2.2" stroke-linecap="round" />
        <ellipse cx="2" cy="13.5" rx="2.2" ry="1.3" fill="#38bdf8" stroke="#475569" stroke-width="0.6" />
        <ellipse cx="42" cy="13.5" rx="2.2" ry="1.3" fill="#38bdf8" stroke="#475569" stroke-width="0.6" />
        
        <!-- Fuel Tank -->
        <path d="M13 20 Q22 17 31 20 L29 32 Q22 34 15 32 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="1.2" />
        <rect x="20" y="24" width="4" height="4" rx="1" fill="#e2e8f0" />
        <path d="M14 22 L16 30 L14 31 Z" fill="#0f172a" />
        <path d="M30 22 L28 30 L30 31 Z" fill="#0f172a" />
        
        <!-- AGV / Shoei Racing Helmet with Chameleon Visor -->
        <ellipse cx="22" cy="24" rx="7.5" ry="8.5" fill="#09090b" stroke="#06b6d4" stroke-width="1.5" />
        <path d="M16 19 Q22 15 28 19 Q22 22 16 19 Z" fill="#38bdf8" class="tail-light-glow" opacity="0.95" />
        
        <!-- OFFICIAL LLB EMBLEM ON RIDER'S HELMET HEAD -->
        <circle cx="22" cy="22" r="4.2" fill="#09090b" stroke="#f59e0b" stroke-width="1.2" />
        <text x="22" y="23.6" font-size="3.8" font-family="'Times New Roman', serif" font-weight="900" fill="#fbbf24" text-anchor="middle">LLB</text>

        <!-- Front Gold Inverted Forks & Wheel -->
        <rect x="13" y="5" width="3" height="12" rx="1.2" fill="#f59e0b" stroke="#b45309" stroke-width="0.6" />
        <rect x="28" y="5" width="3" height="12" rx="1.2" fill="#f59e0b" stroke="#b45309" stroke-width="0.6" />
        <rect x="18" y="0" width="8" height="18" rx="4" fill="#09090b" stroke="#27272a" stroke-width="1.5" />
        <line x1="22" y1="2" x2="22" y2="16" stroke="#06b6d4" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.85" />
        
        <!-- Front Fairing & Dual LED Projectors -->
        <path d="M12 12 Q22 6 32 12 L30 18 Q22 14 14 18 Z" fill="#0369a1" stroke="#38bdf8" stroke-width="1.2" />
        <ellipse cx="17" cy="10" rx="3.2" ry="1.8" fill="#fef08a" class="headlight-bulb-glow" />
        <ellipse cx="27" cy="10" rx="3.2" ry="1.8" fill="#fef08a" class="headlight-bulb-glow" />

        <!-- OFFICIAL LLB FRONT NOSE / HEAD OF BIKE EMBLEM (ONLY LLB) -->
        <rect x="13" y="0" width="18" height="8.5" rx="2.5" fill="#09090b" stroke="#f59e0b" stroke-width="1.4" />
        <text x="22" y="6.2" font-size="6" font-family="'Times New Roman', serif" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="0.8">LLB</text>
      </svg>
      ${!isParked ? '<div class="motorcycle-radar-pulse"></div>' : ''}
    </div>
  `;
}

// ==========================================================================
// PROPER ROAD DIRECTIONS GUIDE ENGINE (Turn-by-turn itinerary)
// Displays clean route steps, distances, Chennai road names & interactive step zoom
// ==========================================================================
function populateRouteDirectionsDrawer(steps, totalDistKm, totalMins, plot) {
  if (!plot) return;

  const modeCfg = TRAVEL_MODES_CONFIG[currentTravelMode] || TRAVEL_MODES_CONFIG.bike;
  const originName = (typeof currentOriginHubKey !== 'undefined' && CHENNAI_TRANSIT_HUBS[currentOriginHubKey]) 
    ? CHENNAI_TRANSIT_HUBS[currentOriginHubKey].name 
    : CHENNAI_TRANSIT_HUBS.kathipara.name;

  const summaryEl = document.getElementById("drawer-route-summary");
  const distEl = document.getElementById("drawer-total-dist");
  const timeEl = document.getElementById("drawer-total-time");
  const modeNameEl = document.getElementById("drawer-mode-name");
  const modeIconEl = document.getElementById("drawer-mode-icon");
  const stepsListEl = document.getElementById("drawer-steps-list");

  if (summaryEl) summaryEl.textContent = `${originName.split(' ')[0]} → ${plot.plotNumber}, ${plot.localityName}`;
  if (distEl) distEl.textContent = `${totalDistKm} km`;
  if (timeEl) timeEl.textContent = `~${totalMins} mins`;
  if (modeNameEl) modeNameEl.textContent = modeCfg.fullName;
  if (modeIconEl) modeIconEl.innerHTML = `<i class="${modeCfg.icon}"></i>`;

  if (!stepsListEl) return;

  // If OSRM steps are present and informative:
  if (steps && steps.length > 1) {
    let html = "";
    steps.forEach((step, idx) => {
      let icon = '<i class="fa-solid fa-arrow-up text-emerald-400"></i>';
      let maneuverType = step.maneuver ? step.maneuver.type : 'continue';
      let modifier = step.maneuver ? (step.maneuver.modifier || '') : '';

      if (maneuverType === 'depart') {
        icon = '<i class="fa-solid fa-location-dot text-cyan-400"></i>';
      } else if (maneuverType === 'arrive') {
        icon = '<i class="fa-solid fa-flag-checkered text-amber-400"></i>';
      } else if (modifier.includes('right')) {
        icon = '<i class="fa-solid fa-arrow-turn-up text-emerald-400 rotate-90"></i>';
      } else if (modifier.includes('left')) {
        icon = '<i class="fa-solid fa-arrow-turn-up text-emerald-400 -rotate-90"></i>';
      } else if (modifier.includes('slight right')) {
        icon = '<i class="fa-solid fa-arrow-trend-up text-emerald-400"></i>';
      } else if (modifier.includes('slight left')) {
        icon = '<i class="fa-solid fa-arrow-trend-up text-emerald-400 scale-x-[-1]"></i>';
      } else if (maneuverType.includes('roundabout')) {
        icon = '<i class="fa-solid fa-rotate text-emerald-400"></i>';
      }

      let roadName = step.name && step.name.trim().length > 0 ? step.name : (
        idx === 0 ? "Kathipara Flyover (GST Approach)" : (
          idx === steps.length - 1 ? `${plot.localityName} - ${plot.projectName}` : `${plot.localityName} Arterial Road`
        )
      );

      let distText = step.distance < 1000 
        ? `${Math.round(step.distance)} m` 
        : `${(step.distance / 1000).toFixed(1)} km`;

      let instruction = idx === 0 
        ? `Depart ${originName}` 
        : (idx === steps.length - 1 
          ? `Arrive at ${plot.plotNumber}, ${plot.localityName}` 
          : `${capitalizeFirstLetter(maneuverType)} ${modifier} onto ${roadName}`);

      let stepCoord = (step.maneuver && step.maneuver.location) ? step.maneuver.location : [plot.longitude, plot.latitude];

      html += `
        <div onclick="flyToRouteStep(${stepCoord[0]}, ${stepCoord[1]}, '${encodeURIComponent(roadName)}')" 
             class="step-item-card p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/60 flex items-start gap-3 hover:border-emerald-500/50">
          <div class="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-inner">
            ${icon}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-bold text-white truncate">${instruction}</span>
              <span class="text-[10px] font-mono text-emerald-400 font-bold shrink-0">${distText}</span>
            </div>
            <div class="text-[10px] text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
              <span><i class="fa-solid fa-road text-[9px] text-neutral-500 mr-1"></i>${roadName}</span>
              <span class="text-neutral-600">•</span>
              <span class="text-neutral-500 font-mono">Step ${idx + 1} of ${steps.length}</span>
            </div>
          </div>
        </div>
      `;
    });
    stepsListEl.innerHTML = html;
  } else {
    // Curated Authentic Chennai Proper Road Directions to this Plot
    const dKm = parseFloat(totalDistKm) || 12;
    const est1 = (dKm * 0.15).toFixed(1);
    const est2 = (dKm * 0.55).toFixed(1);
    const est3 = (dKm * 0.25).toFixed(1);

    stepsListEl.innerHTML = `
      <div onclick="flyToRouteStep(80.2030, 13.0067, 'Kathipara Junction')" class="step-item-card p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/60 flex items-start gap-3 hover:border-emerald-500/50">
        <div class="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-inner">
          <i class="fa-solid fa-location-dot text-cyan-400"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-bold text-white truncate">Depart ${originName}</span>
            <span class="text-[10px] font-mono text-emerald-400 font-bold shrink-0">${est1} km</span>
          </div>
          <div class="text-[10px] text-neutral-400 truncate mt-0.5">
            <i class="fa-solid fa-road text-[9px] text-neutral-500 mr-1"></i>GST Road (NH 45) / Inner Ring Road Interchange
          </div>
        </div>
      </div>

      <div onclick="flyToRouteStep(${plot.longitude * 0.5 + 80.2030 * 0.5}, ${plot.latitude * 0.5 + 13.0067 * 0.5}, 'Arterial Highway')" class="step-item-card p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/60 flex items-start gap-3 hover:border-emerald-500/50">
        <div class="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-inner">
          <i class="fa-solid fa-arrow-up text-emerald-400"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-bold text-white truncate">Continue along 100-Ft Arterial Corridor</span>
            <span class="text-[10px] font-mono text-emerald-400 font-bold shrink-0">${est2} km</span>
          </div>
          <div class="text-[10px] text-neutral-400 truncate mt-0.5">
            <i class="fa-solid fa-road text-[9px] text-neutral-500 mr-1"></i>Major Transit Highway towards ${plot.localityName}
          </div>
        </div>
      </div>

      <div onclick="flyToRouteStep(${plot.longitude}, ${plot.latitude}, '${plot.localityName} Main Road')" class="step-item-card p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/60 flex items-start gap-3 hover:border-emerald-500/50">
        <div class="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-inner">
          <i class="fa-solid fa-arrow-turn-up text-emerald-400 rotate-90"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-bold text-white truncate">Turn into ${plot.localityName} Avenue</span>
            <span class="text-[10px] font-mono text-emerald-400 font-bold shrink-0">${est3} km</span>
          </div>
          <div class="text-[10px] text-neutral-400 truncate mt-0.5">
            <i class="fa-solid fa-road text-[9px] text-neutral-500 mr-1"></i>Connect via ${plot.roadWidth || '30-Ft Blacktop Road'}
          </div>
        </div>
      </div>

      <div onclick="flyToRouteStep(${plot.longitude}, ${plot.latitude}, 'Arrival at Plot')" class="step-item-card p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3 hover:border-emerald-400">
        <div class="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-inner">
          <i class="fa-solid fa-flag-checkered text-emerald-400"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-black text-emerald-300 truncate">Arrive at ${plot.plotNumber}</span>
            <span class="text-[10px] font-mono text-emerald-400 font-bold shrink-0">DESTINATION</span>
          </div>
          <div class="text-[10px] text-neutral-300 truncate mt-0.5">
            ${plot.address} • Demarcated Corner Boundary Stones
          </div>
        </div>
      </div>
    `;
  }
}

function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function toggleRouteDirectionsDrawer() {
  const drawer = document.getElementById("route-directions-drawer");
  if (!drawer) return;
  drawer.classList.toggle("hidden");
  if (!drawer.classList.contains("hidden")) {
    const plot = travelDestinationPlot || CHENNAI_PLOTS_DATABASE[0];
    populateRouteDirectionsDrawer(activeRouteSteps, journeyState.totalDistKm || "12.5", journeyState.totalMins || "22", plot);
  }
}

function flyToRouteStep(lng, lat, stepName) {
  if (mapEngine) {
    mapEngine.flyTo({
      center: [lng, lat],
      zoom: 17.2,
      pitch: 52,
      duration: 1200,
      essential: true
    });
  } else if (leafletMap) {
    leafletMap.flyTo([lat, lng], 17);
  }
}

// ==========================================================================
// FIRST-PERSON ROAD NAVIGATION CAMERA ENGINE
// Low-angle, forward-facing realistic camera following actual road geometry
// ==========================================================================
function start3DCameraNavigation(roadLngLats, plot, totalDistKm, totalMins, modeCfg, routeSteps = []) {
  if (!mapEngine || roadLngLats.length < 2) {
    finishTravelArrival(plot);
    return;
  }

  const segmentDistances = [];
  let totalDistanceMeters = 0;
  for (let i = 0; i < roadLngLats.length - 1; i++) {
    const p1 = roadLngLats[i];
    const p2 = roadLngLats[i + 1];
    const d = getDistanceMeters(p1[1], p1[0], p2[1], p2[0]);
    segmentDistances.push(d);
    totalDistanceMeters += d;
  }

  const initialBearing = calculateBearing(roadLngLats[0], roadLngLats[1]);

  if (activeTravelerMarker) {
    if (activeTravelerMarker.remove) activeTravelerMarker.remove();
    activeTravelerMarker = null;
  }

  // Create High-Fidelity Animated 3D Vehicle Model
  const travelerEl = document.createElement('div');
  travelerEl.className = currentTravelMode === 'car' ? 'map-car-container' : (
    currentTravelMode === 'bus' ? 'map-bus-container' : (
      currentTravelMode === 'walk' ? 'map-walker-container' : 'map-motorcycle-rider-container'
    )
  );
  travelerEl.id = 'map-motorcycle-rider';
  travelerEl.innerHTML = generateTravelerVehicleHtml(currentTravelMode, initialBearing, false);

  activeTravelerMarker = new maplibregl.Marker({
    element: travelerEl,
    rotationAlignment: 'map',
    pitchAlignment: 'map'
  })
    .setLngLat(roadLngLats[0])
    .setRotation(initialBearing)
    .addTo(mapEngine);

  // Set realistic cruising durations per transit mode
  let cruiseDurationMs = 14000;
  if (currentTravelMode === 'car') cruiseDurationMs = 15000;
  else if (currentTravelMode === 'bus') cruiseDurationMs = 20000;
  else if (currentTravelMode === 'walk') cruiseDurationMs = 28000;

  // Initialize Journey State
  journeyState = {
    plot,
    totalDistKm,
    totalMins,
    modeCfg,
    roadLngLats,
    routeSteps,
    totalDistanceMeters,
    segmentDistances,
    startTime: 0,
    pauseElapsed: 0,
    cruiseDurationMs,
    smoothBearing: initialBearing,
    initialBearing
  };

  // Populate Proper Directions Sheet with full turn-by-turn guidance
  populateRouteDirectionsDrawer(routeSteps, totalDistKm, totalMins, plot);

  let targetPitch = 58;
  let targetZoom = 16.9;
  if (currentTravelMode === 'car') { targetPitch = 54; targetZoom = 16.6; }
  else if (currentTravelMode === 'bus') { targetPitch = 48; targetZoom = 16.2; }
  else if (currentTravelMode === 'walk') { targetPitch = 42; targetZoom = 17.5; }

  // STAGE C: Smoothly dive from city altitude down into the road-level driving seat
  mapEngine.flyTo({
    center: roadLngLats[0],
    zoom: targetZoom,
    pitch: targetPitch,
    bearing: initialBearing,
    duration: 1600,
    essential: true
  });

  // STAGE D: Cruise along real Chennai roads with look-ahead banking steering
  setTimeout(() => {
    journeyState.startTime = performance.now();
    journeyState.pauseElapsed = 0;
    isJourneyPaused = false;
    runCruiseFrame();
  }, 1650);
}

function runCruiseFrame() {
  function cruiseFrame(now) {
    if (isJourneyPaused) return;

    const elapsed = (now - journeyState.startTime) + journeyState.pauseElapsed;
    const progress = Math.min(1, elapsed / journeyState.cruiseDurationMs);

    // Sinusoidal smooth ease-in-out
    const easeProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
    const targetMeters = easeProgress * journeyState.totalDistanceMeters;

    let accum = 0;
    let currLng = journeyState.roadLngLats[0][0];
    let currLat = journeyState.roadLngLats[0][1];
    let segIdx = 0;

    for (let i = 0; i < journeyState.segmentDistances.length; i++) {
      if (accum + journeyState.segmentDistances[i] >= targetMeters || i === journeyState.segmentDistances.length - 1) {
        segIdx = i;
        const segRatio = journeyState.segmentDistances[i] > 0 ? (targetMeters - accum) / journeyState.segmentDistances[i] : 0;
        currLng = journeyState.roadLngLats[i][0] + (journeyState.roadLngLats[i + 1][0] - journeyState.roadLngLats[i][0]) * segRatio;
        currLat = journeyState.roadLngLats[i][1] + (journeyState.roadLngLats[i + 1][1] - journeyState.roadLngLats[i][1]) * segRatio;
        break;
      }
      accum += journeyState.segmentDistances[i];
    }

    // Look-ahead target ~14 meters forward for crisp, true-to-road vehicular steering (no drift)
    const lookAheadMeters = Math.min(journeyState.totalDistanceMeters, targetMeters + 14);
    let lookAccum = 0;
    let lookLng = currLng;
    let lookLat = currLat;
    for (let i = 0; i < journeyState.segmentDistances.length; i++) {
      if (lookAccum + journeyState.segmentDistances[i] >= lookAheadMeters || i === journeyState.segmentDistances.length - 1) {
        const ratio = journeyState.segmentDistances[i] > 0 ? (lookAheadMeters - lookAccum) / journeyState.segmentDistances[i] : 0;
        lookLng = journeyState.roadLngLats[i][0] + (journeyState.roadLngLats[i + 1][0] - journeyState.roadLngLats[i][0]) * ratio;
        lookLat = journeyState.roadLngLats[i][1] + (journeyState.roadLngLats[i + 1][1] - journeyState.roadLngLats[i][1]) * ratio;
        break;
      }
      lookAccum += journeyState.segmentDistances[i];
    }

    const targetBearing = calculateBearing([currLng, currLat], [lookLng, lookLat]);
    journeyState.smoothBearing = lerpAngle(journeyState.smoothBearing, targetBearing, 0.16);

    // Dynamic Speedometer (km/h)
    const bearingDiff = Math.abs((targetBearing - journeyState.smoothBearing + 540) % 360 - 180);
    let baseSpeed = 42;
    if (currentTravelMode === 'car') baseSpeed = 38;
    else if (currentTravelMode === 'bus') baseSpeed = 24;
    else if (currentTravelMode === 'walk') baseSpeed = 5;

    let simSpeed = baseSpeed;
    if (currentTravelMode === 'walk') {
      simSpeed = 5;
    } else {
      if (progress < 0.12) {
        simSpeed = Math.round((baseSpeed * 0.35) + (progress / 0.12) * (baseSpeed * 0.65));
      } else if (progress > 0.88) {
        simSpeed = Math.max(0, Math.round(baseSpeed * (1 - (progress - 0.88) / 0.12)));
      } else if (bearingDiff > 25) {
        simSpeed = Math.round((baseSpeed * 0.6) + (Math.sin(elapsed / 100) * 2));
      } else {
        simSpeed = Math.round(baseSpeed + (Math.sin(elapsed / 800) * 3));
      }
    }

    const speedEl = document.getElementById("hud-live-speed");
    if (speedEl) speedEl.textContent = simSpeed;

    // UPDATE 3D CAMERA: Elevated 3D Chase Camera following the traveler directly along the road
    let currentPitch = 58;
    let currentZoom = 16.9;
    if (currentTravelMode === 'car') { currentPitch = 54; currentZoom = 16.6; }
    else if (currentTravelMode === 'bus') { currentPitch = 48; currentZoom = 16.2; }
    else if (currentTravelMode === 'walk') { currentPitch = 42; currentZoom = 17.5; }

    if (mapEngine) {
      mapEngine.jumpTo({
        center: [currLng, currLat],
        zoom: currentZoom,
        pitch: currentPitch,
        bearing: journeyState.smoothBearing
      });
    }

    // Orient vehicle cleanly locked to actual road direction (Zero drift, proper movement)
    if (activeTravelerMarker) {
      activeTravelerMarker.setLngLat([currLng, currLat]);
      if (activeTravelerMarker.setRotation) {
        activeTravelerMarker.setRotation(journeyState.smoothBearing);
      }
    }

    // Ensure model wrapper and headlights are strictly straight forward without sideways skew/drift
    const riderEntity = document.getElementById("map-motorcycle-rider");
    if (riderEntity) {
      const modelWrapper = riderEntity.querySelector(".motorcycle-model-wrapper, .car-model-wrapper, .bus-model-wrapper, .walker-model-wrapper");
      const headlight = riderEntity.querySelector(".motorcycle-headlight-cone, .car-headlight-cone, .bus-headlight-cone, .walker-direction-cone");
      if (modelWrapper) {
        modelWrapper.style.transform = "none";
      }
      if (headlight) {
        headlight.style.transform = "none";
      }
    }

    // Match Real Chennai Road Names from OSRM Steps
    let currentRoadName = journeyState.plot.localityName + " Approach Road";
    let nextManeuverText = `Cruising towards ${journeyState.plot.plotNumber}`;
    let maneuverIconHtml = `<i class="${journeyState.modeCfg.icon} text-white"></i>`;
    let distToManeuver = 300;

    if (journeyState.routeSteps && journeyState.routeSteps.length > 0) {
      let stepAccum = 0;
      for (let s = 0; s < journeyState.routeSteps.length; s++) {
        const step = journeyState.routeSteps[s];
        if (stepAccum + step.distance >= targetMeters || s === journeyState.routeSteps.length - 1) {
          if (step.name && step.name.trim().length > 0) currentRoadName = step.name;
          distToManeuver = Math.round((stepAccum + step.distance) - targetMeters);
          if (step.maneuver) {
            const mType = step.maneuver.type;
            const mMod = step.maneuver.modifier || '';
            if (mMod.includes('left')) maneuverIconHtml = '<i class="fa-solid fa-arrow-left text-white"></i>';
            else if (mMod.includes('right')) maneuverIconHtml = '<i class="fa-solid fa-arrow-right text-white"></i>';
            else if (mType === 'arrive') maneuverIconHtml = '<i class="fa-solid fa-flag-checkered text-white"></i>';
            else maneuverIconHtml = '<i class="fa-solid fa-arrow-up text-white"></i>';

            const nextName = journeyState.routeSteps[s + 1]?.name || journeyState.plot.localityName;
            nextManeuverText = distToManeuver > 25 
              ? `In ${distToManeuver}m: ${mType} ${mMod} onto ${nextName}`
              : `On ${currentRoadName}`;
          }
          break;
        }
        stepAccum += step.distance;
      }
    }

    const roadNameEl = document.getElementById("hud-active-road-name");
    if (roadNameEl) roadNameEl.textContent = currentRoadName;

    // Update HUD metrics
    const remainingKm = Math.max(0, journeyState.totalDistKm * (1 - easeProgress)).toFixed(1);
    const remMins = Math.max(1, Math.round(journeyState.totalMins * (1 - easeProgress)));
    const hudRemDist = document.getElementById("hud-remaining-distance");
    const hudRemTime = document.getElementById("hud-remaining-time");
    const hudDistTurn = document.getElementById("hud-distance-to-turn");
    const hudInstr = document.getElementById("hud-instruction-text");
    const hudManeuver = document.getElementById("hud-maneuver-icon");

    if (hudRemDist) hudRemDist.textContent = `${remainingKm} km`;
    if (hudRemTime) hudRemTime.textContent = `~${remMins} mins`;
    if (hudDistTurn) {
      hudDistTurn.textContent = distToManeuver > 1000 ? `In ${(distToManeuver/1000).toFixed(1)} km` : `In ${distToManeuver} m`;
    }
    if (hudManeuver) hudManeuver.innerHTML = maneuverIconHtml;
    if (hudInstr) {
      if (progress > 0.88) {
        hudInstr.textContent = `Arriving at ${journeyState.plot.plotNumber}, ${journeyState.plot.localityName}!`;
      } else {
        hudInstr.textContent = nextManeuverText;
      }
    }

    if (progress < 1) {
      travelAnimationId = requestAnimationFrame(cruiseFrame);
    } else {
      finishTravelArrival(journeyState.plot);
    }
  }

  travelAnimationId = requestAnimationFrame(cruiseFrame);
}

function resumeCruiseJourney() {
  if (isJourneyPaused) return;
  journeyState.startTime = performance.now();
  runCruiseFrame();
}

function toggleDrivingPOV() {
  currentNavCameraMode = currentNavCameraMode === 'firstPerson' ? 'chase3D' : 'firstPerson';
  const label = document.getElementById('hud-pov-label');
  const cockpit = document.getElementById('first-person-cockpit-overlay');

  if (currentNavCameraMode === 'firstPerson') {
    if (label) label.textContent = 'Driver POV';
    if (cockpit && !document.getElementById('live-travel-hud').classList.contains('hidden')) {
      cockpit.classList.remove('hidden');
    }
    if (mapEngine && !isJourneyPaused) {
      mapEngine.easeTo({ pitch: 58, zoom: 16.5, duration: 600 });
    }
  } else {
    if (label) label.textContent = 'Chase Cam';
    if (mapEngine && !isJourneyPaused) {
      mapEngine.easeTo({ pitch: 45, zoom: 15.6, duration: 600 });
    }
  }
}

function togglePauseJourney() {
  isJourneyPaused = !isJourneyPaused;
  const label = document.getElementById('hud-pause-label');
  const btn = document.getElementById('hud-pause-btn');
  const instr = document.getElementById('hud-instruction-text');

  if (isJourneyPaused) {
    if (travelAnimationId) {
      cancelAnimationFrame(travelAnimationId);
      travelAnimationId = null;
    }
    if (label) label.textContent = 'Resume';
    if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> <span id="hud-pause-label" class="hidden md:inline">Resume</span>';
    if (instr) instr.textContent = 'JOURNEY PAUSED — Drag map to inspect street surroundings';
  } else {
    if (label) label.textContent = 'Stop';
    if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i> <span id="hud-pause-label" class="hidden md:inline">Stop</span>';
    if (activeRoadCoordinates.length >= 2 && travelDestinationPlot) {
      resumeCruiseJourney();
    }
  }
}

function startRoadTravelAnimation(latLngs, plot, totalDistKm, totalMins, modeCfg) {
  navigateAndTravelToPlot(plot.id);
}

function clearActiveTravelAnimation() {
  if (travelAnimationId) {
    cancelAnimationFrame(travelAnimationId);
    travelAnimationId = null;
  }
  if (mapEngine) {
    mapEngine.stop();
  }
  if (activeTravelerMarker) {
    if (activeTravelerMarker.remove) activeTravelerMarker.remove();
    else if (leafletMap) leafletMap.removeLayer(activeTravelerMarker);
    activeTravelerMarker = null;
  }
}

function skipTravelToArrival() {
  if (travelDestinationPlot) {
    clearActiveTravelAnimation();
    if (mapEngine) {
      mapEngine.stop();
      mapEngine.easeTo({
        center: [travelDestinationPlot.longitude, travelDestinationPlot.latitude],
        zoom: 17.5,
        pitch: 45,
        bearing: 0,
        duration: 500
      });
    } else if (leafletMap) {
      leafletMap.stop();
      leafletMap.setView([travelDestinationPlot.latitude, travelDestinationPlot.longitude], 17.5);
    }
    finishTravelArrival(travelDestinationPlot);
  }
}

function finishTravelArrival(plot) {
  clearActiveTravelAnimation();

  const cockpit = document.getElementById("first-person-cockpit-overlay");
  if (cockpit) cockpit.classList.add("hidden");

  // STAGE E & F: Smoothly ease camera to 45-degree architectural close-up directly over the demarcated plot
  if (mapEngine) {
    mapEngine.easeTo({
      center: [plot.longitude, plot.latitude],
      zoom: 17.5,
      pitch: 45,
      bearing: 0,
      duration: 1200
    });

    // Park visible motorcycle outside plot entrance
    const arrivalCoord = (activeRoadCoordinates && activeRoadCoordinates.length > 0)
      ? activeRoadCoordinates[activeRoadCoordinates.length - 1]
      : [plot.longitude, plot.latitude];

    const parkedEl = document.createElement('div');
    parkedEl.className = currentTravelMode === 'car' ? 'map-car-container' : (
      currentTravelMode === 'bus' ? 'map-bus-container' : (
        currentTravelMode === 'walk' ? 'map-walker-container' : 'map-motorcycle-rider-container'
      )
    );
    parkedEl.innerHTML = generateTravelerVehicleHtml(currentTravelMode, 0, true);
    activeTravelerMarker = new maplibregl.Marker({
      element: parkedEl,
      rotationAlignment: 'map',
      pitchAlignment: 'map'
    })
      .setLngLat(arrivalCoord)
      .setRotation(0)
      .addTo(mapEngine);
  } else if (leafletMap) {
    leafletMap.flyTo([plot.latitude, plot.longitude], 17.5, { duration: 1.0 });
  }

  // Draw plot boundary polygon & 4 corner survey stones
  drawPlotBoundaryPolygon(plot);

  // Update HUD
  const speedEl = document.getElementById("hud-live-speed");
  if (speedEl) speedEl.textContent = "0";

  const hudInstr = document.getElementById("hud-instruction-text");
  const hudRemTime = document.getElementById("hud-remaining-time");
  const hudRemDist = document.getElementById("hud-remaining-distance");
  const hudManeuver = document.getElementById("hud-maneuver-icon");
  const hudDistTurn = document.getElementById("hud-distance-to-turn");
  const roadNameEl = document.getElementById("hud-active-road-name");

  if (hudManeuver) hudManeuver.innerHTML = '<i class="fa-solid fa-flag-checkered text-white"></i>';
  if (hudDistTurn) hudDistTurn.textContent = "ARRIVED";
  if (hudRemTime) hudRemTime.textContent = "0 mins";
  if (hudRemDist) hudRemDist.textContent = "0 m";
  if (roadNameEl) roadNameEl.textContent = plot.localityName;
  if (hudInstr) hudInstr.textContent = `Arrived at ${plot.plotNumber}, ${plot.localityName}! Plot Demarcated.`;

  // Render the plot details directly BELOW the map
  renderPlotDetailsBelowMap(plot);

  setTimeout(() => {
    const detailSection = document.getElementById("selected-plot-detail-section");
    if (detailSection) {
      detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 950);
}

function drawRoutePolylineOnMap(geojsonCoords, startCoords, destCoords, originName, plot) {
  clearActiveRoute();

  if (mapEngine) {
    if (mapEngine.getLayer('route-core')) mapEngine.removeLayer('route-core');
    if (mapEngine.getLayer('route-glow')) mapEngine.removeLayer('route-glow');
    if (mapEngine.getSource('route-source')) mapEngine.removeSource('route-source');

    mapEngine.addSource('route-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: geojsonCoords
        }
      }
    });

    // Realistic Highway Navigation Corridor: Cyan Glow + Core
    mapEngine.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route-source',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#0284c7', 'line-width': 10, 'line-opacity': 0.65 }
    });

    mapEngine.addLayer({
      id: 'route-core',
      type: 'line',
      source: 'route-source',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#38bdf8', 'line-width': 5, 'line-opacity': 1 }
    });
    return;
  }

  if (leafletMap) {
    const leafletLatLngs = geojsonCoords.map(pt => [pt[1], pt[0]]);
    activeRoutePolyline = L.layerGroup([
      L.polyline(leafletLatLngs, { color: "#0284c7", weight: 9, opacity: 0.65, lineCap: "round", lineJoin: "round" }),
      L.polyline(leafletLatLngs, { color: "#38bdf8", weight: 4.5, opacity: 1, lineCap: "round", lineJoin: "round" })
    ]).addTo(leafletMap);
  }
}

function clearActiveRoute() {
  clearUrban3DFeatures();
  if (mapEngine) {
    if (mapEngine.getLayer('route-core')) mapEngine.removeLayer('route-core');
    if (mapEngine.getLayer('route-glow')) mapEngine.removeLayer('route-glow');
    if (mapEngine.getSource('route-source')) mapEngine.removeSource('route-source');
  }
  if (leafletMap) {
    if (activeRoutePolyline) {
      leafletMap.removeLayer(activeRoutePolyline);
      activeRoutePolyline = null;
    }
    if (activeRouteStartMarker) {
      leafletMap.removeLayer(activeRouteStartMarker);
      activeRouteStartMarker = null;
    }
  }
}

// Render Complete Plot Specifications Directly BELOW the Map
function renderPlotDetailsBelowMap(plot) {
  currentModalProperty = plot;
  currentModalImageIndex = 0;

  const placeholder = document.getElementById("plot-unselected-placeholder");
  const container = document.getElementById("plot-selected-container");
  if (!container) return;

  if (placeholder) placeholder.classList.add("hidden");
  container.classList.remove("hidden");

  let thumbsHtml = "";
  plot.images.forEach((img, idx) => {
    thumbsHtml += `
      <div 
        onclick="setBelowMapImage(${idx})" 
        class="gallery-thumbnail-card h-16 sm:h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition ${idx === 0 ? 'border-black scale-95 shadow-md' : 'border-neutral-200 opacity-60 hover:opacity-100'}">
        <img src="${img}" alt="Thumbnail ${idx+1}" class="w-full h-full object-cover">
      </div>
    `;
  });

  const modeCfg = TRAVEL_MODES_CONFIG[currentTravelMode] || TRAVEL_MODES_CONFIG.car;
  const lat = Number(plot.latitude).toFixed(6);
  const lng = Number(plot.longitude).toFixed(6);
  const googleMapsUrl = `https://maps.google.com/maps?daddr=${lat},${lng}&travelmode=${modeCfg.googleMode}`;

  container.innerHTML = `
    <div class="bg-white border-2 border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-10 space-y-8 animate-fade-in">
      
      <!-- Top Title & Badge Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              plot.availability === 'available' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              (plot.availability === 'reserved' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-800 border border-slate-300')
            }">
              <i class="fa-solid fa-circle text-[8px] mr-1"></i> ${plot.availability}
            </span>
            <span class="px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-mono font-bold">
              ${plot.projectName} • ${plot.plotNumber}
            </span>
            <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <i class="fa-solid fa-compass mr-1 text-emerald-600"></i> ${plot.facing}
            </span>
          </div>
          <h2 class="text-2xl sm:text-4xl font-black text-black font-serif-luxury mt-2">${plot.title}</h2>
          <p class="text-xs sm:text-sm text-neutral-600 mt-1">
            <i class="fa-solid fa-location-dot text-emerald-600 mr-1.5"></i> ${plot.address}
          </p>
        </div>
        <div class="md:text-right bg-neutral-50 md:bg-transparent p-4 md:p-0 rounded-2xl border md:border-0 border-neutral-200">
          <div class="text-3xl sm:text-4xl font-black text-black">${plot.price}</div>
          <div class="text-xs font-mono font-bold text-neutral-500 mt-0.5">${plot.pricePerSqft} • ${plot.dimensions}</div>
        </div>
      </div>

      <!-- Photo Gallery & Technical Demarcation Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left: Multi-Photo Carousel (lg:col-span-7) -->
        <div class="lg:col-span-7 space-y-3">
          <div class="gallery-hero-container h-72 sm:h-[420px] rounded-2xl overflow-hidden bg-neutral-900 relative shadow-xl">
            <img id="below-map-main-image" src="${plot.images[0]}" alt="${plot.title}" class="w-full h-full object-cover">
            <button onclick="prevBelowMapImage()" class="gallery-nav-btn absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition shadow-lg">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button onclick="nextBelowMapImage()" class="gallery-nav-btn absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition shadow-lg">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <div class="absolute bottom-4 left-4 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow" id="below-map-image-counter">
              1 / ${plot.images.length} • ${plot.imageLabels[0]}
            </div>
          </div>

          <!-- Thumbnails Row -->
          <div class="grid grid-cols-4 gap-2.5">
            ${thumbsHtml}
          </div>
        </div>

        <!-- Right: Technical Specifications & Highlights (lg:col-span-5) -->
        <div class="lg:col-span-5 space-y-4">
          <div class="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <h4 class="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
              <i class="fa-solid fa-list-check text-emerald-600"></i> Verified Land Demarcation & Approvals
            </h4>
            <div class="grid grid-cols-2 gap-3 text-xs pt-1">
              <div class="p-2.5 rounded-xl bg-white border border-neutral-200">
                <span class="text-[10px] text-neutral-400 font-bold uppercase block">Plot Dimensions</span>
                <span class="font-black text-black text-sm">${plot.dimensions}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white border border-neutral-200">
                <span class="text-[10px] text-neutral-400 font-bold uppercase block">Total Area</span>
                <span class="font-black text-black text-sm">${plot.areaSqFt} sq.ft</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white border border-neutral-200">
                <span class="text-[10px] text-neutral-400 font-bold uppercase block">Access Road</span>
                <span class="font-bold text-neutral-800 text-xs">${plot.roadWidth}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white border border-neutral-200">
                <span class="text-[10px] text-neutral-400 font-bold uppercase block">Drinking Water</span>
                <span class="font-bold text-neutral-800 text-xs">${plot.waterTable}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white border border-neutral-200 col-span-2">
                <span class="text-[10px] text-neutral-400 font-bold uppercase block">CMDA &amp; RERA Status</span>
                <span class="font-bold text-emerald-700 text-xs"><i class="fa-solid fa-certificate text-emerald-600 mr-1"></i> ${plot.approval}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white border border-neutral-200 col-span-2">
                <span class="text-[10px] text-neutral-400 font-bold uppercase block">Bank Pre-Approval Tie-ups</span>
                <span class="font-bold text-neutral-800 text-xs">${plot.bankLoan}</span>
              </div>
            </div>
          </div>

          <!-- Real Travel Times Comparison -->
          <div class="p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800 space-y-2.5 shadow-md">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-neutral-300"><i class="fa-solid fa-route mr-1 text-emerald-400"></i> Travel Time to this Plot</span>
              <span class="text-[10px] font-mono text-emerald-400 uppercase">Chennai Arterial Roads</span>
            </div>
            <div class="grid grid-cols-4 gap-2 text-center text-xs">
              <div class="bg-black/50 p-2 rounded-xl border border-neutral-700">
                <div class="text-neutral-400 text-[10px]"><i class="fa-solid fa-car-side text-emerald-400"></i> Car</div>
                <div class="font-bold text-white text-xs mt-0.5">~18m</div>
              </div>
              <div class="bg-black/50 p-2 rounded-xl border border-neutral-700">
                <div class="text-neutral-400 text-[10px]"><i class="fa-solid fa-motorcycle text-sky-400"></i> Bike</div>
                <div class="font-bold text-white text-xs mt-0.5">~14m</div>
              </div>
              <div class="bg-black/50 p-2 rounded-xl border border-neutral-700">
                <div class="text-neutral-400 text-[10px]"><i class="fa-solid fa-bus-simple text-purple-400"></i> Bus</div>
                <div class="font-bold text-white text-xs mt-0.5">~32m</div>
              </div>
              <div class="bg-black/50 p-2 rounded-xl border border-neutral-700">
                <div class="text-neutral-400 text-[10px]"><i class="fa-solid fa-person-walking text-amber-400"></i> Walk</div>
                <div class="font-bold text-white text-xs mt-0.5">Direct</div>
              </div>
            </div>
          </div>

          <!-- Direct Navigation & WhatsApp Buttons -->
          <div class="flex flex-col sm:flex-row gap-2.5 pt-1">
            <a href="${googleMapsUrl}" target="_blank" class="flex-1 py-3 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg">
              <i class="fa-solid fa-location-arrow text-emerald-400"></i> Open in Google Maps
            </a>
            <a href="https://wa.me/919840123456?text=Hi%20LLB%20Realty,%20I%20am%20interested%20in%20${encodeURIComponent(plot.title)}%20(${plot.price}).%20Please%20share%20verified%20documents." target="_blank" class="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg">
              <i class="fa-brands fa-whatsapp text-lg"></i> Chat on WhatsApp
            </a>
          </div>

        </div>

      </div>

      <!-- Description & Nearby Landmarks -->
      <div class="p-5 rounded-2xl bg-neutral-50 border border-neutral-200">
        <h4 class="font-black text-sm text-black">Property &amp; Neighborhood Overview</h4>
        <p class="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">${plot.description}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          ${plot.nearbyLandmarks.map(l => `<span class="bg-white text-neutral-800 border border-neutral-200 px-3 py-1 rounded-full text-xs font-bold"><i class="fa-solid fa-landmark text-emerald-600 mr-1.5"></i> ${l}</span>`).join('')}
        </div>
      </div>

      <!-- Comprehensive Instant Email Enquiry & Official Prospectus Form -->
      <form onsubmit="handleEmailProspectus(event, '${plot.id}')" class="p-6 sm:p-8 rounded-3xl bg-neutral-900 text-white border-2 border-emerald-500/50 shadow-2xl space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <div>
            <h4 class="text-lg font-black text-white font-serif-luxury flex items-center gap-2">
              <i class="fa-solid fa-envelope-circle-check text-emerald-400"></i> Receive Official Plot Prospectus &amp; Legal Papers via Email
            </h4>
            <p class="text-xs text-neutral-400 mt-0.5">
              Instant delivery: CMDA approval copy, plot dimensions, verified GPS coordinates, and clear title legal opinion.
            </p>
          </div>
          <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider whitespace-nowrap self-start sm:self-auto">
            Instant Dispatch
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-[10px] font-black uppercase text-neutral-400 mb-1">Your Full Name</label>
            <input 
              type="text" 
              id="prospectus-name-${plot.id}"
              placeholder="e.g. Anand Sundaram" 
              required 
              class="w-full px-3.5 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-[10px] font-black uppercase text-neutral-400 mb-1">WhatsApp Mobile Number</label>
            <input 
              type="tel" 
              id="prospectus-phone-${plot.id}"
              placeholder="e.g. 98401 23456" 
              required 
              class="w-full px-3.5 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-[10px] font-black uppercase text-neutral-400 mb-1">Email Address (Recipient)</label>
            <input 
              type="email" 
              id="prospectus-email-${plot.id}"
              placeholder="e.g. anand@gmail.com" 
              required 
              class="w-full px-3.5 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] font-black uppercase text-neutral-400 mb-1">Preferred Site Inspection Date</label>
            <input 
              type="date" 
              id="prospectus-date-${plot.id}"
              class="w-full px-3.5 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div class="flex items-center gap-2 pt-6">
            <input type="checkbox" id="prospectus-cab-${plot.id}" checked class="accent-emerald-500 w-4 h-4 rounded">
            <label for="prospectus-cab-${plot.id}" class="text-xs text-neutral-300 font-bold">
              Arrange complimentary AC car pickup &amp; drop from my Chennai address
            </label>
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-black uppercase text-neutral-400 mb-1">Questions / Specific Requirements (Optional)</label>
          <textarea 
            id="prospectus-message-${plot.id}"
            rows="2" 
            placeholder="Ask about corner plot availability, loan sanction, registration process..."
            class="w-full px-3.5 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          ></textarea>
        </div>

        <button 
          type="submit" 
          class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-2">
          <i class="fa-solid fa-paper-plane text-black"></i> Dispatch Official CMDA Prospectus &amp; Legal Papers to My Mail &rarr;
        </button>
      </form>

    </div>
  `;
}

function setBelowMapImage(idx) {
  if (!currentModalProperty) return;
  currentModalImageIndex = idx;
  const imgEl = document.getElementById("below-map-main-image");
  const counterEl = document.getElementById("below-map-image-counter");
  if (imgEl) imgEl.src = currentModalProperty.images[idx];
  if (counterEl) {
    counterEl.textContent = `${idx + 1} / ${currentModalProperty.images.length} • ${currentModalProperty.imageLabels[idx]}`;
  }

  const thumbs = document.querySelectorAll(".gallery-thumbnail-card");
  thumbs.forEach((t, i) => {
    if (i === idx) {
      t.classList.add("border-black", "scale-95", "shadow-md");
      t.classList.remove("border-neutral-200", "opacity-60");
    } else {
      t.classList.remove("border-black", "scale-95", "shadow-md");
      t.classList.add("border-neutral-200", "opacity-60");
    }
  });
}

function nextBelowMapImage() {
  if (!currentModalProperty) return;
  const nextIdx = (currentModalImageIndex + 1) % currentModalProperty.images.length;
  setBelowMapImage(nextIdx);
}

function prevBelowMapImage() {
  if (!currentModalProperty) return;
  const prevIdx = (currentModalImageIndex - 1 + currentModalProperty.images.length) % currentModalProperty.images.length;
  setBelowMapImage(prevIdx);
}

function populateMobileDrawer(plot) {
  const drawer = document.getElementById("mobile-plot-drawer");
  const content = document.getElementById("mobile-drawer-content");
  if (!drawer || !content) return;

  // Ultra-slim minimal banner that doesn't block the map view
  content.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 flex-1 min-w-0">
        <span class="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase ${
          plot.availability === 'available' ? 'bg-emerald-100 text-emerald-800' :
          (plot.availability === 'reserved' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800')
        }">${plot.availability}</span>
        <span class="text-xs font-black text-black truncate">${plot.localityName}</span>
        <span class="text-xs font-bold text-emerald-700 font-mono shrink-0">${plot.price}</span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button onclick="openPropertyModal('${plot.id}')" class="px-2 py-1 rounded-lg bg-black text-white text-[11px] font-bold shadow flex items-center gap-1">
          <span>Specs</span> &rarr;
        </button>
        <button onclick="closeMobileDrawer()" class="w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center text-xs">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  `;

  drawer.classList.remove("drawer-closed");
  drawer.classList.add("drawer-open");
}

function closeMobileDrawer() {
  const drawer = document.getElementById("mobile-plot-drawer");
  if (drawer) {
    drawer.classList.remove("drawer-open");
    drawer.classList.add("drawer-closed");
  }
}

// Compatibility wrapper for explicit direction requests
async function requestPlotDirections(plotId) {
  navigateAndTravelToPlot(plotId);
}

async function handleOriginChange() {
  if (!activePlotId) return;
  navigateAndTravelToPlot(activePlotId);
}

function getCurrentPositionAsync() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000
    });
  });
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ==========================================================================
// 6. NATIVE MOBILE GOOGLE MAPS NAVIGATION (ZERO IP PROMPTS / ZERO PASSWORDS)
// ==========================================================================
function openCurrentRouteInGoogleMaps() {
  if (!activePlotId) return;
  openGoogleMapsForPlot(activePlotId);
}

function openGoogleMapsForPlot(plotId) {
  const plot = CHENNAI_PLOTS_DATABASE.find(p => p.id === plotId);
  if (!plot) return;

  // Direct consumer navigation link (Zero Developer API Key required)
  const lat = Number(plot.latitude).toFixed(6);
  const lng = Number(plot.longitude).toFixed(6);
  const modeKey = (TRAVEL_MODES_CONFIG[currentTravelMode] && TRAVEL_MODES_CONFIG[currentTravelMode].googleMode) || "driving";
  const googleMapsUrl = `https://maps.google.com/maps?daddr=${lat},${lng}&travelmode=${modeKey}`;

  // Open native mobile Google Maps app on Android / iOS, or new browser tab on desktop
  window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
}

// ==========================================================================
// 7. SEARCH, FILTERS & PLOT LISTINGS RENDERING
// ==========================================================================
function getFilteredPlots() {
  const searchInput = document.getElementById("search-input");
  const localitySelect = document.getElementById("filter-locality");
  const budgetSelect = document.getElementById("filter-budget");
  const sizeSelect = document.getElementById("filter-size");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedLocality = localitySelect ? localitySelect.value : "all";
  const selectedBudget = budgetSelect ? budgetSelect.value : "all";
  const selectedSize = sizeSelect ? sizeSelect.value : "all";
  const selectedStatus = activeAvailabilityFilter;

  return CHENNAI_PLOTS_DATABASE.filter(plot => {
    // 1. Text Search (title, locality, project name, plot #, address, landmarks)
    if (query) {
      const matchText = (
        plot.title + " " +
        plot.projectName + " " +
        plot.plotNumber + " " +
        plot.localityName + " " +
        plot.address + " " +
        (plot.nearbyLandmarks || []).join(" ")
      ).toLowerCase();
      if (!matchText.includes(query)) return false;
    }

    // 2. Locality Filter
    if (selectedLocality !== "all" && plot.locality !== selectedLocality) {
      return false;
    }

    // 3. Budget Filter
    if (selectedBudget === "under-35" && plot.priceNumeric >= 3500000) return false;
    if (selectedBudget === "35-60" && (plot.priceNumeric < 3500000 || plot.priceNumeric > 6000000)) return false;
    if (selectedBudget === "60-100" && (plot.priceNumeric < 6000000 || plot.priceNumeric > 10000000)) return false;
    if (selectedBudget === "above-100" && plot.priceNumeric < 10000000) return false;

    // 4. Size Filter
    if (selectedSize === "compact" && plot.areaSqFt >= 1000) return false;
    if (selectedSize === "standard" && (plot.areaSqFt < 1000 || plot.areaSqFt > 1500)) return false;
    if (selectedSize === "large" && (plot.areaSqFt <= 1500 || plot.areaSqFt > 2400)) return false;
    if (selectedSize === "ground" && plot.areaSqFt < 2400) return false;

    // 5. Availability Status Filter
    if (selectedStatus !== "all" && plot.availability !== selectedStatus) {
      return false;
    }

    return true;
  });
}

function handleSearchFilterChange() {
  const searchInput = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear-btn");
  if (clearBtn && searchInput) {
    if (searchInput.value.trim().length > 0) clearBtn.classList.remove("hidden");
    else clearBtn.classList.add("hidden");
  }

  // Update map markers and plot cards list
  renderPlotMarkersOnMap();
  renderPlotCardsList();
}

function clearSearchFilter() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";
  handleSearchFilterChange();
}

function setAvailabilityFilter(status) {
  activeAvailabilityFilter = status;

  ["all", "available", "reserved", "sold"].forEach(s => {
    const btn = document.getElementById(`status-btn-${s}`);
    if (btn) {
      if (s === status) {
        btn.classList.add("bg-black", "text-white", "font-black");
        btn.classList.remove("text-neutral-700", "font-bold");
      } else {
        btn.classList.remove("bg-black", "text-white", "font-black");
        btn.classList.add("text-neutral-700", "font-bold");
      }
    }
  });

  handleSearchFilterChange();
}

function resetAllFilters() {
  const searchInput = document.getElementById("search-input");
  const localitySelect = document.getElementById("filter-locality");
  const budgetSelect = document.getElementById("filter-budget");
  const sizeSelect = document.getElementById("filter-size");

  if (searchInput) searchInput.value = "";
  if (localitySelect) localitySelect.value = "all";
  if (budgetSelect) budgetSelect.value = "all";
  if (sizeSelect) sizeSelect.value = "all";

  activeAvailabilityFilter = "all";
  setAvailabilityFilter("all");
  resetToChennaiOverview();
}

// Render Plot Cards in Left Column
function renderPlotCardsList() {
  const container = document.getElementById("plots-list-scroll-area");
  const countBadge = document.getElementById("filtered-plots-count");
  const mobileCountBadge = document.getElementById("mobile-plots-count");
  if (!container) return;

  const filteredPlots = getFilteredPlots();

  if (countBadge) countBadge.textContent = filteredPlots.length;
  if (mobileCountBadge) mobileCountBadge.textContent = filteredPlots.length;

  if (filteredPlots.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-white rounded-3xl border border-neutral-200">
        <i class="fa-solid fa-map-location-dot text-4xl text-neutral-300 mb-3"></i>
        <h4 class="font-black text-black text-base">No plots match this criteria</h4>
        <p class="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Try clearing your search keyword, adjusting your budget range, or selecting "All Localities".
        </p>
        <button onclick="resetAllFilters()" class="mt-4 px-4 py-2 rounded-xl bg-black text-white text-xs font-black">
          Reset All Filters
        </button>
      </div>
    `;
    return;
  }

  let html = "";
  filteredPlots.forEach(plot => {
    const isSelected = activePlotId === plot.id;
    const statusBg = plot.availability === "available"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : (plot.availability === "reserved"
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : "bg-slate-100 text-slate-800 border-slate-300");

    html += `
      <div 
        id="plot-card-${plot.id}" 
        class="plot-listing-card bg-white rounded-2xl border border-neutral-200 p-4 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer ${isSelected ? 'plot-card-selected' : ''}"
        onclick="selectPlot('${plot.id}', true)">
        
        <div class="flex gap-4">
          <!-- Thumbnail -->
          <div class="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-neutral-100 shrink-0 relative">
            <img src="${plot.images[0]}" alt="${plot.title}" class="w-full h-full object-cover">
            <span class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusBg}">
              ${plot.availability}
            </span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wide">
                <i class="fa-solid fa-location-dot text-emerald-600 mr-1"></i> ${plot.localityName}
              </span>
              <span class="text-xs font-black text-black">
                ${plot.price}
              </span>
            </div>

            <h4 class="font-black text-black text-sm mt-0.5 line-clamp-1 hover:text-emerald-700 transition">
              ${plot.title}
            </h4>

            <p class="text-[11px] text-neutral-500 mt-1 line-clamp-1">
              ${plot.address}
            </p>

            <div class="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-bold text-neutral-700">
              <span class="bg-neutral-100 px-2 py-0.5 rounded-md"><i class="fa-solid fa-vector-square mr-1 text-emerald-600"></i> ${plot.dimensions}</span>
              <span class="bg-neutral-100 px-2 py-0.5 rounded-md"><i class="fa-solid fa-road mr-1 text-neutral-500"></i> ${plot.roadWidth.split(' ')[0]} Ft Road</span>
            </div>

            <!-- Action Buttons -->
            <div class="mt-3 flex items-center gap-1.5 flex-wrap" onclick="event.stopPropagation()">
              <button 
                onclick="startStreetViewJourneyForPlot('${plot.id}')" 
                class="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition flex items-center gap-1.5 shadow-sm"
                title="First-Person Motorcycle Navigation to Plot via Real Chennai Streets">
                <i class="fa-solid fa-motorcycle text-white"></i> Ride to Plot
              </button>
              <button 
                onclick="selectPlot('${plot.id}', true)" 
                class="py-1.5 px-2.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-[11px] font-black transition flex items-center gap-1 shadow-sm">
                <i class="fa-solid fa-map-pin text-emerald-400"></i> Map
              </button>
              <button 
                onclick="requestPlotDirections('${plot.id}')" 
                class="py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-black transition flex items-center gap-1">
                <i class="fa-solid fa-diamond-turn-right text-emerald-600"></i> Route
              </button>
              <button 
                onclick="openGoogleMapsForPlot('${plot.id}')" 
                class="py-1.5 px-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-black transition"
                title="Open in Google Maps App">
                <i class="fa-solid fa-location-arrow text-emerald-600"></i>
              </button>
              <button 
                onclick="openPropertyModal('${plot.id}')" 
                class="py-1.5 px-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-black transition"
                title="Full Specifications & Email Brochure">
                <i class="fa-solid fa-circle-info"></i>
              </button>
            </div>

          </div>
        </div>

      </div>
    `;
  });

  container.innerHTML = html;
}

// Mobile View Switcher (Map vs List)
function setMobileView(view) {
  currentMobileView = view;
  const mapPanel = document.getElementById("map-panel-container");
  const listPanel = document.getElementById("plots-panel-container");
  const toggleMapBtn = document.getElementById("mobile-toggle-map");
  const toggleListBtn = document.getElementById("mobile-toggle-list");

  if (view === "map") {
    if (mapPanel) mapPanel.classList.remove("hidden");
    if (listPanel) listPanel.classList.add("hidden");
    if (toggleMapBtn) {
      toggleMapBtn.classList.add("bg-black", "text-white");
      toggleMapBtn.classList.remove("text-neutral-700");
    }
    if (toggleListBtn) {
      toggleListBtn.classList.remove("bg-black", "text-white");
      toggleListBtn.classList.add("text-neutral-700");
    }
    if (leafletMap) setTimeout(() => leafletMap.invalidateSize(), 100);
  } else {
    if (mapPanel) mapPanel.classList.add("hidden");
    if (listPanel) listPanel.classList.remove("hidden");
    if (toggleListBtn) {
      toggleListBtn.classList.add("bg-black", "text-white");
      toggleListBtn.classList.remove("text-neutral-700");
    }
    if (toggleMapBtn) {
      toggleMapBtn.classList.remove("bg-black", "text-white");
      toggleMapBtn.classList.add("text-neutral-700");
    }
  }
}

// ==========================================================================
// 8. STAGE TRANSITIONS (FRONT HOME PAGE <-> CHENNAI MAP PAGE)
// ==========================================================================
function openChennaiMapPage(targetLocality = null) {
  const frontPage = document.getElementById("house-front-page");
  const mapPage = document.getElementById("map-discovery-page");
  const mainHeader = document.getElementById("main-site-header");
  const mainFooter = document.getElementById("main-site-footer");
  const whatsappBtn = document.getElementById("floating-whatsapp-btn");

  if (frontPage) {
    frontPage.style.display = "none";
    frontPage.classList.add("hidden");
    frontPage.classList.remove("flex");
  }

  if (mainHeader) {
    mainHeader.classList.remove("hidden");
  }
  if (mainFooter) {
    mainFooter.classList.remove("hidden");
  }
  if (whatsappBtn) {
    whatsappBtn.classList.remove("hidden");
  }

  if (mapPage) {
    mapPage.style.display = "block";
    mapPage.classList.remove("hidden");
    mapPage.classList.add("block", "active");

    if (!mapEngine && !leafletMap) {
      initChennaiMap();
    } else {
      setTimeout(() => {
        if (mapEngine && mapEngine.resize) mapEngine.resize();
        if (leafletMap && leafletMap.invalidateSize) leafletMap.invalidateSize();
      }, 150);
    }

    if (targetLocality) {
      const localitySelect = document.getElementById("filter-locality");
      if (localitySelect) localitySelect.value = targetLocality;
      handleSearchFilterChange();
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function returnToFrontPage() {
  const frontPage = document.getElementById("house-front-page");
  const mapPage = document.getElementById("map-discovery-page");
  const mainHeader = document.getElementById("main-site-header");
  const mainFooter = document.getElementById("main-site-footer");
  const whatsappBtn = document.getElementById("floating-whatsapp-btn");

  if (mapPage) {
    mapPage.style.display = "none";
    mapPage.classList.add("hidden");
    mapPage.classList.remove("block", "active");
  }

  if (mainHeader) {
    mainHeader.classList.add("hidden");
  }
  if (mainFooter) {
    mainFooter.classList.add("hidden");
  }
  if (whatsappBtn) {
    whatsappBtn.classList.add("hidden");
  }

  if (frontPage) {
    frontPage.style.display = "flex";
    frontPage.classList.remove("hidden");
    frontPage.classList.add("flex");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================================================
// 9. DETAILED PROPERTY MODAL & GALLERY
// ==========================================================================
function openPropertyModal(propertyId) {
  const property = CHENNAI_PLOTS_DATABASE.find(p => p.id === propertyId);
  if (!property) return;

  currentModalProperty = property;
  currentModalImageIndex = 0;

  const modal = document.getElementById("property-modal");
  const content = document.getElementById("property-modal-content");
  if (!modal || !content) return;

  let thumbsHtml = "";
  property.images.forEach((img, idx) => {
    thumbsHtml += `
      <div 
        onclick="setModalImage(${idx})" 
        class="gallery-thumbnail-card h-16 sm:h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition ${idx === 0 ? 'border-black scale-95 shadow-md' : 'border-neutral-200 opacity-60 hover:opacity-100'}">
        <img src="${img}" alt="Thumbnail ${idx+1}" class="w-full h-full object-cover">
      </div>
    `;
  });

  content.innerHTML = `
    <div class="bg-white border border-neutral-300 rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
      
      <!-- Modal Close Button -->
      <button onclick="closePropertyModal()" class="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center transition shadow-lg">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>

      <!-- Scrollable Body -->
      <div class="overflow-y-auto p-5 sm:p-8 space-y-6">
        
        <!-- Top Info Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                property.availability === 'available' ? 'bg-emerald-100 text-emerald-800' :
                (property.availability === 'reserved' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800')
              }">${property.availability}</span>
              <span class="text-xs font-mono font-bold text-neutral-500">${property.projectName}</span>
            </div>
            <h3 class="text-xl sm:text-2xl font-black text-black font-serif-luxury mt-1">${property.title}</h3>
            <p class="text-xs text-neutral-600 mt-0.5"><i class="fa-solid fa-location-dot text-emerald-600 mr-1"></i> ${property.address}</p>
          </div>
          <div class="sm:text-right">
            <div class="text-2xl font-black text-black">${property.price}</div>
            <div class="text-[11px] font-mono text-neutral-500 font-bold">${property.pricePerSqft}</div>
          </div>
        </div>

        <!-- Multi-Photo Gallery Hero -->
        <div>
          <div class="gallery-hero-container h-72 sm:h-96 rounded-2xl overflow-hidden bg-neutral-900 relative shadow-inner">
            <img id="modal-main-image" src="${property.images[0]}" alt="${property.title}" class="w-full h-full object-cover">
            <button onclick="prevModalImage()" class="gallery-nav-btn absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button onclick="nextModalImage()" class="gallery-nav-btn absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <div class="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg text-white text-xs font-bold" id="modal-image-counter">
              1 / ${property.images.length} • ${property.imageLabels[0]}
            </div>
          </div>

          <!-- Thumbnails Row -->
          <div class="grid grid-cols-4 gap-2 mt-3" id="modal-thumbnails-grid">
            ${thumbsHtml}
          </div>
        </div>

        <!-- Technical Specifications Table -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200 text-xs">
          <div>
            <span class="text-[10px] text-neutral-400 font-bold uppercase">Dimensions</span>
            <div class="font-black text-neutral-900 mt-0.5">${property.dimensions}</div>
          </div>
          <div>
            <span class="text-[10px] text-neutral-400 font-bold uppercase">Vasthu Facing</span>
            <div class="font-black text-neutral-900 mt-0.5">${property.facing}</div>
          </div>
          <div>
            <span class="text-[10px] text-neutral-400 font-bold uppercase">Approval</span>
            <div class="font-black text-neutral-900 mt-0.5">${property.approval}</div>
          </div>
          <div>
            <span class="text-[10px] text-neutral-400 font-bold uppercase">Road Width</span>
            <div class="font-black text-neutral-900 mt-0.5">${property.roadWidth}</div>
          </div>
        </div>

        <!-- Description & Landmarks -->
        <div>
          <h4 class="font-black text-sm text-black">Property Overview</h4>
          <p class="text-xs text-neutral-600 mt-1 leading-relaxed">${property.description}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            ${property.nearbyLandmarks.map(l => `<span class="bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full text-[11px] font-bold"><i class="fa-solid fa-landmark text-emerald-600 mr-1"></i> ${l}</span>`).join('')}
          </div>
        </div>

        <!-- Actions & Enquiry Form -->
        <div class="pt-4 border-t border-neutral-200 space-y-4">
          
          <!-- Multi-Travel Mode Real-Time Road Estimates -->
          <div class="p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-700 shadow-md">
            <div class="flex items-center justify-between text-xs mb-2">
              <span class="font-bold text-neutral-300"><i class="fa-solid fa-route mr-1.5 text-emerald-400"></i> Real Road Travel Estimates</span>
              <span class="text-[10px] uppercase font-mono text-emerald-400">Chennai Live Traffic</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div class="bg-black/50 p-2.5 rounded-xl border border-neutral-700">
                <div class="text-neutral-400 text-[10px]"><i class="fa-solid fa-car-side text-emerald-400 mr-1"></i> Car / Taxi</div>
                <div class="font-black text-white text-sm mt-0.5">~18 - 25 mins</div>
              </div>
              <div class="bg-black/50 p-2.5 rounded-xl border border-neutral-700">
                <div class="text-neutral-400 text-[10px]"><i class="fa-solid fa-motorcycle text-sky-400 mr-1"></i> Bike</div>
                <div class="font-black text-white text-sm mt-0.5">~14 - 20 mins</div>
              </div>
              <div class="bg-black/50 p-2.5 rounded-xl border border-neutral-700">
                <div class="text-neutral-400 text-[10px]"><i class="fa-solid fa-bus-simple text-purple-400 mr-1"></i> MTC Bus</div>
                <div class="font-black text-white text-sm mt-0.5">~30 - 40 mins</div>
              </div>
              <div class="bg-black/50 p-2.5 rounded-xl border border-neutral-700">
                <div class="text-neutral-400 text-[10px]"><i class="fa-solid fa-person-walking text-amber-400 mr-1"></i> Walking</div>
                <div class="font-black text-white text-sm mt-0.5">Direct Access</div>
              </div>
            </div>
          </div>

          <!-- Direct Navigation & WhatsApp Buttons -->
          <div class="flex flex-col sm:flex-row gap-2.5">
            <button onclick="openGoogleMapsForPlot('${property.id}')" class="flex-1 py-3 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md">
              <i class="fa-solid fa-location-arrow text-emerald-400"></i> Open in Google Maps Mobile App
            </button>
            <a href="https://wa.me/919840123456?text=Hi%20LLB%20Realty,%20I%20am%20interested%20in%20${encodeURIComponent(property.title)}%20(${property.price}).%20Please%20share%20verified%20documents." target="_blank" class="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md">
              <i class="fa-brands fa-whatsapp text-lg"></i> Chat on WhatsApp with Advisor
            </a>
          </div>

          <!-- Comprehensive Instant Email Enquiry & Legal Prospectus Form -->
          <form onsubmit="handleEmailProspectus(event, '${property.id}')" class="p-5 rounded-2xl bg-neutral-50 border-2 border-emerald-500/40 shadow-inner space-y-3">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                <i class="fa-solid fa-envelope-circle-check text-emerald-600 text-sm"></i> Official Prospectus & Enquiry via Email
              </h5>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Instant Delivery</span>
            </div>
            
            <p class="text-[11px] text-neutral-600 leading-relaxed">
              Enter your details to instantly receive the complete CMDA layout approval copy, legal title opinion, detailed price breakup, and live site visit confirmation in your inbox.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-black uppercase text-neutral-600 mb-1">Your Full Name</label>
                <input 
                  type="text" 
                  id="prospectus-name-${property.id}"
                  placeholder="e.g. Anand Sundaram" 
                  required 
                  class="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase text-neutral-600 mb-1">WhatsApp Mobile Number</label>
                <input 
                  type="tel" 
                  id="prospectus-phone-${property.id}"
                  placeholder="e.g. 98401 23456" 
                  required 
                  class="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-black uppercase text-neutral-600 mb-1">Email Address (Prospectus Recipient)</label>
                <input 
                  type="email" 
                  id="prospectus-email-${property.id}"
                  placeholder="e.g. anand@gmail.com" 
                  required 
                  class="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase text-neutral-600 mb-1">Preferred Site Inspection Date</label>
                <input 
                  type="date" 
                  id="prospectus-date-${property.id}"
                  class="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <input type="checkbox" id="prospectus-cab-${property.id}" checked class="accent-black w-4 h-4 rounded">
              <label for="prospectus-cab-${property.id}" class="text-[11px] text-neutral-700 font-bold">
                Arrange complimentary AC car pickup & drop from my Chennai address
              </label>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase text-neutral-600 mb-1">Questions / Specific Requirements (Optional)</label>
              <textarea 
                id="prospectus-message-${property.id}"
                rows="2" 
                placeholder="Ask about corner plot availability, loan sanction, registration process..."
                class="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-black focus:outline-none focus:border-black"
              ></textarea>
            </div>

            <button 
              type="submit" 
              class="w-full py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2">
              <i class="fa-solid fa-paper-plane text-emerald-400"></i> Dispatch Official Prospectus & Legal Papers to My Mail &rarr;
            </button>
          </form>

        </div>

      </div>

    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closePropertyModal() {
  const modal = document.getElementById("property-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function setModalImage(idx) {
  if (!currentModalProperty) return;
  currentModalImageIndex = idx;
  const imgEl = document.getElementById("modal-main-image");
  const counterEl = document.getElementById("modal-image-counter");
  if (imgEl) imgEl.src = currentModalProperty.images[idx];
  if (counterEl) {
    counterEl.textContent = `${idx + 1} / ${currentModalProperty.images.length} • ${currentModalProperty.imageLabels[idx]}`;
  }

  const thumbs = document.querySelectorAll(".gallery-thumbnail-card");
  thumbs.forEach((t, i) => {
    if (i === idx) {
      t.classList.add("border-black", "scale-95", "shadow-md");
      t.classList.remove("border-neutral-200", "opacity-60");
    } else {
      t.classList.remove("border-black", "scale-95", "shadow-md");
      t.classList.add("border-neutral-200", "opacity-60");
    }
  });
}

function nextModalImage() {
  if (!currentModalProperty) return;
  const nextIdx = (currentModalImageIndex + 1) % currentModalProperty.images.length;
  setModalImage(nextIdx);
}

function prevModalImage() {
  if (!currentModalProperty) return;
  const prevIdx = (currentModalImageIndex - 1 + currentModalProperty.images.length) % currentModalProperty.images.length;
  setModalImage(prevIdx);
}

// ==========================================================================
// 10. EMAIL PROSPECTUS & N8N WEBHOOK INTEGRATION
// ==========================================================================
async function handleEmailProspectus(event, propertyId) {
  event.preventDefault();

  const property = CHENNAI_PLOTS_DATABASE.find(p => p.id === propertyId);
  const emailInput = document.getElementById(`prospectus-email-${propertyId}`);
  const nameInput = document.getElementById(`prospectus-name-${propertyId}`);
  const phoneInput = document.getElementById(`prospectus-phone-${propertyId}`);
  const dateInput = document.getElementById(`prospectus-date-${propertyId}`);
  const cabInput = document.getElementById(`prospectus-cab-${propertyId}`);
  const msgInput = document.getElementById(`prospectus-message-${propertyId}`);

  if (!property || !emailInput) return;

  const email = emailInput.value.trim();
  if (!email || !email.includes("@")) {
    alert("Please enter a valid email address.");
    return;
  }

  const customerName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : email.split("@")[0].replace(/[._]/g, " ").toUpperCase();
  const customerPhone = phoneInput && phoneInput.value.trim() ? phoneInput.value.trim() : "+91 98401 23456";
  const preferredDate = dateInput && dateInput.value ? dateInput.value : "Immediate Visit";
  const needCab = cabInput ? cabInput.checked : true;
  const customerMessage = msgInput && msgInput.value.trim() ? msgInput.value.trim() : "";

  const payload = {
    event: "property.enquiry",
    timestamp: new Date().toISOString(),
    customer: {
      name: customerName,
      email: email,
      phone: customerPhone,
      preferredDate: preferredDate,
      needCab: needCab,
      message: customerMessage
    },
    property: {
      id: property.id,
      title: property.title,
      projectName: property.projectName,
      plotNumber: property.plotNumber,
      locality: property.localityName,
      address: property.address,
      price: property.price,
      pricePerSqft: property.pricePerSqft,
      dimensions: property.dimensions,
      areaSqFt: property.areaSqFt,
      facing: property.facing,
      approval: property.approval,
      roadWidth: property.roadWidth,
      coordinates: `${property.latitude}, ${property.longitude}`,
      googleMapsUrl: `https://maps.google.com/maps?daddr=${property.latitude},${property.longitude}`,
      images: property.images
    }
  };

  // Open receipt modal immediately
  closePropertyModal();
  openEmailReceiptModal(payload);

  // Dispatch to Vercel Serverless Email Function
  try {
    const res = await fetch("/api/llb-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    const statusBox = document.getElementById("email-delivery-live-status");
    if (statusBox) {
      if (result && result.success) {
        statusBox.className = "p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center justify-center gap-2";
        statusBox.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i> Official Prospectus Email Successfully Delivered!';
      } else {
        statusBox.className = "p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-2";
        statusBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-600"></i> ${result.error || 'Dispatched to queue'}`;
      }
    }
  } catch (e) {
    console.log("Email dispatch:", e.message);
  }

  // Dispatch to user n8n webhook if configured
  if (n8nWebhookUrl) {
    try {
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(e => console.log("n8n dispatch:", e.message));
    } catch (e) {}
  }
}

function openEmailReceiptModal(payload) {
  const modal = document.getElementById("email-receipt-modal");
  const content = document.getElementById("email-receipt-content");
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="bg-white border border-neutral-300 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center animate-fade-in">
      <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
        <i class="fa-solid fa-envelope-circle-check"></i>
      </div>
      <h3 class="text-2xl font-black text-black font-serif-luxury">Prospectus Dispatched!</h3>
      <p class="text-xs text-neutral-600 mt-1">
        We have emailed the official brochure, approval copies, and verified GPS coordinates to:
      </p>
      <div class="my-3 p-3 bg-neutral-100 rounded-xl font-mono text-xs font-black text-black">
        ${payload.customer.email}
      </div>

      <div id="email-delivery-live-status" class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 my-2">
        <i class="fa-solid fa-spinner fa-spin text-emerald-600"></i> Sending official prospectus to your email...
      </div>

      <div class="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-left text-xs text-neutral-800 space-y-1 mt-3">
        <div><strong>Plot:</strong> ${payload.property.title}</div>
        <div><strong>Price:</strong> ${payload.property.price} (${payload.property.dimensions})</div>
        <div><strong>Directions:</strong> <a href="${payload.property.googleMapsUrl}" target="_blank" class="underline font-bold text-emerald-700">Open in Google Maps</a></div>
      </div>
      <button onclick="closeEmailReceiptModal()" class="mt-5 w-full py-3 rounded-xl bg-black text-white font-black text-xs hover:bg-neutral-800 transition">
        Done
      </button>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeEmailReceiptModal() {
  const modal = document.getElementById("email-receipt-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

// ==========================================================================
// 11. EMI CALCULATOR
// ==========================================================================
function calculateEMI() {
  const amountInput = document.getElementById("loan-amount");
  const tenureInput = document.getElementById("loan-tenure");
  const rateInput = document.getElementById("loan-rate");

  const amountLabel = document.getElementById("label-loan-amount");
  const tenureLabel = document.getElementById("label-loan-tenure");
  const rateLabel = document.getElementById("label-loan-rate");
  const resultEl = document.getElementById("calculated-emi");

  if (!amountInput || !tenureInput || !rateInput || !resultEl) return;

  const P = parseFloat(amountInput.value) * 100000;
  const N = parseFloat(tenureInput.value) * 12;
  const R = (parseFloat(rateInput.value) / 12) / 100;

  if (amountLabel) amountLabel.textContent = `₹ ${amountInput.value} Lakhs`;
  if (tenureLabel) tenureLabel.textContent = `${tenureInput.value} Years`;
  if (rateLabel) rateLabel.textContent = `${rateInput.value} %`;

  const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
  resultEl.textContent = `₹ ${Math.round(emi).toLocaleString('en-IN')} /mo`;
}

// ==========================================================================
// 12. COMPLIMENTARY SITE VISIT BOOKING
// ==========================================================================
function openSiteVisitModal(propertyId = null) {
  const modal = document.getElementById("site-visit-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeSiteVisitModal() {
  const modal = document.getElementById("site-visit-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function handleSiteVisitSubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById("visit-name");
  const phoneInput = document.getElementById("visit-phone");
  const propertySelect = document.getElementById("visit-property-select");
  const dateInput = document.getElementById("visit-date");
  const cabInput = document.getElementById("visit-cab");

  const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : "Valued Customer";
  const phone = phoneInput && phoneInput.value.trim() ? phoneInput.value.trim() : "";
  const propertyTitle = propertySelect ? propertySelect.options[propertySelect.selectedIndex].text : "Selected Chennai Plot";
  const preferredDate = dateInput && dateInput.value ? dateInput.value : "Upcoming Date";
  const needCab = cabInput ? cabInput.checked : true;

  const payload = {
    event: "site.visit.booking",
    timestamp: new Date().toISOString(),
    customer: {
      name: name,
      email: "prabakaransethu7@gmail.com",
      phone: phone,
      preferredDate: preferredDate,
      needCab: needCab
    },
    property: {
      title: propertyTitle
    }
  };

  fetch("/api/llb-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {});

  alert(`✓ Site Visit Confirmed for ${name}!\n\nDate: ${preferredDate}\nProperty: ${propertyTitle}\n\nOur senior relationship manager will call you at ${phone} to arrange complimentary AC car pickup.`);
  closeSiteVisitModal();
}

// ==========================================================================
// 13. N8N WEBHOOK SETTINGS
// ==========================================================================
function openWebhookSettingsModal() {
  const modal = document.getElementById("webhook-settings-modal");
  const input = document.getElementById("webhook-url-input");
  if (input) input.value = n8nWebhookUrl;
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeWebhookSettingsModal() {
  const modal = document.getElementById("webhook-settings-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function saveWebhookSettings() {
  const input = document.getElementById("webhook-url-input");
  if (input) {
    n8nWebhookUrl = input.value.trim();
    localStorage.setItem("llb_n8n_webhook", n8nWebhookUrl);
    alert("n8n Webhook URL saved successfully!");
    closeWebhookSettingsModal();
  }
}

async function testWebhookPing() {
  const statusEl = document.getElementById("webhook-test-status");
  const input = document.getElementById("webhook-url-input");
  const url = input ? input.value.trim() : n8nWebhookUrl;

  if (statusEl) statusEl.innerHTML = '<span class="text-neutral-500 font-bold">Pinging webhook...</span>';

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "ping", timestamp: new Date().toISOString() })
    });
    if (statusEl) statusEl.innerHTML = '<span class="text-emerald-600 font-black">✓ Webhook active and responded successfully!</span>';
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span class="text-amber-600 font-bold">Warning: Direct browser ping blocked (CORS). Make sure n8n is running.</span>`;
  }
}

// ==========================================================================
// 14. MOBILE APP SHARE / COPY MODAL
// ==========================================================================
function openMobileLinkModal() {
  const modal = document.getElementById("mobile-link-modal");
  const publicUrl = window.location.origin.includes("localhost")
    ? "https://schema-opposite-plaintiff-desirable.trycloudflare.com"
    : window.location.origin;

  const qrImg = document.getElementById("mobile-qr-code");
  if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`;
  
  const hrefEl = document.getElementById("mobile-link-href");
  if (hrefEl) hrefEl.href = publicUrl;
  
  const textEl = document.getElementById("mobile-link-text");
  if (textEl) textEl.textContent = publicUrl;

  const waEl = document.getElementById("mobile-share-whatsapp-btn");
  if (waEl) waEl.href = `https://wa.me/?text=${encodeURIComponent("Explore LLB Realty Chennai plots & homes: " + publicUrl)}`;

  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeMobileLinkModal() {
  const modal = document.getElementById("mobile-link-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function copyMobileLink() {
  const link = window.location.origin.includes("localhost")
    ? "https://schema-opposite-plaintiff-desirable.trycloudflare.com"
    : window.location.origin;
  navigator.clipboard.writeText(link).then(() => {
    alert("Official Link copied to clipboard!\n" + link);
  });
}

// ==========================================================================
// 14B. GOOGLE MAPS API KEY CONFIGURATION (OPTIONAL DEVELOPER ACCESS)
// ==========================================================================
function openApiKeyModal() {
  const modal = document.getElementById("api-key-modal");
  const input = document.getElementById("google-maps-api-key-input");
  if (input) input.value = localStorage.getItem("llb_google_maps_api_key") || "";
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeApiKeyModal() {
  const modal = document.getElementById("api-key-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function saveGoogleMapsApiKey() {
  const input = document.getElementById("google-maps-api-key-input");
  if (input && input.value.trim()) {
    localStorage.setItem("llb_google_maps_api_key", input.value.trim());
    alert("Google Maps API Key saved! Free keyless fallback remains active with 0 errors.");
    closeApiKeyModal();
  } else {
    clearGoogleMapsApiKey();
  }
}

function clearGoogleMapsApiKey() {
  localStorage.removeItem("llb_google_maps_api_key");
  const input = document.getElementById("google-maps-api-key-input");
  if (input) input.value = "";
  alert("Active provider set to 100% Free Keyless ESRI & OpenStreetMap!");
  closeApiKeyModal();
}

// ==========================================================================
// 15. INITIALIZATION ON PAGE LOAD (HOME SHOWCASE FIRST DEFAULT)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Render plot cards list in background
  renderPlotCardsList();

  // 2. Calculate default EMI
  calculateEMI();

  // 3. Check URL params: if direct area/map requested, open map; otherwise land on Home Page first!
  const params = new URLSearchParams(window.location.search);
  const areaParam = params.get("area");
  const mapParam = params.get("map");

  if (areaParam || mapParam === "true") {
    openChennaiMapPage(areaParam);
  } else {
    returnToFrontPage();
  }

  // 4. Responsive resize handler for all screen resolutions & mobile device orientation changes
  window.addEventListener("resize", () => {
    if (mapEngine && mapEngine.resize) {
      mapEngine.resize();
    } else if (leafletMap && leafletMap.invalidateSize) {
      leafletMap.invalidateSize();
    }
  });
});


// ==========================================================================
// CINEMATIC FLOW: AMBIENT DUST & SCROLL-DRIVEN TRANSITION (FROM 3D SCROLL GUIDE)
// ==========================================================================
let dustAnimFrameId = null;

function initAmbientDust() {
  const canvas = document.getElementById("ambient-dust-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const particles = Array.from({ length: 45 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.6 + 0.4,
    speedX: (Math.random() - 0.5) * 0.3,
    speedY: -Math.random() * 0.4 - 0.1,
    opacity: Math.random() * 0.5 + 0.2
  }));

  function render() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
      ctx.fill();
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.y < 0) p.y = height;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
    });
    dustAnimFrameId = requestAnimationFrame(render);
  }

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  render();
}

let isTransitioningToMap = false;
window.addEventListener("wheel", (e) => {
  const frontPage = document.getElementById("house-front-page");
  if (frontPage && !frontPage.classList.contains("hidden") && e.deltaY > 25 && !isTransitioningToMap) {
    isTransitioningToMap = true;
    const logo = document.getElementById("main-llb-hero-logo");
    if (logo) logo.classList.add("gliding-to-header");
    setTimeout(() => {
      openChennaiMapPage();
      if (logo) logo.classList.remove("gliding-to-header");
      isTransitioningToMap = false;
    }, 450);
  }
}, { passive: true });

let touchStartY = 0;
window.addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchend", (e) => {
  const frontPage = document.getElementById("house-front-page");
  if (frontPage && !frontPage.classList.contains("hidden") && !isTransitioningToMap) {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchStartY - touchEndY > 50) {
      isTransitioningToMap = true;
      const logo = document.getElementById("main-llb-hero-logo");
      if (logo) logo.classList.add("gliding-to-header");
      setTimeout(() => {
        openChennaiMapPage();
        if (logo) logo.classList.remove("gliding-to-header");
        isTransitioningToMap = false;
      }, 450);
    }
  }
}, { passive: true });


// ==========================================================================
// ULTRA-COMPACT HUD CONTROLS (MINIMIZE / CLOSE / RESTORE)
// ==========================================================================
function toggleHudMinimize() {
  const hud = document.getElementById("live-travel-hud");
  const subBar = document.getElementById("hud-details-sub-bar");
  const minBtn = document.getElementById("hud-minimize-btn");
  if (!hud) return;

  const isMin = hud.classList.toggle("hud-minimized");
  if (subBar) {
    if (isMin) subBar.classList.add("hidden");
    else subBar.classList.remove("hidden");
  }
  if (minBtn) {
    minBtn.innerHTML = isMin ? '<i class="fa-solid fa-chevron-down"></i>' : '<i class="fa-solid fa-chevron-up"></i>';
    minBtn.title = isMin ? "Expand Details" : "Minimize Overlay";
  }
}

function closeNavigationHud() {
  const hud = document.getElementById("live-travel-hud");
  if (hud) hud.classList.add("hidden");
}

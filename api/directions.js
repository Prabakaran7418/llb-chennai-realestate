module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { startLat, startLng, destLat, destLng } = req.query;

  if (!startLat || !startLng || !destLat || !destLng) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;

  try {
    const fetchRes = await fetch(osrmUrl);
    const data = await fetchRes.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

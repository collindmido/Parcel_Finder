// Initialize the map with City Centre, City of Nairobi coordinates
const map = L.map("map").setView([-1.286389, 36.817223], 11);

// Add Google Maps satellite layer
L.tileLayer("http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
  maxZoom: 19,
  subdomains: ["mt0", "mt1", "mt2", "mt3"],
}).addTo(map);

// Utility function to create and add GeoJSON layer
function addGeoJsonLayer(url, style, fitBounds = false) {
  fetch(url)
    .then((response) => response.json())
    .then((geojson) => {
      const layer = L.geoJSON(geojson, { style }).addTo(map);
      if (fitBounds) map.fitBounds(layer.getBounds());
      return layer;
    })
    .catch((error) => console.error(`Error loading GeoJSON from ${url}:`, error));
}

// Add City Boundary layer
addGeoJsonLayer("data/cityBoundary.geojson", {
  color: "Blue",
  weight: 2,
  dashArray: "5,5",
  fillOpacity: 0.1,
}, true);

// Load parcels GeoJSON and handle search
function handleParcelsGeoJson(url) {
  fetch(url)
    .then((response) => response.json())
    .then((geojson) => {
      const geoJsonLayer = L.geoJSON(geojson, { style: () => ({ opacity: 0, weight: 0 }) }).addTo(map);
      const featureLayers = geoJsonLayer.getLayers();
      let selectedLayer = null;

      // Populate the autocomplete list with unique Plot_No
      const plotNumbers = Array.from(new Set(featureLayers.map((layer) => layer.feature.properties.Plot_No)));
      const searchBar = document.getElementById("searchBar");
      const autoCompleteList = document.getElementById("autoComplete");

      searchBar.addEventListener("input", function () {
        const query = searchBar.value.trim().toLowerCase();
        autoCompleteList.innerHTML = "";
        if (query !== "") {
          plotNumbers
            .filter((plot) => plot.toLowerCase().includes(query))
            .forEach((plot) => {
              const option = document.createElement("div");
              option.textContent = plot;
              option.classList.add("autocomplete-item");
              option.addEventListener("click", () => selectPolygon(plot));
              autoCompleteList.appendChild(option);
            });
        }
      });

      // Function to handle polygon selection with smooth zoom and restore color
      function selectPolygon(plotNo) {
        searchBar.value = plotNo;
        autoCompleteList.innerHTML = "";

        featureLayers.forEach((layer) => {
          if (layer.feature.properties.Plot_No === plotNo) {
            // Restore the color of the previously selected polygon
            if (selectedLayer && selectedLayer !== layer) {
              selectedLayer.setStyle({ opacity: 0, weight: 0 });
            }

            // Highlight the new selected polygon
            layer.setStyle({ opacity: 1, weight: 2, color: "blue" });

            // Smooth transition to polygon
            map.flyToBounds(layer.getBounds(), {
              duration: 3.75, // Smooth animation duration
              easeLinearity: 0.25,
            });

            // Add click event for popup
            if (selectedLayer) selectedLayer.off("click");
            layer.on("click", function () {
              let popupContent = `<div class="popup-content">
                <b class="popup-title"><p><u>PARCEL DETAILS</u></p> ${plotNo}</b><br>`;
              Object.entries(layer.feature.properties).forEach(([key, value]) => {
                if (key !== "Plot_No") popupContent += `<br><b>${key}:</b> ${value}`;
              });
              popupContent += `</div>`;
              layer.bindPopup(popupContent, { className: "custom-popup" }).openPopup();
            });

            // Store the newly selected layer
            selectedLayer = layer;
          } else {
            layer.setStyle({ opacity: 0, weight: 0 }); // Hide non-selected layers
          }
        });
      }

      // Clear selection when clicking outside polygons
      map.on("click", function (e) {
        let insidePolygon = false;
        featureLayers.forEach((layer) => {
          if (layer.getBounds().contains(e.latlng)) insidePolygon = true;
        });

        if (!insidePolygon) {
          if (selectedLayer) {
            selectedLayer.setStyle({ opacity: 0, weight: 0 });
            selectedLayer = null;
          }
          map.closePopup();
          map.setView([-1.286389, 36.817223], 11); // Reset to initial view
        }
      });
    })
    .catch((error) => console.error("Error loading parcels GeoJSON:", error));
}

// Load and handle parcels GeoJSON
handleParcelsGeoJson("data/parcels.geojson");

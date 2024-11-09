import leaflet from "leaflet";

//test commit comment
console.log("test\n");

// Style sheets
import "leaflet/dist/leaflet.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

import "./style.css";

// Deterministic random number generator
import luck from "./luck.ts";

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("Player");
playerMarker.addTo(map);

let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;

statusPanel.innerHTML = "You have 0 points";

// Cache Loactions
/*class cacheLocations {
  private static cacheLocationMap: Map<string, leaflet.LatLng> = new Map();
  public static getCacheLocation(lat: number, lng: number): leaflet.LatLng {
    const key = `${lat}, ${lng}`;
    if (!cacheLocations.cacheLocationMap.has(key)) {
      const newLocation = leaflet.latLng(lat, lng);
      cacheLocations.cacheLocationMap.set(key, newLocation);
      return newLocation;
    }
    return cacheLocations.cacheLocationMap.get(key)!;

}*/

function spawnCache(i: number, j: number) {
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    let pointValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>There is a cache here at "${i},${j}". It has value <span id="value">${pointValue}</span>.</div>
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>`;

    // Collect Button and updating text for collection
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        pointValue--;
        playerPoints++;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          pointValue.toString();
        if (playerPoints == 1) {
          statusPanel.innerHTML =
            `You have ${playerPoints} point. Collect more around the map and deposit them too!`;
        } else {
          statusPanel.innerHTML =
            `You have ${playerPoints} points. Collect more around the map and deposit them too!`;
        }
      });

    // Deposit Button and updating text for deposit
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        pointValue++;
        playerPoints--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          pointValue.toString();
        if (playerPoints == 0) {
          statusPanel.innerHTML = `You have ${playerPoints} points.`;
        } else if (playerPoints == 1) {
          statusPanel.innerHTML =
            `You have ${playerPoints} point. Collect more around the map and deposit them too!`;
        } else {
          statusPanel.innerHTML =
            `You have ${playerPoints} points. Collect more around the map and deposit them too!`;
        }
      });

    return popupDiv;
  });
}
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}

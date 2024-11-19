import leaflet from "leaflet";

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
const cacheMementos = new Map<string, { pointValue: number; coins: Coin[] }>();

interface Cell {
  i: number;
  j: number;
  rectangle: leaflet.Rectangle;
  coins: Coin[];
}

const collectedCoins: Coin[] = [];

interface Coin {
  i: number;
  j: number;
  serial: number;
}

const playerPosition = JSON.parse(
  localStorage.getItem("playerPosition") ||
    JSON.stringify({
      lat: OAKES_CLASSROOM.lat,
      lng: OAKES_CLASSROOM.lng,
    })
);

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

const playerMarker = leaflet.marker(playerPosition);
playerMarker.bindTooltip("Player");
playerMarker.addTo(map);

let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;

statusPanel.innerHTML = "You have 0 points";

// Cache Locations
class CacheLocations {
  private static cacheLocationMap: Map<string, leaflet.LatLng> = new Map();
  public static getCacheLocation(lat: number, lng: number): leaflet.LatLng {
    const key = `${lat},${lng}`;
    if (!CacheLocations.cacheLocationMap.has(key)) {
      const newLocation = leaflet.latLng(lat, lng);
      CacheLocations.cacheLocationMap.set(key, newLocation);
      return newLocation;
    }
    return CacheLocations.cacheLocationMap.get(key)!;
  }
}

// Coin class and constructor
class Coin {
  id: string;
  lat: number;
  lng: number;
  value: number;

  constructor(lat: number, lng: number, value: number) {
    this.id = this.randomID(lat, lng);
    this.lat = lat;
    this.lng = lng;
    this.value = value;
  }

  private randomID(lat: number, lng: number): string {
    return `coin-${lat.toFixed(4)}-${lng.toFixed(4)}-${
      Math.random().toString(36).substring(2)
    }`;
  }
}

// Memento pattern for saving/restoring game state
class GameStateMemento {
  playerState: { lat: number; lng: number };
  cacheStates: string[];

  constructor(playerState: { lat: number; lng: number }, cacheStates: string[]) {
    this.playerState = playerState;
    this.cacheStates = cacheStates;
  }

  getState() {
    return {
      playerState: this.playerState,
      cacheStates: this.cacheStates,
    };
  }
}

// Move player marker
function movePlayer(latOffset: number, lngOffset: number) {
  playerPosition.lat += latOffset * TILE_DEGREES;
  playerPosition.lng += lngOffset * TILE_DEGREES;
  playerMarker.setLatLng(playerPosition);
  map.panTo(playerPosition);
  saveGameState();
}

// Save game state
function saveGameState() {
  const memento = new GameStateMemento(
    { lat: playerPosition.lat, lng: playerPosition.lng },
    Array.from(cacheMementos.keys())
  );
  localStorage.setItem("gameState", JSON.stringify(memento.getState()));
}

// Restore game state
function restoreGameState() {
  const savedState = JSON.parse(localStorage.getItem("gameState") || "{}");
  if (savedState.playerState) {
    playerPosition.lat = savedState.playerState.lat;
    playerPosition.lng = savedState.playerState.lng;
    playerMarker.setLatLng(playerPosition);
    map.panTo(playerPosition);
  }
  if (savedState.cacheStates) {
    savedState.cacheStates.forEach((cacheKey: string) => {
      const [lat, lng] = cacheKey.split(",").map(Number);
      spawnCache(lat, lng);
    });
  }
}

function updateCoinList() {
  const coinList = document.querySelector<HTMLDivElement>("#coinList")!;
  const coinListHeader = document.querySelector<HTMLDivElement>("#coinListHeader")!;

  if (collectedCoins.length === 0) {
    coinList.innerHTML = "No collected coins yet.";
    coinList.style.display = "none";
  } else {
    coinList.style.display = "block";
    coinList.innerHTML = collectedCoins
      .map(
        (coin) =>
          `<div>Coin ID: ${coin.id}, Value: ${coin.value}, Location: (${coin.lat.toFixed(
            4
          )}, ${coin.lng.toFixed(4)})</div>`
      )
      .join("");
  }

  coinListHeader.addEventListener("click", () => {
    coinList.style.display = coinList.style.display === "none" ? "block" : "none";
  });
}

// Spawn cache
function spawnCache(i: number, j: number) {
  const origin = OAKES_CLASSROOM;
  const lat = origin.lat + i * TILE_DEGREES;
  const lng = origin.lng + j * TILE_DEGREES;

  const cacheLocation = CacheLocations.getCacheLocation(lat, lng);
  console.log(cacheLocation);

  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  const coin = new Coin(
    lat,
    lng,
    Math.floor(luck([i, j, "initialValue"].toString()) * 100)
  );

  cacheMementos.set(`${lat},${lng}`, { pointValue: coin.value, coins: [] });

  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>Cache at "${i},${j}". ID: ${coin.id}. Value: <span id="value">${coin.value}</span>.</div>
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>`;

    popupDiv.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
      "click",
      () => {
        coin.value--;
        playerPoints++;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = coin.value.toString();
        statusPanel.innerHTML = `Collected coin ${coin.value.toString()}. Total points: ${playerPoints}`;
        updateStatusPanel();
        updateCoinList();
      }
    );

    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        coin.value++;
        playerPoints--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = coin.value.toString();
        statusPanel.innerHTML = `Collected coin ${coin.value.toString()}. Total points: ${playerPoints}`;
        updateStatusPanel();
      }
    );

    return popupDiv;
  });
}

// Update the status panel
function updateStatusPanel() {
  statusPanel.innerHTML =
    playerPoints > 1
      ? `You have ${playerPoints} coin.`
      : `You have ${playerPoints} coins.`;
}

// Button controls
document.getElementById("north")!.addEventListener("click", () => movePlayer(-1, 0));
document.getElementById("south")!.addEventListener("click", () => movePlayer(1, 0));
document.getElementById("west")!.addEventListener("click", () => movePlayer(0, -1));
document.getElementById("east")!.addEventListener("click", () => movePlayer(0, 1));
document.getElementById("reset")!.addEventListener("click", restoreGameState);

// Restore game state on load
restoreGameState();

// Spawn caches
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}

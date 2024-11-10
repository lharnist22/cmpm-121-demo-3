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
class cacheLocations {
  private static cacheLocationMap: Map<string, leaflet.latLng> = new Map();
  public static getCacheLocation(lat: number, lng: number): leaflet.LatLng {
    const key = `${lat}, ${lng}`;
    if (!cacheLocations.cacheLocationMap.has(key)) {
      const newLocation = leaflet.latLng(lat, lng);
      cacheLocations.cacheLocationMap.set(key, newLocation);
      return newLocation;
    }
    return cacheLocations.cacheLocationMap.get(key)!;
  }
}

// Coin class and constructor
class Coin {
  id: string;
  lat: number;
  lng: number;
  value: number;

  // Constructor here!!
  constructor(lat: number, lng: number, value: number) {
    this.id = this.randomID(lat, lng);
    this.lat = lat;
    this.lng = lng;
    this.value = value;
  }

  //Need to first write function to randomize the IDs
  private randomID(lat: number, lng: number): string {
    return `coin-${lat.toFixed(4)}-${lng.toFixed(4)}-${
      Math.random().toString(36)
    }`;
  }
}

//Player Class and Constructor
/*class Player {
  x: number;
  y: number;

  constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
  }

  moveUp(): void {
      this.y -= 1;
  }

  moveDown(): void {
      this.y += 1;
  }

  moveLeft(): void {
      this.x -= 1;
  }

  moveRight(): void {
      this.x += 1;
  }

  getPosition(): { x: number; y: number } {
      return { x: this.x, y: this.y };
  }
}

class Cache {
  id: number;
  x: number;
  y: number;
  collected: boolean;

  constructor(id: number, x: number, y: number, collected = false) {
      this.id = id;
      this.x = x;
      this.y = y;
      this.collected = collected;
  }

  collect(): void {
      this.collected = true;
  }

  getState(): { id: number; x: number; y: number; collected: boolean } {
      return {
          id: this.id,
          x: this.x,
          y: this.y,
          collected: this.collected,
      };
  }
}

class Memento {
  playerState: string;
  cacheStates: string[];

  constructor(playerState: string, cacheStates: string[]) {
      this.playerState = playerState;
      this.cacheStates = cacheStates;
  }

  getState(): { playerState: string; cacheStates: string[] } {
      return {
          playerState: this.playerState,
          cacheStates: this.cacheStates,
      };
  }
}*/


// Rewrite this for appropriate class of cacheLocations (CHANGE THIS LATER!)
function spawnCache(i: number, j: number) {
  const origin = OAKES_CLASSROOM;
  const lat = origin.lat + i * TILE_DEGREES;
  const lng = origin.lng + j * TILE_DEGREES;

  const cacheLocation = cacheLocations.getCacheLocation(lat, lng);
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
    Math.floor(luck([i, j, "initialValue"].toString()) * 100),
  );

  //Need to rewrite this to work properly
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>There is a cache here at "${i},${j}". The ID of this coin is: ${coin.id}.<span id="value">${coin.value} Remember it! </span>.</div>
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>`;

    // Collect Button and updating text for collection
    popupDiv.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
      "click",
      () => {
        coin.value--;
        playerPoints++;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = coin
          .value.toString();
        updateStatusPanel();
      },
    );

    // Deposit Button and updating text for deposit
    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        coin.value++;
        playerPoints--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = coin
          .value.toString();
        updateStatusPanel();
      },
    );

    return popupDiv;
  });
}

function updateStatusPanel() {
  if (playerPoints == 1) {
    statusPanel.innerHTML =
      `You have ${playerPoints} point. Collect more around the map and deposit them too!`;
  } else {
    statusPanel.innerHTML =
      `You have ${playerPoints} points. Collect more around the map and deposit them too!`;
  }
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}

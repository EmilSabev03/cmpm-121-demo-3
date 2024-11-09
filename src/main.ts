import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

interface Cache {
  row: number;
  col: number;
}

const cacheArray: Cache[] = [];

const CLASSROOM_LOCATION = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_SIZE = 0.0001;
const GRID_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MARKER_RADIUS = 15;

const map = leaflet.map(document.getElementById("map")!, {
  center: CLASSROOM_LOCATION,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

leaflet.circleMarker(CLASSROOM_LOCATION, {
  radius: MARKER_RADIUS,
  color: "red",
}).bindTooltip("You are here!").addTo(map);

let playerCoins = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Coins Collected: 0";

generateCaches();
displayCaches();

function spawnCache(cache: Cache) {
  const bounds = getCellBounds(cache);
  const rect = leaflet.rectangle(bounds).setStyle({ color: "gold" });
  rect.addTo(map);

  createCachePopup(rect, cache);
}

function createCachePopup(rect: leaflet.rectangle, cache: Cache) {
  let coinAmount = Math.floor(
    luck([cache.row, cache.col, "initialVal"].toString()) * 10,
  );

  const popupContent =
    `Cache Location: (${cache.row}, ${cache.col})<br>Coin Amount: ${coinAmount}<br>
    <button id="collect">collect</button><br><button id="deposit">deposit</button><br>`;

  rect.bindPopup(popupContent);

  rect.on("popupopen", function () {
    const collectButton = document.getElementById("collect");

    if (collectButton) {
      collectButton.addEventListener("click", function () {
        if (coinAmount > 0) {
          coinAmount -= 1;
          playerCoins += 1;

          updateDisplay(cache, coinAmount, playerCoins, rect);
        }
      });
    }

    const depositButton = document.getElementById("deposit");

    if (depositButton) {
      depositButton.addEventListener("click", function () {
        if (playerCoins > 0) {
          coinAmount += 1;
          playerCoins -= 1;

          updateDisplay(cache, coinAmount, playerCoins, rect);
        }
      });
    }
  });
}

function updateDisplay(
  cache: Cache,
  coinAmount: number,
  playerCoins: number,
  rect: leaflet.rectangle,
) {
  statusPanel.innerHTML = `Coins Collected: ${playerCoins}`;

  const popupContent =
    `Cache Location: (${cache.row}, ${cache.col})<br>Coin Amount: ${coinAmount}<br>
    <button id="collect">collect</button><br><button id="deposit">deposit</button><br>`;

  rect.getPopup()?.setContent(popupContent);
}

function getCellBounds(cache: Cache) {
  const origin = CLASSROOM_LOCATION;

  const centerLat = origin.lat + (cache.row + 0.5) * TILE_SIZE;
  const centerLng = origin.lng + (cache.col + 0.5) * TILE_SIZE;

  const northEastCorner = leaflet.latLng(
    centerLat + (TILE_SIZE / 2),
    centerLng + (TILE_SIZE / 2),
  );
  const southWestCorner = leaflet.latLng(
    centerLat - (TILE_SIZE / 2),
    centerLng - (TILE_SIZE / 2),
  );

  return leaflet.latLngBounds(northEastCorner, southWestCorner);
}

function generateCaches() {
  for (let row = -GRID_SIZE; row < GRID_SIZE; row++) {
    for (let col = -GRID_SIZE; col < GRID_SIZE; col++) {
      if (luck([row, col].toString()) < CACHE_SPAWN_PROBABILITY) {
        cacheArray.push({ row, col });
      }
    }
  }
}

function displayCaches() {
  cacheArray.forEach((cache) => {
    spawnCache(cache);
  });
}

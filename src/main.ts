/// <reference lib="deno.ns" />

import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

interface Coin {
  i: number;
  j: number;
  serial: number;
}

interface Memento<T> {
  toMemento(): void;
  fromMemento(): void;
}

interface Cache {
  i: number;
  j: number;
  coins: Coin[];
}

class FlyweightCache implements Memento<string> {
  public cacheMap: Map<string, Cache> = new Map();

  public getCache(i: number, j: number): Cache {
    const key = `${i}, ${j}`;

    if (!this.cacheMap.has(key)) {
      const newCache: Cache = {
        i: i * GCS_CONVERSION,
        j: j * GCS_CONVERSION,
        coins: [],
      };

      this.cacheMap.set(key, newCache);
    }

    return this.cacheMap.get(key)!;
  }

  public toMemento(): void {
    const cachesToData = Array.from(this.cacheMap.values()).filter((cache) =>
      !this.isInPlayerView(cache)
    );
    const cacheData = cachesToData.map((cache) => ({
      i: cache.i,
      j: cache.j,
      coins: cache.coins,
    }));

    localStorage.setItem("cacheData", JSON.stringify(cacheData));

    cachesToData.forEach((cache) => {
      const key = `${cache.i}, ${cache.j}`;
      this.cacheMap.delete(key);
    });
  }

  public fromMemento(): void {
    const caches = localStorage.getItem("cacheData");

    if (caches) {
      const cacheData: { i: number; j: number; coins: Coin[] }[] = JSON.parse(
        caches,
      );

      cacheData.forEach((cacheObj) => {
        const cache = this.getCache(cacheObj.i, cacheObj.j);
        cache.coins = cacheObj.coins;
      });
    }
  }

  public isInPlayerView(cache: Cache): boolean {
    const playerLocation = marker.getLatLng();
    const cacheLocation = getCellCenter(cache);

    const distance = playerLocation.distanceTo(cacheLocation);

    return distance <= GRID_SIZE * 15;
  }
}

const playerCoins: Coin[] = [];
const flyweightCache = new FlyweightCache();

const NULL_ISLAND = leaflet.latLng(0, 0);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_SIZE = 0.0001;
const GRID_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MARKER_RADIUS = 15;
const GCS_CONVERSION = 1000;

let cacheMarkers: leaflet.Rectangle[] = [];

const map = leaflet.map(document.getElementById("map")!, {
  center: NULL_ISLAND,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const marker = leaflet.circleMarker(NULL_ISLAND, {
  radius: MARKER_RADIUS,
  color: "red",
}).bindTooltip("You are here!").addTo(map);

document.querySelector<HTMLDivElement>("#moveDirections")!;

document.addEventListener("DOMContentLoaded", () => {
  const moveUpButton = document.getElementById("up");
  const moveDownButton = document.getElementById("down");
  const moveLeftButton = document.getElementById("left");
  const moveRightButton = document.getElementById("right");

  if (moveUpButton) moveUpButton.addEventListener("click", () => panMap("up"));
  if (moveDownButton) {
    moveDownButton.addEventListener("click", () => panMap("down"));
  }
  if (moveLeftButton) {
    moveLeftButton.addEventListener("click", () => panMap("left"));
  }
  if (moveRightButton) {
    moveRightButton.addEventListener("click", () => panMap("right"));
  }
});

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Coins Collected:";

generateInitialCaches();
displayCaches();

function spawnCache(cache: Cache) {
  const bounds = getCellBounds(cache);
  const rect = leaflet.rectangle(bounds).setStyle({ color: "gold" });
  rect.addTo(map);
  cacheMarkers.push(rect);

  createCachePopup(rect, cache);
}

function createCachePopup(rect: leaflet.rectangle, cache: Cache) {
  if (cache.coins.length === 0) {
    const coinAmount = Math.floor(
      luck([cache.i, cache.j, "initialVal"].toString()) * 10,
    );

    for (let serial = 0; serial < coinAmount; serial += 1) {
      const newCoin: Coin = { i: cache.i, j: cache.j, serial };
      cache.coins.push(newCoin);
    }
  }

  const coinAmount = cache.coins.length;
  let coinString: string = "";

  for (const coin of cache.coins) {
    coinString += `${coin.i}:${coin.j}#${coin.serial}<br>`;
  }

  const popupContent =
    `Cache Location: (${cache.i}, ${cache.j})<br>Coin Amount: ${coinAmount}<br><br>${coinString}<br>
    <button id="collect">collect</button><br><button id="deposit">deposit</button><br>`;

  rect.bindPopup(popupContent);

  rect.on("popupopen", function () {
    const collectButton = document.getElementById("collect");

    if (collectButton) {
      collectButton.addEventListener("click", function () {
        if (cache.coins.length > 0) {
          const coin = cache.coins.pop();
          if (coin) {
            playerCoins.push(coin);
          }
          updateDisplay(cache, playerCoins, rect);
        }
      });
    }

    const depositButton = document.getElementById("deposit");

    if (depositButton) {
      depositButton.addEventListener("click", function () {
        if (playerCoins.length > 0) {
          const coin = playerCoins.pop();
          if (coin) {
            cache.coins.push(coin);
          }

          updateDisplay(cache, playerCoins, rect);
        }
      });
    }
  });
}

function updateDisplay(
  cache: Cache,
  playerCoins: Coin[],
  rect: leaflet.rectangle,
) {
  const playerCoinStrings = playerCoins.map((coin) =>
    `${coin.i}:${coin.j}#${coin.serial}`
  );
  const playerCoinDisplay = playerCoinStrings.join(", ");
  statusPanel.innerHTML = `Coins Collected:<br>${playerCoinDisplay}`;

  const cacheCoinString = cache.coins.map((coin) =>
    `${coin.i}:${coin.j}#${coin.serial}`
  );
  const cacheCoinDisplay = cacheCoinString.join("<br>");

  const popupContent =
    `Cache Location: (${cache.i}, ${cache.j})<br>Coin Amount: ${cache.coins.length}<br><br>${cacheCoinDisplay}<br>
    <button id="collect">collect</button><br><button id="deposit">deposit</button><br>`;

  rect.getPopup()?.setContent(popupContent);
}

function getCellBounds(cache: Cache) {
  const origin = NULL_ISLAND;

  const centerLat = (origin.lat + (cache.i + 0.5) * TILE_SIZE) / GCS_CONVERSION;
  const centerLng = (origin.lng + (cache.j + 0.5) * TILE_SIZE) / GCS_CONVERSION;

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

function getCellCenter(cache: Cache) {
  const origin = NULL_ISLAND;

  const centerLat = (origin.lat + (cache.i + 0.5) * TILE_SIZE) / GCS_CONVERSION;
  const centerLng = (origin.lng + (cache.j + 0.5) * TILE_SIZE) / GCS_CONVERSION;

  return leaflet.latLng(centerLat, centerLng);
}

function generateInitialCaches() {
  for (let i = -GRID_SIZE; i < GRID_SIZE; i++) {
    for (let j = -GRID_SIZE; j < GRID_SIZE; j++) {
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        flyweightCache.getCache(i, j);
      }
    }
  }
}

function generateCaches(direction: string) {
  const currentPlayerI = Math.floor(
    marker.getLatLng().lat * GCS_CONVERSION / TILE_SIZE,
  );
  const currentPlayerJ = Math.floor(
    marker.getLatLng().lng * GCS_CONVERSION / TILE_SIZE,
  );

  let newPlayerGridI = currentPlayerI;
  let newPlayerGridJ = currentPlayerJ;

  switch (direction) {
    case "up":
      newPlayerGridI -= GRID_SIZE;
      break;
    case "down":
      newPlayerGridI += GRID_SIZE;
      break;
    case "left":
      newPlayerGridJ -= GRID_SIZE;
      break;
    case "right":
      newPlayerGridJ += GRID_SIZE;
      break;
  }

  for (let i = newPlayerGridI; i < newPlayerGridI + (2 * GRID_SIZE); i++) {
    for (let j = newPlayerGridJ; j < newPlayerGridJ + (2 * GRID_SIZE); j++) {
      const key = `${i}, ${j}`;
      if (
        luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY &&
        !flyweightCache.cacheMap.has(key)
      ) {
        flyweightCache.getCache(i, j);
      }
    }
  }
}

function displayCaches() {
  clearCacheMarkers();

  flyweightCache.cacheMap.forEach((cache) => {
    if (flyweightCache.isInPlayerView(cache)) {
      spawnCache(cache);
    }
  });
}

function panMap(direction: string) {
  const currentLatLng = marker.getLatLng();

  let newLat = currentLatLng.lat;
  let newLng = currentLatLng.lng;

  switch (direction) {
    case "up":
      newLat += TILE_SIZE;
      break;
    case "down":
      newLat -= TILE_SIZE;
      break;
    case "left":
      newLng -= TILE_SIZE;
      break;
    case "right":
      newLng += TILE_SIZE;
      break;
  }

  generateCaches(direction);

  marker.setLatLng([newLat, newLng]);
  map.setView([newLat, newLng]);

  displayCaches();
}

function clearCacheMarkers() {
  cacheMarkers.forEach((marker) => marker.remove());
  cacheMarkers = [];
}

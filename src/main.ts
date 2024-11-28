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

interface Cache {
  i: number;
  j: number;
  coins: Coin[];
}


class CacheManager 
{
  public cacheMap: Map<string, Cache> = new Map();

  public getCache(i: number, j: number): Cache
  {
    const key = `${i}, ${j}`;

    if (!this.cacheMap.has(key))
    {
      const newCache: Cache =
      {
        i: i * GCS_CONVERSION,
        j: j * GCS_CONVERSION,
        coins: [],
      };
      this.cacheMap.set(key, newCache);
    }

    return this.cacheMap.get(key) as Cache;
  }

  public isInPlayerView(cache: Cache, playerLocation: leaflet.LatLng): boolean
  {
    const cacheLocation = this.getCellCenter(cache);
    const distance = playerLocation.distanceTo(cacheLocation);
    return distance <= GRID_SIZE * 15;
  }

  public getCellCenter(cache: Cache): leaflet.LatLng
  {
    const origin = NULL_ISLAND;
  
    const centerLat = (origin.lat + (cache.i + 0.5) * TILE_SIZE) / GCS_CONVERSION;
    const centerLng = (origin.lng + (cache.j + 0.5) * TILE_SIZE) / GCS_CONVERSION;
  
    return leaflet.latLng(centerLat, centerLng);
  }

  public getCachesFromMap(): Cache[] 
  {
    return Array.from(this.cacheMap.values());
  }

  public clearCachesFromMap()
  {
    this.cacheMap.clear();
  }

  public getCellBounds(cache: Cache): leaflet.LatLng 
  {
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
}


class GameState
{

  public saveGameState(playerLocation: leaflet.LatLng, playerCoins: Coin[], cacheManager: CacheManager,): void
  {
    const cacheData = cacheManager.getCachesFromMap().map((cache) => 
    ({
      i: cache.i,
      j: cache.j,
      coins: cache.coins,
    }));

    const savedState = 
    {
      playerLocation: { latitude: playerLocation.lat, longitude: playerLocation.lng },
      playerCoins,
      cacheData,
    };

    localStorage.setItem("savedGameState", JSON.stringify(savedState));
  }


  public restoreGameState(playerCoins: Coin[], cacheManager: CacheManager,): void
  {
    const savedState = localStorage.getItem("savedGameState");

    if (savedState)
    {
      const { playerLocation, cacheData, playerCoins: restoredCoins } = JSON.parse(savedState);

      const playerGeoLocation = new leaflet.LatLng(playerLocation.latitude, playerLocation.longitude);
      marker.setLatLng(playerGeoLocation);
      map.setView(playerGeoLocation, GAMEPLAY_ZOOM_LEVEL);

      playerCoins.length = 0;
      playerCoins.push(...restoredCoins);

      cacheData.forEach((cacheObj: Cache) => 
      {
        const cache = cacheManager.getCache(cacheObj.i, cacheObj.j);
        cache.coins = cacheObj.coins;
      });
    }
  }


  public toMemento(cacheManager: CacheManager, playerLocation: leaflet.LatLng, playerCoins: Coin[]): void 
  {
    const cachesToData = cacheManager.getCachesFromMap().filter((cache) => !cacheManager.isInPlayerView(cache, playerLocation));

    const cacheData = cachesToData.map((cache) => 
    ({
      i: cache.i,
      j: cache.j,
      coins: cache.coins,
    }));

    localStorage.setItem("cacheData", JSON.stringify(cacheData));

    cacheManager.clearCachesFromMap();

    this.saveGameState(playerLocation, playerCoins, cacheManager);
  }


  public fromMemento(cacheManager: CacheManager): void 
  {
    const caches = localStorage.getItem("cacheData");

    if (caches) 
    {
      const cacheData: { i: number; j: number; coins: Coin[] }[] = JSON.parse(caches);

      cacheData.forEach((cacheObj) => 
      {
        const cache = cacheManager.getCache(cacheObj.i, cacheObj.j);
        cache.coins = cacheObj.coins;
      });
    }

    localStorage.removeItem("cacheData");
  }


  public resetGameState(cacheManager: CacheManager): void
  {
    const resetGame = prompt("Type 'yes' to reset the game state");

    if (resetGame === "yes") 
    {
      localStorage.removeItem("savedGameState");

      marker.setLatLng([0, 0]);
      map.setView([0, 0], GAMEPLAY_ZOOM_LEVEL);
      playerInventory.clearInventory();
      cacheManager.clearCachesFromMap();
      clearCacheMarkers();

      generateInitialCaches(0, 0);
      displayCaches();
      polylineCoords = [[0, 0]];
      polyline.setLatLngs(polylineCoords);
      statusPanel.innerHTML = "Coins Collected:<br>";
      this.saveGameState(marker.getLatLng(), playerInventory.getInventory(), cacheManager);
    }
  }

}


class FlyweightCache 
{
  public cacheManager: CacheManager;
  public gameState: GameState;

  constructor()
  {
    this.cacheManager = new CacheManager();
    this.gameState = new GameState();
  }


  public saveGameState(playerLocation: leaflet.LatLng, playerCoins: Coin[]): void
  {
    this.gameState.saveGameState(playerLocation, playerCoins, this.cacheManager);
  }


  public restoreGameState(playerCoins: Coin[]): void
  {
    this.gameState.restoreGameState(playerCoins, this.cacheManager);
  }


  public resetGameState(): void
  {
    this.gameState.resetGameState(this.cacheManager);
  }


  public isCacheInPlayerView(cache: Cache, playerLocation: leaflet.LatLng): boolean
  {
    return this.cacheManager.isInPlayerView(cache, playerLocation);
  }

}


class PlayerInventory
{
  public coins: Coin[] = [];

  public addCoin(coin: Coin): void
  {
    this.coins.push(coin);
  }

  public removeCoin(): Coin | undefined
  {
    return this.coins.pop();
  }

  public getInventory(): Coin[]
  {
    return this.coins;
  }

  public clearInventory(): void
  {
    this.coins = [];
  }

  public getTotal(): number
  {
    return this.coins.length;
  }
}


const playerInventory = new PlayerInventory();
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

document.querySelector<HTMLDivElement>("#buttons")!;

document.addEventListener("DOMContentLoaded", () => {
  
  flyweightCache.restoreGameState(playerInventory.getInventory());

  const geoLocationButton = document.getElementById("geolocation");
  const moveUpButton = document.getElementById("up");
  const moveDownButton = document.getElementById("down");
  const moveLeftButton = document.getElementById("left");
  const moveRightButton = document.getElementById("right");
  const resetGameStateButton = document.getElementById("reset");

  if (geoLocationButton) {
    geoLocationButton.addEventListener("click", () => goToGeolocation());
  }
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
  if (resetGameStateButton) {
    resetGameStateButton.addEventListener(
      "click",
      () => flyweightCache.resetGameState(),
    );
  }
});

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Coins Collected:";

generateInitialCaches(0, 0);
flyweightCache.saveGameState(marker.getLatLng(), playerInventory.getInventory());
displayCaches();

let polylineCoords: leaflet.LatLngExpression[] = [[0, 0]];
const polyline = leaflet.polyline(polylineCoords, { color: "red" }).addTo(map);

function spawnCache(cache: Cache) {
  const bounds = flyweightCache.cacheManager.getCellBounds(cache);
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
    <button id="collect">collect</button><br><button id="deposit">deposit</button><br><button id="center">center</button><br>`;

  rect.bindPopup(popupContent);

  rect.on("popupopen", function () {
    const collectButton = document.getElementById("collect");

    if (collectButton) {
      collectButton.addEventListener("click", function () {
        if (cache.coins.length > 0) {
          const coin = cache.coins.pop();
          if (coin) {
            playerInventory.addCoin(coin);
          }
          updateDisplay(cache, playerInventory.getInventory(), rect);
        }
      });
    }

    const depositButton = document.getElementById("deposit");

    if (depositButton) {
      depositButton.addEventListener("click", function () {
        if (playerInventory.getTotal() > 0) {
          const coin = playerInventory.removeCoin()
          if (coin) {
            cache.coins.push(coin);
          }

          updateDisplay(cache, playerInventory.getInventory(), rect);
        }
      });
    }

    const centerButton = document.getElementById("center");

    if (centerButton) {
      centerButton.addEventListener("click", function () {
        const newCenter = flyweightCache.cacheManager.getCellCenter(cache);
        map.setView(newCenter);
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
    <button id="collect">collect</button><br><button id="deposit">deposit</button><br><button id="center">center</button><br>`;

  rect.getPopup()?.setContent(popupContent);

  flyweightCache.saveGameState(marker.getLatLng(), playerCoins);
}


function generateInitialCaches(positionI: number, positionJ: number) {
  for (let i = positionI - GRID_SIZE; i < positionI + GRID_SIZE; i++) {
    for (let j = positionJ - GRID_SIZE; j < positionJ + GRID_SIZE; j++) {
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        flyweightCache.cacheManager.getCache(i, j);
      }
    }
  }

  flyweightCache.saveGameState(marker.getLatLng(), playerInventory.getInventory());
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

  for (let i = newPlayerGridI; i < newPlayerGridI + (2 * GRID_SIZE); i++) 
  {
    for (let j = newPlayerGridJ; j < newPlayerGridJ + (2 * GRID_SIZE); j++) 
    {
      const key = `${i}, ${j}`;
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY && !flyweightCache.cacheManager.cacheMap.has(key)) 
      {
        flyweightCache.cacheManager.getCache(i, j);
      }
    }
  }

  flyweightCache.saveGameState(marker.getLatLng(), playerInventory.getInventory());
}

function displayCaches() {
  clearCacheMarkers();

  flyweightCache.cacheManager.cacheMap.forEach((cache) => 
  {
    if (flyweightCache.isCacheInPlayerView(cache, marker.getLatLng())) 
    {
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

  flyweightCache.saveGameState(marker.getLatLng(), playerInventory.getInventory());

  displayCaches();

  polylineCoords.push([newLat, newLng]);
  polyline.setLatLngs(polylineCoords);
}

function goToGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
      const { latitude: newLat, longitude: newLng } = position.coords;

      marker.setLatLng([newLat, newLng]);
      map.setView([newLat, newLng]);

      const geolocationI = Math.floor(newLat * GCS_CONVERSION / TILE_SIZE);
      const geolocationJ = Math.floor(newLng * GCS_CONVERSION / TILE_SIZE);

      generateInitialCaches(geolocationI, geolocationJ);

      flyweightCache.saveGameState(marker.getLatLng(), playerInventory.getInventory());

      displayCaches();
    }, (error) => {
      console.error("Auto positioning failed:", error);
      alert("You have not enabled location access.");
    });
  }
}

function clearCacheMarkers() {
  cacheMarkers.forEach((marker) => marker.remove());
  cacheMarkers = [];
}
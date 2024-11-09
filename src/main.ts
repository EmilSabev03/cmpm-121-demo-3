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

class FlyweightCacheFactory {
  private cacheMap: Map<string, Cache> = new Map();

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
}

const cacheArray: Cache[] = [];
const playerCoins: Coin[] = [];

const NULL_ISLAND = leaflet.latLng(0, 0);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_SIZE = 0.0001;
const GRID_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MARKER_RADIUS = 15;
const GCS_CONVERSION = 1000;

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

leaflet.circleMarker(NULL_ISLAND, {
  radius: MARKER_RADIUS,
  color: "red",
}).bindTooltip("You are here!").addTo(map);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Coins Collected:";

generateCaches();
displayCaches();

function spawnCache(cache: Cache) {
  const bounds = getCellBounds(cache);
  const rect = leaflet.rectangle(bounds).setStyle({ color: "gold" });
  rect.addTo(map);

  createCachePopup(rect, cache);
}

function createCachePopup(rect: leaflet.rectangle, cache: Cache) {
  const coinAmount = Math.floor(
    luck([cache.i, cache.j, "initialVal"].toString()) * 10,
  );

  let coinString: string = "";

  for (let serial = 0; serial < coinAmount; serial += 1) {
    const newCoin: Coin = { i: cache.i, j: cache.j, serial };
    cache.coins.push(newCoin);

    coinString += newCoin.i.toString() + ":" + newCoin.j.toString() + "#" +
      newCoin.serial + "<br>";
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

function generateCaches() {
  const cachefactory = new FlyweightCacheFactory();
  for (let i = -GRID_SIZE; i < GRID_SIZE; i++) {
    for (let j = -GRID_SIZE; j < GRID_SIZE; j++) {
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        const cache = cachefactory.getCache(i, j);

        cacheArray.push(cache);
      }
    }
  }
}

function displayCaches() {
  cacheArray.forEach((cache) => {
    spawnCache(cache);
  });
}

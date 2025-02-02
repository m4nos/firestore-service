import axios from "axios";
import admin from "firebase-admin";
import { parse } from "csv-parse/sync";
import haversine from 'haversine-distance';
import fs from 'fs';
import path from 'path';
import { MODIS_VIIRS_KEY } from "./keys.js";
import serviceAccount from "./firebaseServiceAccountKey.json" with { type: "json" };

const cacheFilePath = path.resolve('./markersCache.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fire-alert-d86d4.firebaseio.com",
});

const db = admin.firestore();

class FirestoreService {
  constructor() {
    if (FirestoreService.instance) {
      return FirestoreService.instance;
    }

    this.cache = new Map();
    this.loadCacheFromFile();

    FirestoreService.instance = this;
  }

  loadCacheFromFile() {
    if (fs.existsSync(cacheFilePath)) {
      const fileContent = fs.readFileSync(cacheFilePath);
      const data = JSON.parse(fileContent);
      data.forEach(([key, value]) => {
        this.cache.set(key, value);
      });
      console.log("Cache loaded from file");
    } else {
      console.log("No cache file found. Starting with an empty cache.");
    }
  }

  saveCacheToFile() {
    const data = [...this.cache.entries()];
    fs.writeFileSync(cacheFilePath, JSON.stringify(data));
    console.log("Cache saved to file");
  }

  async initializeCache() {
    console.log("Initializing cache...");
    const snapshot = await db.collection("markers").get();
    snapshot.forEach((doc) => {
      this.cache.set(doc.id, doc.data());
    });
    this.saveCacheToFile();
    console.log("Cache initialized with", this.cache.size, "markers");
  }

  async fetchWildfireData() {
    try {
      const CSVResponse = await axios.get(
        `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${MODIS_VIIRS_KEY}/VIIRS_SNPP_NRT/GRC/1`,
        {
          params: {
            key: MODIS_VIIRS_KEY,
          },
        }
      );

      const records = parse(CSVResponse.data, {
        columns: true,
      });
      return records;
    } catch (error) {
      console.error("Error fetching wildfire data:", error);
      return [];
    }
  }

  filterData(newData, threshold = 100, proximityDistance = 10000) {
    return newData.filter((newEvent) => {
      const newMarkerCoords = {
        latitude: parseFloat(newEvent.latitude),
        longitude: parseFloat(newEvent.longitude),
      };

      // Check if the new marker is not within the threshold of existing markers
      const isFarFromExistingMarkers = ![...this.cache.values()].some((existingEvent) => {
        const existingMarkerCoords = {
          latitude: parseFloat(existingEvent.latitude),
          longitude: parseFloat(existingEvent.longitude),
        };
        const distance = haversine(newMarkerCoords, existingMarkerCoords);
        return distance < threshold;
      });

      // Check if the new marker has no neighboring markers within the proximityDistance
      const hasNoNearbyMarkers = !newData.some((otherEvent) => {
        if (otherEvent === newEvent) return false; // Skip the same event
        const otherMarkerCoords = {
          latitude: parseFloat(otherEvent.latitude),
          longitude: parseFloat(otherEvent.longitude),
        };
        const distance = haversine(newMarkerCoords, otherMarkerCoords);
        return distance < proximityDistance;
      });

      return isFarFromExistingMarkers && !hasNoNearbyMarkers;
    });
  }

  async updateWildfireData() {
    try {
      const newWildfireData = await this.fetchWildfireData();
      const filteredData = this.filterData(newWildfireData);

      if (!filteredData.length) {
        console.info(`${new Date()} No new data to be added. Fetched ${newWildfireData.length} results from FIRMS`);
      } else {
        const batch = db.batch();
        filteredData.forEach((data) => {
          const docRef = db.collection("markers").doc(); // Auto-generated ID
          batch.set(docRef, {
            ...data,
            timestamp: new Date().getTime()
          });
          this.cache.set(docRef.id, data); // Update cache
        });

        await batch.commit();
        this.saveCacheToFile();
        console.log(`${new Date()} Filtered wildfire data stored successfully. ${filteredData.length} new entries`);
      }
    } catch (error) {
      console.error(`${new Date()} Error updating wildfire data:`, error);
    }
  }

  async deleteOldMarkers() {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const snapshot = await db.collection("markers").where("timestamp", "<", oneDayAgo).get();

      if (snapshot.empty) {
        console.log(`${new Date()} No old markers to delete.`);
        return;
      }

      const batch = db.batch();
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        this.cache.delete(doc.id); // Update cache
      });

      await batch.commit();
      this.saveCacheToFile();
      console.log(`${new Date()} ${snapshot.docs.length} Old markers deleted successfully!`);
    } catch (error) {
      console.error(`${new Date()} Error deleting old markers:`, error);
    }
  }
}

const instance = new FirestoreService();
Object.freeze(instance);

export default instance;

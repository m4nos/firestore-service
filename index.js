import cron from "node-cron";
import firestoreService from "./FirestoreService.js";

async function initializeAndStartCronJobs() {
  await firestoreService.initializeCache();

  cron.schedule("*/10 * * * *", () => firestoreService.updateWildfireData());
  cron.schedule("0 0 * * *", () => firestoreService.deleteOldMarkers());

  // Initial run
  await firestoreService.updateWildfireData();
  await firestoreService.deleteOldMarkers();
}

initializeAndStartCronJobs();

import cron from 'node-cron';
import firestoreService from './FirestoreService.js';

async function initializeAndStartCronJobs() {
  await firestoreService.initializeCache();

  cron.schedule('*/10 * * * *', () => firestoreService.updateWildfireData()); // every 10 minutes
  cron.schedule('0 * * * *', () => firestoreService.deleteOldMarkers()); // Run once every hour at the start of the hour

  // Initial run
  await firestoreService.updateWildfireData();
  await firestoreService.deleteOldMarkers();
}

initializeAndStartCronJobs();

import { DEFAULT_DB_PATH, ReviewStore } from "./db";
import { exportSnapshot } from "./export";

// Re-generates the dashboard snapshot and CSV from the local database without scraping.
// Useful after changing the topic keywords or sentiment thresholds.
const store = new ReviewStore(process.argv[2] ?? DEFAULT_DB_PATH);
const out = exportSnapshot(store);
store.close();
console.log(`exported ${out.reviews} reviews to ${out.paths.join(", ")}`);

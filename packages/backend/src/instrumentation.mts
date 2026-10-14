// This file handles the tracing initialization and starts the tracing process before the app starts.
// You should be careful about editing this file, as it is a critical part of the application's functionality.
// Because this file is a module it should imported using the `--import` flag in the `node` command, and should not be imported by any other file.
//
// Tracing options (enabled/url/ratio/debug/service name) are read by @map-colonies/tracing itself from
// environment variables (TELEMETRY_TRACING_ENABLED, TELEMETRY_TRACING_URL, ...) rather than from the
// `config` package, matching the previous @map-colonies/telemetry setup.
import { isMainThread } from 'node:worker_threads';
import { tracingFactory } from './common/tracing.js';

if (isMainThread) {
  const tracing = tracingFactory({});
  tracing.start();
}

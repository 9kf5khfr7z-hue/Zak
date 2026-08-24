import "./load-env.js";
import { checkOneSignalCredentials } from "../server/_core/push-provider";

const appId = process.env.PUSH_PROJECT_ID;
const apiKey = process.env.PUSH_API_KEY;

async function main() {
  if (!appId || !apiKey) {
    console.log("ERROR: OneSignal credentials are not available to this process");
    process.exitCode = 2;
    return;
  }

  const result = await checkOneSignalCredentials({ appId, apiKey });
  console.log(JSON.stringify({ status: result.status, appId: result.appId, latencyMs: result.latencyMs, detail: result.detail }));
}

void main();

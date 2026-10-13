import worker from "./index";
import type { Env } from "./types";

// Pages supplies ASSETS automatically; DB and provider secrets are optional
// until the owner configures the production bindings in the dashboard.
export default {
  fetch(request: Request, bindings: Partial<Env>, context: ExecutionContext) {
    const env = {
      ...bindings,
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: bindings.PUBLIC_SITE_URL || new URL(request.url).origin,
      LOCAL_TEST_MODE: "false",
    } as Env;
    return worker.fetch(request, env, context);
  },
};

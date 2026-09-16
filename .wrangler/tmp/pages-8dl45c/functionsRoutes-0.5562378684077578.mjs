import { onRequestOptions as __api_edupage___path___ts_onRequestOptions } from "/home/dmytro/Projects/stundio/functions/api-edupage/[[path]].ts"
import { onRequest as __api_edupage___path___ts_onRequest } from "/home/dmytro/Projects/stundio/functions/api-edupage/[[path]].ts"

export const routes = [
    {
      routePath: "/api-edupage/:path*",
      mountPath: "/api-edupage",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_edupage___path___ts_onRequestOptions],
    },
  {
      routePath: "/api-edupage/:path*",
      mountPath: "/api-edupage",
      method: "",
      middlewares: [],
      modules: [__api_edupage___path___ts_onRequest],
    },
  ]
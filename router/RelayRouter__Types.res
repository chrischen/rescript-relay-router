open RelayRouter__Bindings

type renderRouteFn = (. ~childRoutes: React.element) => React.element

@live
type preloadPriority = High | Default | Low

@live
type preloadAsset =
  | Component({moduleName: string, chunk: string, eagerPreloadFn: unit => unit})
  | Image({url: string})

@live
type rec route = {
  path: string,
  loadRouteRenderer: unit => Js.Promise.t<unit>,
  preloadCode: (
    . ~environment: RescriptRelay.Environment.t,
    ~pathParams: Js.Dict.t<string>,
    ~queryParams: RelayRouter__Bindings.QueryParams.t,
    ~location: RelayRouter__Bindings.History.location,
  ) => Js.Promise.t<array<preloadAsset>>,
  prepare: (
    . ~environment: RescriptRelay.Environment.t,
    ~pathParams: Js.Dict.t<string>,
    ~queryParams: QueryParams.t,
    ~location: RelayRouter__Bindings.History.location,
  ) => renderRouteFn,
  children: array<route>,
}

type routeMatch = {
  params: Js.Dict.t<string>,
  route: route,
}

type preparedMatch = {render: renderRouteFn}

type currentRouterEntry = {
  location: History.location,
  preparedMatches: array<preparedMatch>,
}

type subFn = currentRouterEntry => unit
type unsubFn = unit => unit
type cleanupFn = unit => unit
type callback = unit => unit

type routerEvent =
  | OnBeforeNavigation({currentLocation: RelayRouter__Bindings.History.location})
  | RestoreScroll(RelayRouter__Bindings.History.location)
type onRouterEventFn = routerEvent => unit

@live
type routerContext = {
  preload: (string, ~priority: preloadPriority=?, unit) => unit,
  preloadCode: (string, ~priority: preloadPriority=?, unit) => unit,
  get: unit => currentRouterEntry,
  subscribe: subFn => unsubFn,
  history: History.t,
  subscribeToEvent: onRouterEventFn => unsubFn,
  postRouterEvent: routerEvent => unit,
}

@live
type streamedEntry = {
  id: string,
  response: Js.Json.t,
  final: bool,
}

type onResponseReceivedFn = (~queryId: string, ~response: Js.Json.t, ~final: bool) => unit

@live
type setQueryParamsMode = Push | Replace
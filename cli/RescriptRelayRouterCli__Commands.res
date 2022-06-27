module Codegen = RescriptRelayRouterCli__Codegen
module Utils = RescriptRelayRouterCli__Utils
module History = RelayRouter.Bindings.History
module Types = RescriptRelayRouterCli__Types
module Diagnostics = RescriptRelayRouterCli__Diagnostics

open RescriptRelayRouterCli__Bindings

let scaffoldRouteRenderers = (~deleteRemoved, ~config) => {
  let (_routes, routeNamesDict) = Utils.readRouteStructure(config)
  let existingRenderers = Glob.glob.sync(
    ["**/*_route_renderer.res"],
    Glob.opts(~cwd=Utils.pathInRoutesFolder(~config, ()), ()),
  )

  let routeNamesWithRenderers = Js.Dict.empty()

  existingRenderers->Belt.Array.forEach(rendererFileName => {
    routeNamesWithRenderers->Js.Dict.set(Utils.fromRendererFileName(rendererFileName), true)
  })

  if deleteRemoved {
    // Remove all renderers that does not have a route defined for it
    existingRenderers->Belt.Array.forEach(rendererFileName => {
      switch routeNamesDict->Js.Dict.get(Utils.fromRendererFileName(rendererFileName)) {
      | None =>
        // No route exists with this name, remove the file.
        Js.log("Removing unused renderer \"" ++ rendererFileName ++ "\"")
        Fs.unlinkSync(Utils.pathInRoutesFolder(~config, ~fileName=rendererFileName, ()))
      | Some(_) => // Exists, don't mind this
        ()
      }
    })
  }

  // Let's add renderers for any route that doesn't already have one
  routeNamesDict
  ->Js.Dict.entries
  ->Belt.Array.forEach(((routeName, (route, _))) => {
    switch routeNamesWithRenderers->Js.Dict.get(routeName) {
    | Some(_) => // Renderer exists, don't touch anything
      ()
    | None =>
      // No renderer, lets write it

      Fs.writeFileIfChanged(
        Utils.pathInRoutesFolder(~config, ~fileName=Utils.toRendererFileName(routeName), ()),
        `let renderer = Routes.${route.name->Types.RouteName.getFullRouteAccessPath}.makeRenderer(
  ~prepare=props => {
    ()
  },
  ~render=props => {
    React.null
  },
  (),
)`,
      )

      Js.log("Added \"" ++ Utils.toRendererFileName(routeName) ++ "\"")
    }
  })
}

let generateRoutes = (~scaffoldAfter, ~deleteRemoved, ~config) => {
  Js.log("Generating routes...")
  let (routes, routeNamesDict) = Utils.readRouteStructure(config)

  let routesFile = ref(`// @generated
// This file is autogenerated, do not edit manually\n`)

  routes->Belt.Array.forEach(route => {
    routesFile->Utils.add(route->Utils.printNestedRouteModules(~indentation=0))
  })

  // Let's start by writing the Routes file
  Fs.writeFileIfChanged(
    Utils.pathInGeneratedFolder(~config, ~fileName="Routes.res", ()),
    routesFile.contents,
  )

  let currentFilesInOutputTarget = Glob.glob.sync(
    ["Route__*_route.res"],
    Glob.opts(~cwd=Utils.pathInGeneratedFolder(~config, ()), ()),
  )

  // Remove files in the generated folder no longer needed
  currentFilesInOutputTarget->Belt.Array.forEach(fileName => {
    let shouldDelete = switch (
      fileName->Js.String2.endsWith("_route.res"),
      fileName->Js.String2.startsWith("Route__"),
    ) {
    | (true, true) =>
      let routeName =
        fileName
        ->Js.String2.sliceToEnd(~from=Js.String2.length("Route__"))
        ->Js.String2.replace("_route.res", "")

      routeNamesDict->Js.Dict.get(routeName)->Belt.Option.isNone
    | _ => false
    }

    if shouldDelete {
      Fs.unlinkSync(Utils.pathInGeneratedFolder(~config, ~fileName, ()))
    }
  })

  // Write route assets
  routeNamesDict
  ->Js.Dict.values
  ->Belt.Array.forEach(((route, _path)) => {
    let assetsContent =
      `// @generated\n// This file is autogenerated from \`${route.sourceFile}\`, do not edit manually.\n` ++
      Codegen.getRouteMakerIfElgible(route) ++
      "\n\n" ++
      Codegen.getActiveRouteAssets(route) ++
      "\n\n" ++
      Codegen.getPrepareAssets(route) ++
      "\n\n" ++
      Codegen.getQueryParamAssets(route)

    Fs.writeFileIfChanged(
      Utils.pathInGeneratedFolder(
        ~config,
        ~fileName=`${route.name->Types.RouteName.toGeneratedRouteModuleName}.res`,
        (),
      ),
      assetsContent,
    )
  })

  let routeNamesEntries = routeNamesDict->Js.Dict.entries

  // Write the full route declarations file
  let fileContents = `
open RelayRouter__Internal__DeclarationsSupport

${routeNamesEntries
    ->Belt.Array.map(((routeName, _)) => {
      `
@val external import__${routeName}: (@as(json\`"@rescriptModule/${routeName}_route_renderer"\`) _, unit) => Js.Promise.t<RouteRenderer.t> = "import"`
    })
    ->Js.Array2.joinWith("\n")}

let loadedRouteRenderers: Belt.HashMap.String.t<loadedRouteRenderer> = Belt.HashMap.String.make(
  ~hintSize=${routeNamesEntries->Belt.Array.length->Belt.Int.toString},
)

let make = (~prepareDisposeTimeout=5 * 60 * 1000, ()): array<RelayRouter.Types.route> => {
  let {prepareRoute, getPrepared} = makePrepareAssets(~loadedRouteRenderers, ~prepareDisposeTimeout)

  [
    ${routes
    ->Js.Array2.map(route => Codegen.getRouteDefinition(route, ~indentation=1))
    ->Js.Array2.joinWith(",\n")}
  ]
}`

  Utils.pathInGeneratedFolder(
    ~config,
    ~fileName="RouteDeclarations.res",
    (),
  )->Fs.writeFileIfChanged(fileContents)

  // Write interface file as the signature of this will never change
  Utils.pathInGeneratedFolder(
    ~config,
    ~fileName="RouteDeclarations.resi",
    (),
  )->Fs.writeFileIfChanged(`let make: (~prepareDisposeTimeout: int=?, unit) => array<RelayRouter.Types.route>`)

  if scaffoldAfter {
    scaffoldRouteRenderers(~deleteRemoved, ~config)
  }

  Js.log("Done!")
}

// This does a simple lookup of any route provided to it. Currently does not
// support query params since they need to be decoded before we can know they
// work.
let printRouteInfo = (~url, ~config) => {
  let (routes, _routeNamesDict) = Utils.readRouteStructure(config)
  let urlObj = URL.make(
    switch url->Js.String2.startsWith("http") {
    | true => url
    | false => "http://localhost" ++ url
    },
  )

  let matched =
    routes
    ->Belt.Array.map(Utils.rawRouteToMatchable)
    ->Utils.matchRoutesCli({
      "pathname": urlObj->URL.getPathname,
      "search": urlObj->URL.getSearch->Belt.Option.getWithDefault(""),
      "hash": urlObj->URL.getHash,
      "state": urlObj->URL.getState,
    })
    ->Belt.Option.getWithDefault([])

  switch matched->Js.Array2.length {
  | 0 => Js.log("URL did not match any routes.")
  | matchCount =>
    let str = ref(
      `URL matched ${matchCount->Js.Int.toString} route(s).\n\n===== Matched structure:\n`,
    )
    let indentation = ref(0)
    let strEnd = ref("")

    matched->Belt.Array.forEachWithIndex((index, matchedRoute) => {
      let propsForRoute =
        matchedRoute.params
        ->Js.Dict.entries
        ->Belt.Array.keep(((key, _)) => matchedRoute.route.params->Js.Array2.includes(key))

      str.contents =
        str.contents ++
        "\n" ++
        `${Js.String2.repeat(
            "  ",
            indentation.contents,
          )}// In "${matchedRoute.route.sourceFile}"\n` ++
        Js.String2.repeat("  ", indentation.contents) ++
        `<${matchedRoute.route.name}${propsForRoute
          ->Belt.Array.map(((key, value)) => {
            ` ${key}="${value}"`
          })
          ->Js.Array2.joinWith("")}>`

      if index + 1 !== matchCount {
        strEnd.contents =
          strEnd.contents ++
          "\n" ++
          Js.String2.repeat("  ", indentation.contents) ++
          `</${matchedRoute.route.name}>`
      }

      indentation.contents = indentation.contents + 1
    })

    Js.log(
      str.contents ++
      "\n" ++
      strEnd.contents->Js.String2.split("\n")->Js.Array2.reverseInPlace->Js.Array2.joinWith("\n"),
    )
  }
}

@val
external stringifyFormatted: ('any, @as(json`null`) _, @as(json`2`) _) => string = "JSON.stringify"

let init = () => {
  if !Utils.Config.exists() {
    Js.log("[init] Config does not exist, creating default one...")
    let path = Path.resolve([Process.cwd(), "./rescriptRelayRouter.config.cjs"])

    Fs.writeFileSync(
      path,
      `module.exports = ${{
          "routesFolderPath": "./src/routes",
        }->stringifyFormatted}`,
    )

    Js.log("[init] Config created at: " ++ path)
  } else {
    Js.log("[init] Config exists, moving on...")
  }

  try {
    let config = Utils.Config.load()
    let routesJsonPath = Utils.pathInRoutesFolder(~config, ~fileName="routes.json", ())

    if !Fs.existsSync(routesJsonPath) {
      Js.log("[init] `routes.json` does not exist, creating...")
      Fs.writeFileSync(
        routesJsonPath,
        (
          {
            "path": "/",
            "name": "Root",
            "children": [],
          },
          {
            "path": "*",
            "name": "FourOhFour",
          },
        )->stringifyFormatted,
      )

      Js.log("[init] Basic `routes.json` added at: " ++ routesJsonPath)
    }
  } catch {
  | Utils.Invalid_config(_) =>
    Js.log("[init] Config existed, but was misconfigured. Re-configure it and rerun this command.")
    Process.exit(0)
  }

  Js.log("[init] Done! You can now run the `generate -scaffold-renderers` command.")
}

type cliResult = Done | Watcher({watcher: Chokidar.Watcher.t})

let runCli = args => {
  switch args->Belt.List.fromArray {
  | list{"-help" | "-h", ..._rest} =>
    Js.log(`Usage:
  init                                                      | Inits the config for the router.

  lsp                                                       | Starts a language server for the router.
    [-stdio]                                                |   [-stdio] will start the LS in stdio mode. Default is Node RPC mode.

  generate
    [-scaffold-renderers] [-delete-removed] [-w, --watch]   | Generates all routing code. Run this after making changes.
                                                            |   [-scaffold-renderers] will also run the command to scaffold 
                                                            |   route renderers.
                                                            |   [-w, --watch] runs this command in watch mode.

  scaffold-route-renderers
    [-delete-removed]                                       | Will automatically add route renderer files for all routes that 
                                                            | do not have them. 
                                                            |   [-delete-removed] will remove any route renderer that does not 
                                                            |   have a route defined anymore.

  find-route <url>                                          | Shows what routes/components will render for a specific route.
                                                            | Example: find-route /todos/123`)
    Done
  | list{"scaffold-route-renderers", ...options} =>
    let deleteRemoved = options->Belt.List.has("-delete-removed", \"=")
    let config = Utils.Config.load()

    Utils.ensureRouteStructure(config.routesFolderPath)

    Js.log("Scaffolding route renderers...")
    try {
      scaffoldRouteRenderers(~deleteRemoved, ~config)
      Js.log("Done!")
    } catch {
    | Utils.Decode_error(routeStructure) => routeStructure->Diagnostics.printDiagnostics(~config)
    }
    Done
  | list{"generate", ...options} => {
      let scaffoldAfterGenerating = options->Belt.List.has("-scaffold-renderers", \"=")
      let deleteRemoved = options->Belt.List.has("-delete-removed", \"=")
      let shouldWatch =
        options->Belt.List.has("-w", \"=") || options->Belt.List.has("--watch", \"=")

      let config = Utils.Config.load()

      Utils.ensureRouteStructure(config.routesFolderPath)

      let generateRoutesSafe = () => {
        try {
          generateRoutes(~scaffoldAfter=scaffoldAfterGenerating, ~deleteRemoved, ~config)
        } catch {
        | Js.Exn.Error(e) => Js.log(e->Js.Exn.message)
        | Utils.Decode_error(routeStructure) =>
          routeStructure->Diagnostics.printDiagnostics(~config)
        | _ =>
          Js.log(
            "Something went wrong generating your routes. Please check the validity of `routes.json`.",
          )
        }
      }

      generateRoutesSafe()

      if shouldWatch {
        open Chokidar

        Js.log("Watching routes...")

        let theWatcher =
          watcher
          ->watch(Utils.pathInRoutesFolder(~config, ~fileName="*.json", ()))
          ->Watcher.onChange(_ => {
            generateRoutesSafe()
          })
          ->Watcher.onUnlink(_ => {
            generateRoutesSafe()
          })
        Watcher({watcher: theWatcher})
      } else {
        Done
      }
    }
  | list{"find-route", route} =>
    let config = Utils.Config.load()
    printRouteInfo(~url=route, ~config)
    Done
  | list{"init"} =>
    init()
    Done

  | list{"lsp", ...options} =>
    let config = Utils.Config.load()
    let mode = if options->Belt.List.has("-stdio", \"=") {
      Lsp.Stdio
    } else {
      NodeRpc
    }
    let watcher = Lsp.start(~config, ~mode)
    Watcher({watcher: watcher})
  | _ =>
    Js.log("Unknown command. Use -help or -h to see all available commands.")
    Done
  }
}

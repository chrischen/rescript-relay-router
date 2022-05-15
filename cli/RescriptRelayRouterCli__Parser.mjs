// Generated by ReScript, PLEASE EDIT WITH CARE

import * as Path from "path";
import * as Curry from "rescript/lib/es6/curry.js";
import * as Js_dict from "rescript/lib/es6/js_dict.js";
import * as Js_json from "rescript/lib/es6/js_json.js";
import * as Belt_List from "rescript/lib/es6/belt_List.js";
import FastGlob from "fast-glob";
import * as Belt_Array from "rescript/lib/es6/belt_Array.js";
import * as FastFuzzy from "fast-fuzzy";
import * as Belt_Option from "rescript/lib/es6/belt_Option.js";
import * as Caml_option from "rescript/lib/es6/caml_option.js";
import * as JsoncParser from "./lsp/JsoncParser.mjs";
import * as JsoncParser$1 from "jsonc-parser";
import * as LinesAndColumns from "lines-and-columns";
import * as RescriptRelayRouterCli__Types from "./RescriptRelayRouterCli__Types.mjs";

function pathInRoutesFolder(config, fileNameOpt, param) {
  var fileName = fileNameOpt !== undefined ? fileNameOpt : "";
  return Path.join(config.routesFolderPath, fileName);
}

function stringToQueryParam(str) {
  if (str.startsWith("array<")) {
    var arrayValue = str.replace("array<", "");
    var arrayValue$1 = arrayValue.slice(0, arrayValue.length - 1 | 0);
    var value = stringToQueryParam(arrayValue$1);
    if (value.TAG === /* Ok */0) {
      return {
              TAG: /* Ok */0,
              _0: {
                TAG: /* Array */0,
                _0: value._0
              }
            };
    } else {
      return value;
    }
  }
  switch (str) {
    case "bool" :
        return {
                TAG: /* Ok */0,
                _0: /* Boolean */1
              };
    case "float" :
        return {
                TAG: /* Ok */0,
                _0: /* Float */3
              };
    case "int" :
        return {
                TAG: /* Ok */0,
                _0: /* Int */2
              };
    case "string" :
        return {
                TAG: /* Ok */0,
                _0: /* String */0
              };
    default:
      var firstChar = str.charAt(0);
      var correctEnding = str.endsWith(".t");
      if (!correctEnding) {
        return {
                TAG: /* Error */1,
                _0: undefined
              };
      }
      var match = firstChar.toUpperCase();
      if (firstChar === "" || firstChar !== match) {
        return {
                TAG: /* Error */1,
                _0: undefined
              };
      } else {
        return {
                TAG: /* Ok */0,
                _0: {
                  TAG: /* CustomModule */1,
                  moduleName: str.slice(0, str.length - 2 | 0)
                }
              };
      }
  }
}

var QueryParams = {
  stringToQueryParam: stringToQueryParam
};

function rangeFromNode(node, lineLookup) {
  return {
          start: lineLookup.locationForIndex(node.offset),
          end_: lineLookup.locationForIndex(node.offset + node.length | 0)
        };
}

function transformNode(node, ctx) {
  var loc = rangeFromNode(node, ctx.lineLookup);
  var match = node.type;
  var match$1 = node.value;
  var match$2 = node.children;
  if (match === "null") {
    return {
            TAG: /* Null */5,
            loc: loc,
            error: undefined
          };
  }
  if (match === "boolean") {
    if (match$1 === undefined) {
      return ;
    }
    var value = Js_json.decodeBoolean(Caml_option.valFromOption(match$1));
    if (value !== undefined) {
      return {
              TAG: /* Boolean */2,
              loc: loc,
              error: undefined,
              value: value
            };
    } else {
      return ;
    }
  }
  if (match === "string") {
    if (match$1 === undefined) {
      return ;
    }
    var value$1 = Js_json.decodeString(Caml_option.valFromOption(match$1));
    if (value$1 !== undefined) {
      return {
              TAG: /* String */3,
              loc: loc,
              error: undefined,
              value: value$1
            };
    } else {
      return ;
    }
  }
  if (match === "object") {
    if (match$2 === undefined) {
      return ;
    }
    var properties = [];
    return {
            TAG: /* Object */0,
            loc: loc,
            error: undefined,
            properties: (Belt_Array.forEach(match$2, (function (child) {
                      var match = child.type;
                      var match$1 = child.children;
                      if (match !== "property") {
                        return ;
                      }
                      if (match$1 === undefined) {
                        return ;
                      }
                      if (match$1.length !== 2) {
                        return ;
                      }
                      var match$2 = match$1[0];
                      if (match$2.type !== "string") {
                        return ;
                      }
                      var name = match$2.value;
                      if (name === undefined) {
                        return ;
                      }
                      var rawValue = match$1[1];
                      var match$3 = Js_json.decodeString(Caml_option.valFromOption(name));
                      var match$4 = transformNode(rawValue, ctx);
                      if (match$3 !== undefined && match$4 !== undefined) {
                        properties.push({
                              loc: rangeFromNode(child, ctx.lineLookup),
                              name: match$3,
                              value: match$4
                            });
                        return ;
                      }
                      
                    })), properties)
          };
  }
  if (match !== "number") {
    if (match === "array" && match$2 !== undefined) {
      return {
              TAG: /* Array */1,
              loc: loc,
              error: undefined,
              children: Belt_Array.keepMap(match$2, (function (child) {
                      return transformNode(child, ctx);
                    }))
            };
    } else {
      return ;
    }
  }
  if (match$1 === undefined) {
    return ;
  }
  var value$2 = Js_json.decodeNumber(Caml_option.valFromOption(match$1));
  if (value$2 !== undefined) {
    return {
            TAG: /* Number */4,
            loc: loc,
            error: undefined,
            value: value$2
          };
  }
  
}

var ReScriptTransformer = {
  rangeFromNode: rangeFromNode,
  transformNode: transformNode
};

var dummyPos = {
  start: {
    line: 0,
    column: 0
  },
  end_: {
    line: 0,
    column: 0
  }
};

function withoutQueryParams(path) {
  return Belt_Option.getWithDefault(Belt_Array.get(path.split("?"), 0), "");
}

function decodePathParams(path, loc, lineNum, ctx, parentContext) {
  var pathWithoutQueryParams = withoutQueryParams(path);
  var foundPathParams = [];
  var currentContext;
  var startCharIdx = loc.start.column + 1 | 0;
  var addParamIfNotAlreadyPresent = function (currentCtx, paramLoc) {
    var alreadySeenPathParam = Belt_List.getBy(parentContext.seenPathParams, (function (param) {
            return param.seenAtPosition.text === currentCtx.paramName;
          }));
    if (alreadySeenPathParam !== undefined) {
      if (alreadySeenPathParam.seenInSourceFile === ctx.routeFileName) {
        return Curry._2(ctx.addDecodeError, paramLoc, "Path parameter \"" + currentCtx.paramName + "\" already exists in route \"" + alreadySeenPathParam.seenInSourceFile + "\". Path parameters cannot appear more than once per full path.");
      } else {
        return Curry._2(ctx.addDecodeError, paramLoc, "Path parameter \"" + currentCtx.paramName + "\" already exists in file \"" + alreadySeenPathParam.seenInSourceFile + "\" (route with name \"" + alreadySeenPathParam.seenInSourceFile + "\"), which is a parent to this route. Path names need to be unique per full route, including parents/children.");
      }
    } else {
      foundPathParams.push({
            loc: {
              start: {
                line: lineNum,
                column: currentCtx.startChar
              },
              end_: {
                line: lineNum,
                column: path.length - 1 | 0
              }
            },
            text: currentCtx.paramName
          });
      return ;
    }
  };
  for(var charIdx = 0 ,charIdx_finish = pathWithoutQueryParams.length; charIdx < charIdx_finish; ++charIdx){
    var charLoc_start = {
      line: lineNum,
      column: startCharIdx + charIdx | 0
    };
    var charLoc_end_ = {
      line: lineNum,
      column: (startCharIdx + charIdx | 0) + 1 | 0
    };
    var charLoc = {
      start: charLoc_start,
      end_: charLoc_end_
    };
    var match = currentContext;
    var match$1 = pathWithoutQueryParams[charIdx];
    if (match !== undefined) {
      if (match$1 === "/") {
        if (match.paramName.length === 0) {
          Curry._2(ctx.addDecodeError, {
                start: {
                  line: lineNum,
                  column: (startCharIdx + charIdx | 0) - 1 | 0
                },
                end_: {
                  line: lineNum,
                  column: startCharIdx + charIdx | 0
                }
              }, "Path parameter names cannot be empty.");
        }
        var paramLoc_start = {
          line: lineNum,
          column: match.startChar
        };
        var paramLoc_end_ = {
          line: lineNum,
          column: (startCharIdx + charIdx | 0) - 1 | 0
        };
        var paramLoc = {
          start: paramLoc_start,
          end_: paramLoc_end_
        };
        addParamIfNotAlreadyPresent(match, paramLoc);
        currentContext = undefined;
      } else {
        currentContext = {
          startChar: match.startChar,
          endChar: match.endChar,
          paramName: match.paramName + match$1
        };
        var match$2 = match.paramName.length;
        if (match$2 !== 0) {
          if (/[A-Za-z0-9_]/.test(match$1)) {
            
          } else {
            Curry._2(ctx.addDecodeError, charLoc, "\"" + match$1 + "\" is not a valid character in a path parameter. Path parameters can contain letters, digits, and underscores.");
          }
        } else if (/[a-z]/.test(match$1)) {
          
        } else {
          Curry._2(ctx.addDecodeError, charLoc, "Path parameters must start with a lowercase letter.");
        }
      }
    } else if (match$1 === ":") {
      currentContext = {
        startChar: startCharIdx + charIdx | 0,
        endChar: undefined,
        paramName: ""
      };
    }
    
  }
  var currentCtx = currentContext;
  if (currentCtx !== undefined) {
    var paramLoc_start$1 = {
      line: lineNum,
      column: currentCtx.startChar
    };
    var paramLoc_end_$1 = {
      line: lineNum,
      column: startCharIdx + pathWithoutQueryParams.length | 0
    };
    var paramLoc$1 = {
      start: paramLoc_start$1,
      end_: paramLoc_end_$1
    };
    addParamIfNotAlreadyPresent(currentCtx, paramLoc$1);
  }
  return foundPathParams;
}

var queryParamNames = [
  "string",
  "int",
  "float",
  "bool",
  "array"
];

function handleCompletedParam(completedParamCtx, ctx, foundQueryParams, lineNum) {
  var keyEndChar = completedParamCtx.keyEndChar;
  if (keyEndChar === undefined) {
    return ;
  }
  var typeStartChar = completedParamCtx.typeStartChar;
  if (typeStartChar === undefined) {
    return ;
  }
  var typeEndChar = completedParamCtx.typeEndChar;
  if (typeEndChar === undefined) {
    return ;
  }
  var rawTypeText = completedParamCtx.rawTypeText;
  if (rawTypeText === undefined) {
    return ;
  }
  var queryParamLoc_start = {
    line: lineNum,
    column: typeStartChar
  };
  var queryParamLoc_end_ = {
    line: lineNum,
    column: typeEndChar
  };
  var queryParamLoc = {
    start: queryParamLoc_start,
    end_: queryParamLoc_end_
  };
  var keyLoc_start = {
    line: lineNum,
    column: completedParamCtx.keyStartChar
  };
  var keyLoc_end_ = {
    line: lineNum,
    column: keyEndChar
  };
  var keyLoc = {
    start: keyLoc_start,
    end_: keyLoc_end_
  };
  var queryParam = stringToQueryParam(rawTypeText);
  if (queryParam.TAG === /* Ok */0) {
    foundQueryParams.push({
          name: {
            loc: keyLoc,
            text: completedParamCtx.key
          },
          queryParam: [
            queryParamLoc,
            queryParam._0
          ]
        });
    return ;
  }
  var fuzzyMatches = FastFuzzy.search(rawTypeText, queryParamNames);
  var message = "\"" + rawTypeText + "\" is not a valid query param type.\n  " + (
    fuzzyMatches.length > 0 ? "Did you mean \"" + fuzzyMatches[0] + "\"?" : (
        rawTypeText === "boolean" ? "Did you mean \"bool\"?" : "Valid types are: string, int, float, bool, custom modules (SomeModule.t), and arrays of those."
      )
  );
  return Curry._2(ctx.addDecodeError, queryParamLoc, message);
}

function decodeQueryParams(path, loc, lineNum, ctx, parentContext) {
  var queryParamsStr = path.split("?").pop();
  if (queryParamsStr === undefined) {
    return [];
  }
  var startChar = ((loc.start.column + path.length | 0) - queryParamsStr.length | 0) + 1 | 0;
  var foundQueryParams = [];
  var context;
  for(var charIdx = 0 ,charIdx_finish = queryParamsStr.length; charIdx < charIdx_finish; ++charIdx){
    var $$char = queryParamsStr[charIdx];
    var match = context;
    if (match !== undefined) {
      var rawTypeText = match.rawTypeText;
      switch ($$char) {
        case "&" :
            handleCompletedParam({
                  keyStartChar: match.keyStartChar,
                  keyEndChar: match.keyEndChar,
                  typeStartChar: match.typeStartChar,
                  typeEndChar: startChar + charIdx | 0,
                  key: match.key,
                  rawTypeText: match.rawTypeText
                }, ctx, foundQueryParams, lineNum);
            context = undefined;
            break;
        case "=" :
            context = {
              keyStartChar: match.keyStartChar,
              keyEndChar: (startChar + charIdx | 0) - 1 | 0,
              typeStartChar: (startChar + charIdx | 0) + 1 | 0,
              typeEndChar: match.typeEndChar,
              key: match.key,
              rawTypeText: ""
            };
            break;
        default:
          context = rawTypeText !== undefined ? ({
                keyStartChar: match.keyStartChar,
                keyEndChar: match.keyEndChar,
                typeStartChar: match.typeStartChar,
                typeEndChar: match.typeEndChar,
                key: match.key,
                rawTypeText: rawTypeText + $$char
              }) : ({
                keyStartChar: match.keyStartChar,
                keyEndChar: match.keyEndChar,
                typeStartChar: match.typeStartChar,
                typeEndChar: match.typeEndChar,
                key: match.key + $$char,
                rawTypeText: match.rawTypeText
              });
      }
    } else {
      context = {
        keyStartChar: startChar + charIdx | 0,
        keyEndChar: undefined,
        typeStartChar: undefined,
        typeEndChar: undefined,
        key: $$char,
        rawTypeText: undefined
      };
    }
  }
  var completedParamCtx = context;
  if (completedParamCtx !== undefined) {
    handleCompletedParam({
          keyStartChar: completedParamCtx.keyStartChar,
          keyEndChar: completedParamCtx.keyEndChar,
          typeStartChar: completedParamCtx.typeStartChar,
          typeEndChar: loc.end_.column - 1 | 0,
          key: completedParamCtx.key,
          rawTypeText: completedParamCtx.rawTypeText
        }, ctx, foundQueryParams, lineNum);
  }
  var queryParamsResult = [];
  Belt_Array.forEach([].concat(parentContext.seenQueryParams, foundQueryParams), (function (param) {
          if (Belt_Array.some(queryParamsResult, (function (p) {
                    return p.name.text === param.name.text;
                  }))) {
            return ;
          } else {
            queryParamsResult.push(param);
            return ;
          }
        }));
  return queryParamsResult;
}

var Path$1 = {
  withoutQueryParams: withoutQueryParams,
  decodePathParams: decodePathParams,
  queryParamNames: queryParamNames,
  handleCompletedParam: handleCompletedParam,
  decodeQueryParams: decodeQueryParams
};

function routeWithNameAlreadyExists(existingChildren, routeName) {
  return existingChildren.some(function (child) {
              if (child.TAG === /* Include */0) {
                return routeWithNameAlreadyExists(child._0.content, routeName);
              } else {
                return RescriptRelayRouterCli__Types.RouteName.getRouteName(child._0.name) === routeName;
              }
            });
}

function validateName(nameNode, ctx, siblings) {
  if (nameNode === undefined) {
    return ;
  }
  var node = nameNode.value;
  var loc = nameNode.loc;
  if (node.TAG === /* String */3) {
    var value = node.value;
    var loc$1 = node.loc;
    if (value === "Route") {
      Curry._2(ctx.addDecodeError, loc$1, "\"Route\" is a reserved name. Please change your route name to something else.");
      return {
              loc: loc$1,
              name: "_"
            };
    }
    var match = /^[A-Z][a-zA-Z0-9_]+$/.test(value);
    var match$1 = routeWithNameAlreadyExists(siblings, value);
    if (match) {
      if (match$1) {
        Curry._2(ctx.addDecodeError, loc$1, "Duplicate route \"" + value + "\". Routes cannot have siblings with the same names.");
        return {
                loc: loc$1,
                name: "_"
              };
      } else {
        return {
                loc: loc$1,
                name: value
              };
      }
    } else {
      Curry._2(ctx.addDecodeError, loc$1, "\"" + value + "\" is not a valid route name. Route names need to start with an uppercase letter, and can only contain letters, digits and underscores.");
      return {
              loc: loc$1,
              name: "_"
            };
    }
  }
  Curry._2(ctx.addDecodeError, loc, "\"name\" needs to be a string. Found " + JsoncParser.nodeToString(node) + ".");
  return {
          loc: loc,
          name: "_"
        };
}

function validatePath(pathNode, ctx, parentContext) {
  if (pathNode === undefined) {
    return ;
  }
  var node = pathNode.value;
  var loc = pathNode.loc;
  if (node.TAG === /* String */3) {
    var value = node.value;
    var pathValueLoc = node.loc;
    return {
            loc: loc,
            pathRaw: value,
            queryParams: decodeQueryParams(value, pathValueLoc, loc.start.line, ctx, parentContext),
            pathParams: decodePathParams(value, pathValueLoc, loc.start.line, ctx, parentContext)
          };
  }
  Curry._2(ctx.addDecodeError, loc, "\"path\" needs to be a string. Found " + JsoncParser.nodeToString(node) + ".");
  return {
          loc: loc,
          pathRaw: "_",
          queryParams: [],
          pathParams: []
        };
}

var Validators = {
  routeWithNameAlreadyExists: routeWithNameAlreadyExists,
  validateName: validateName,
  validatePath: validatePath
};

function locFromNode(node) {
  return node.loc;
}

function findPropertyWithName(properties, name) {
  return Belt_Array.getBy(properties, (function (prop) {
                return prop.name === name;
              }));
}

function decodeRouteChildren(children, ctx, parentContext) {
  var foundChildren = [];
  Belt_Array.forEach(children, (function (child) {
          var parseError = decodeRouteChild(child, ctx, foundChildren, parentContext);
          if (parseError.TAG === /* Ok */0) {
            foundChildren.push(parseError._0);
            return ;
          }
          var parseError$1 = parseError._0;
          Curry._2(ctx.addDecodeError, parseError$1.loc, parseError$1.message);
          
        }));
  return foundChildren;
}

function decodeRouteChild(child, ctx, siblings, parentContext) {
  if (child.TAG !== /* Object */0) {
    return {
            TAG: /* Error */1,
            _0: {
              routeFileName: ctx.routeFileName,
              message: "Routes must be objects. Found " + JsoncParser.nodeToString(child) + ".",
              loc: child.loc
            }
          };
  }
  var properties = child.properties;
  var objLoc = child.loc;
  var includeProp = findPropertyWithName(properties, "include");
  if (includeProp !== undefined) {
    var keyLoc = includeProp.loc;
    if (includeProp.name === "include") {
      var match = includeProp.value;
      if (match.TAG === /* String */3) {
        var fileName = match.value;
        var valueLoc = match.loc;
        Belt_Array.forEach(properties, (function (prop) {
                if (prop.name !== "include") {
                  return Curry._2(ctx.addDecodeError, prop.loc, "Property \"" + prop.name + "\" is not allowed together with \"include\".");
                }
                
              }));
        var errorRecoveryIncludeNode = {
          TAG: /* Include */0,
          _0: {
            loc: objLoc,
            keyLoc: keyLoc,
            fileName: {
              loc: valueLoc,
              text: fileName
            },
            content: [],
            parentRouteFiles: Belt_List.toArray(parentContext.traversedRouteFiles)
          }
        };
        if (fileName.endsWith(".json")) {
          var message = Curry._2(ctx.getRouteFile, fileName, parentContext);
          if (message.TAG === /* Ok */0) {
            return {
                    TAG: /* Ok */0,
                    _0: {
                      TAG: /* Include */0,
                      _0: {
                        loc: objLoc,
                        keyLoc: keyLoc,
                        fileName: {
                          loc: valueLoc,
                          text: fileName
                        },
                        content: message._0.content,
                        parentRouteFiles: Belt_List.toArray(parentContext.traversedRouteFiles)
                      }
                    }
                  };
          }
          Curry._2(ctx.addDecodeError, objLoc, message._0);
          return {
                  TAG: /* Ok */0,
                  _0: errorRecoveryIncludeNode
                };
        }
        Curry._2(ctx.addDecodeError, valueLoc, "Route file to include must have .json extension.");
        return {
                TAG: /* Ok */0,
                _0: errorRecoveryIncludeNode
              };
      }
      
    }
    
  }
  var pathProp = findPropertyWithName(properties, "path");
  var nameProp = findPropertyWithName(properties, "name");
  var children = findPropertyWithName(properties, "children");
  var name = validateName(nameProp, ctx, siblings);
  var path = validatePath(pathProp, ctx, parentContext);
  if (path === undefined) {
    if (name !== undefined) {
      Curry._2(ctx.addDecodeError, objLoc, "This route entry is missing the \"path\" prop.");
      return {
              TAG: /* Ok */0,
              _0: {
                TAG: /* RouteEntry */1,
                _0: {
                  loc: objLoc,
                  name: RescriptRelayRouterCli__Types.RouteName.make({
                        hd: "_",
                        tl: /* [] */0
                      }, name.loc),
                  path: {
                    loc: dummyPos,
                    text: "_"
                  },
                  routePath: RescriptRelayRouterCli__Types.RoutePath.empty(undefined),
                  pathParams: [],
                  queryParams: [],
                  children: undefined,
                  sourceFile: ctx.routeFileName,
                  parentRouteFiles: Belt_List.toArray(parentContext.traversedRouteFiles)
                }
              }
            };
    } else {
      return {
              TAG: /* Error */1,
              _0: {
                routeFileName: ctx.routeFileName,
                message: "Invalid route entry found.",
                loc: objLoc
              }
            };
    }
  }
  if (name !== undefined) {
    var thisRouteNamePath_0 = name.name;
    var thisRouteNamePath_1 = parentContext.currentRouteNamePath;
    var thisRouteNamePath = {
      hd: thisRouteNamePath_0,
      tl: thisRouteNamePath_1
    };
    var routePath = RescriptRelayRouterCli__Types.RoutePath.make(path.pathRaw, parentContext.currentRoutePath);
    var children$1;
    if (children !== undefined) {
      var match$1 = children.value;
      children$1 = match$1.TAG === /* Array */1 ? decodeRouteChildren(match$1.children, ctx, {
              seenQueryParams: path.queryParams,
              currentRoutePath: routePath,
              currentRouteNamePath: thisRouteNamePath,
              seenPathParams: Belt_List.concatMany([
                    parentContext.seenPathParams,
                    Belt_List.map(Belt_List.fromArray(path.pathParams), (function (pathParam) {
                            return {
                                    seenInSourceFile: ctx.routeFileName,
                                    seenAtPosition: pathParam
                                  };
                          }))
                  ]),
              traversedRouteFiles: parentContext.traversedRouteFiles
            }) : undefined;
    } else {
      children$1 = undefined;
    }
    return {
            TAG: /* Ok */0,
            _0: {
              TAG: /* RouteEntry */1,
              _0: {
                loc: objLoc,
                name: RescriptRelayRouterCli__Types.RouteName.make(Belt_List.reverse(thisRouteNamePath), name.loc),
                path: {
                  loc: path.loc,
                  text: path.pathRaw
                },
                routePath: routePath,
                pathParams: path.pathParams,
                queryParams: path.queryParams.slice(),
                children: children$1,
                sourceFile: ctx.routeFileName,
                parentRouteFiles: Belt_List.toArray(parentContext.traversedRouteFiles)
              }
            }
          };
  }
  Curry._2(ctx.addDecodeError, objLoc, "This route entry is missing the \"name\" prop.");
  var routePath$1 = RescriptRelayRouterCli__Types.RoutePath.make(path.pathRaw, parentContext.currentRoutePath);
  return {
          TAG: /* Ok */0,
          _0: {
            TAG: /* RouteEntry */1,
            _0: {
              loc: objLoc,
              name: RescriptRelayRouterCli__Types.RouteName.make({
                    hd: "_",
                    tl: /* [] */0
                  }, dummyPos),
              path: {
                loc: path.loc,
                text: path.pathRaw
              },
              routePath: routePath$1,
              pathParams: path.pathParams,
              queryParams: path.queryParams.slice(),
              children: undefined,
              sourceFile: ctx.routeFileName,
              parentRouteFiles: Belt_List.toArray(parentContext.traversedRouteFiles)
            }
          }
        };
}

function decode(node, ctx, parentContext) {
  if (node !== undefined) {
    if (node.TAG === /* Array */1) {
      var children = node.children;
      if (children.length !== 0) {
        return decodeRouteChildren(children, ctx, parentContext);
      } else {
        Curry._2(ctx.addDecodeError, node.loc, "Empty route file. Route files should not be empty.");
        return [];
      }
    }
    Curry._2(ctx.addDecodeError, node.loc, "Route files must have a top level array. Found " + JsoncParser.nodeToString(node) + ".");
    return [];
  }
  Curry._2(ctx.addDecodeError, {
        start: ctx.lineLookup.locationForIndex(0),
        end_: ctx.lineLookup.locationForIndex(0)
      }, "Empty file..");
  return [];
}

var Decode = {
  locFromNode: locFromNode,
  findPropertyWithName: findPropertyWithName,
  decodeRouteChildren: decodeRouteChildren,
  decodeRouteChild: decodeRouteChild,
  decode: decode
};

function parseRouteFile(routeFileName, config, decodeErrors, parserContext, parentContext) {
  var parseErrors = [];
  var content = Curry._1(parserContext.getRouteFileContents, routeFileName);
  if (content.TAG !== /* Ok */0) {
    return {
            result: [],
            rawText: ""
          };
  }
  var content$1 = content._0;
  var lineLookup = new LinesAndColumns.LinesAndColumns(content$1);
  var ctx_addDecodeError = function (loc, message) {
    decodeErrors.push({
          routeFileName: routeFileName,
          message: message,
          loc: loc
        });
    
  };
  var ctx_getRouteFile = function (fileName, parentContext) {
    var match = parserContext.routeFileNames.includes(fileName);
    var match$1 = Js_dict.get(parserContext.routeFiles, fileName);
    if (match$1 !== undefined) {
      return {
              TAG: /* Ok */0,
              _0: match$1
            };
    }
    if (match) {
      var match$2 = parseRouteFile(fileName, config, decodeErrors, parserContext, parentContext);
      var loadedRouteFile_rawText = match$2.rawText;
      var loadedRouteFile_content = match$2.result;
      var loadedRouteFile = {
        fileName: fileName,
        rawText: loadedRouteFile_rawText,
        content: loadedRouteFile_content
      };
      parserContext.routeFiles[fileName] = loadedRouteFile;
      return {
              TAG: /* Ok */0,
              _0: loadedRouteFile
            };
    }
    var matched = Belt_Array.get(FastFuzzy.search(fileName, parserContext.routeFileNames), 0);
    return {
            TAG: /* Error */1,
            _0: "\"" + fileName + "\" could not be found. " + (
              matched !== undefined ? "Did you mean \"" + matched + "\"?" : "Does it exist?"
            )
          };
  };
  var ctx = {
    routeFileName: routeFileName,
    lineLookup: lineLookup,
    addDecodeError: ctx_addDecodeError,
    getRouteFile: ctx_getRouteFile
  };
  var nextParentContext_seenQueryParams = parentContext.seenQueryParams;
  var nextParentContext_currentRoutePath = parentContext.currentRoutePath;
  var nextParentContext_currentRouteNamePath = parentContext.currentRouteNamePath;
  var nextParentContext_seenPathParams = parentContext.seenPathParams;
  var nextParentContext_traversedRouteFiles = {
    hd: routeFileName,
    tl: parentContext.traversedRouteFiles
  };
  var nextParentContext = {
    seenQueryParams: nextParentContext_seenQueryParams,
    currentRoutePath: nextParentContext_currentRoutePath,
    currentRouteNamePath: nextParentContext_currentRouteNamePath,
    seenPathParams: nextParentContext_seenPathParams,
    traversedRouteFiles: nextParentContext_traversedRouteFiles
  };
  var node = JsoncParser$1.parseTree(content$1, parseErrors, {"disallowComments": false,"allowTrailingComma": true,"allowEmptyContent": true});
  var result = node !== undefined ? decode(transformNode(node, ctx), ctx, nextParentContext) : decode(undefined, ctx, nextParentContext);
  Belt_Array.forEach(parseErrors, (function (parseError) {
          var linesAndColumns = new LinesAndColumns.LinesAndColumns(content$1);
          var match = Belt_Option.getWithDefault(JsoncParser.decodeParseErrorCode(parseError.error), /* InvalidSymbol */0);
          var tmp;
          switch (match) {
            case /* InvalidSymbol */0 :
                tmp = "Invalid symbol.";
                break;
            case /* InvalidNumberFormat */1 :
                tmp = "Invalid number format.";
                break;
            case /* PropertyNameExpected */2 :
                tmp = "Expected property name.";
                break;
            case /* ValueExpected */3 :
                tmp = "Expected value.";
                break;
            case /* ColonExpected */4 :
                tmp = "Expected colon.";
                break;
            case /* CommaExpected */5 :
                tmp = "Expected comma.";
                break;
            case /* CloseBraceExpected */6 :
                tmp = "Expected close brace.";
                break;
            case /* CloseBracketExpected */7 :
                tmp = "Expected close bracket.";
                break;
            case /* EndOfFileExpected */8 :
                tmp = "Expected end of file.";
                break;
            case /* InvalidCommentToken */9 :
                tmp = "Invalid comment token.";
                break;
            case /* UnexpectedEndOfComment */10 :
                tmp = "Unexpected end of comment.";
                break;
            case /* UnexpectedEndOfString */11 :
                tmp = "Unexpected end of string.";
                break;
            case /* UnexpectedEndOfNumber */12 :
                tmp = "Unexpected end of number.";
                break;
            case /* InvalidUnicode */13 :
                tmp = "Invalid unicode.";
                break;
            case /* InvalidEscapeCharacter */14 :
                tmp = "Invalid escape character.";
                break;
            case /* InvalidCharacter */15 :
                tmp = "Invalid character.";
                break;
            
          }
          decodeErrors.push({
                routeFileName: routeFileName,
                message: tmp,
                loc: {
                  start: linesAndColumns.locationForIndex(parseError.offset),
                  end_: linesAndColumns.locationForIndex(parseError.offset + parseError.length | 0)
                }
              });
          
        }));
  return {
          result: result,
          rawText: content$1
        };
}

function readRouteStructure(config, getRouteFileContents) {
  var routeFiles = {};
  var decodeErrors = [];
  var match = parseRouteFile("routes.json", config, decodeErrors, {
        routeFileNames: Curry._2(FastGlob.sync, ["*.json"], {
              cwd: pathInRoutesFolder(config, undefined, undefined)
            }),
        routeFiles: routeFiles,
        getRouteFileContents: getRouteFileContents
      }, {
        seenQueryParams: [],
        currentRoutePath: RescriptRelayRouterCli__Types.RoutePath.empty(undefined),
        currentRouteNamePath: /* [] */0,
        seenPathParams: /* [] */0,
        traversedRouteFiles: /* [] */0
      });
  var result = match.result;
  routeFiles["routes.json"] = {
    fileName: "routes.json",
    rawText: match.rawText,
    content: result
  };
  return {
          errors: decodeErrors,
          result: result,
          routeFiles: routeFiles
        };
}

var Bindings;

export {
  Bindings ,
  pathInRoutesFolder ,
  QueryParams ,
  ReScriptTransformer ,
  dummyPos ,
  Path$1 as Path,
  Validators ,
  Decode ,
  parseRouteFile ,
  readRouteStructure ,
  
}
/* path Not a pure module */

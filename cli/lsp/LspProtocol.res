// Holds LSP protocol stuff + helpers.
type loc = {
  line: int,
  character: int,
}

type range = {
  start: loc,
  @as("end") end_: loc,
}

@live
type location = {
  uri: string,
  range: range,
}

@live
type diagnostic = {
  range: range,
  message: string,
  source: string,
}

let makeDiagnostic = (~range, ~message) => {
  range: range,
  message: message,
  source: "RescriptRelayRouter",
}

@live
type markupContent = {
  kind: [#plaintext | #markdown],
  value: string,
}

@live
type hover = {
  contents: markupContent,
  range: option<range>,
}

let makeHover = (~message, ~loc) => {
  contents: {
    kind: #markdown,
    value: message,
  },
  range: Some(loc),
}

@live
type completionItemKind =
  | Text
  | Method
  | Function
  | Constructor
  | Field
  | Variable
  | Class
  | Interface
  | Module
  | Property
  | Unit
  | Value
  | Enum
  | Keyword
  | Snippet
  | Color
  | File
  | Reference
  | Folder
  | EnumMember
  | Constant
  | Struct
  | Event
  | Operator
  | TypeParameter

@live
let completionItemToInt = item =>
  switch item {
  | Text => 1
  | Method => 2
  | Function => 3
  | Constructor => 4
  | Field => 5
  | Variable => 6
  | Class => 7
  | Interface => 8
  | Module => 9
  | Property => 10
  | Unit => 11
  | Value => 12
  | Enum => 13
  | Keyword => 14
  | Snippet => 15
  | Color => 16
  | File => 17
  | Reference => 18
  | Folder => 19
  | EnumMember => 20
  | Constant => 21
  | Struct => 22
  | Event => 23
  | Operator => 24
  | TypeParameter => 25
  }

@live
type completionItem = {label: string, kind: completionItemKind}

let makeCompletionItem = (~label, ~kind) => {
  label: label,
  kind: kind,
}

@live
type command = {
  title: string,
  command: string,
  arguments: option<array<string>>,
}

@live
type codeLens = {
  range: range,
  command: command,
}

module Command = {
  @live
  let makeOpenFileCommand = (~title, ~fileUri) => {
    title: title,
    command: `vscode.open`,
    arguments: Some([fileUri]),
  }

  let makeOpenFileAtPosCommand = (~title, ~fileUri, ~pos) => {
    title: title,
    command: `vscode-rescript-relay.open-pos-in-doc`,
    arguments: Some([fileUri, pos.line->Belt.Int.toString, pos.character->Belt.Int.toString]),
  }

  let makeTextOnlyCommand = title => {
    title: title,
    command: "",
    arguments: None,
  }
}

let makeCodeLensItem = (~range, ~command) => {
  range: range,
  command: command,
}

@live
type documentLink = {
  range: range,
  target: string,
  tooltip: option<string>,
}

let makeDocumentLink = (~range, ~fileUri, ~tooltip=?, ()) => {
  range: range,
  target: fileUri,
  tooltip: tooltip,
}

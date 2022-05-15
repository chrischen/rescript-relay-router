// Generated by ReScript, PLEASE EDIT WITH CARE

import * as Belt_Array from "rescript/lib/es6/belt_Array.js";
import * as Belt_Option from "rescript/lib/es6/belt_Option.js";
import * as Caml_option from "rescript/lib/es6/caml_option.js";
import * as AddonKnobs from "@storybook/addon-knobs";

function floatByRange(label, $$default, min, max, step) {
  return AddonKnobs.number(label, $$default, {
              range: true,
              min: min,
              max: max,
              step: step
            });
}

function intByRange(label, $$default, min, max, step) {
  return AddonKnobs.number(label, $$default, {
              range: true,
              min: min,
              max: max,
              step: step
            });
}

function metadata(title, component, decorators, excludeStories, parametersOpt, param) {
  var parameters = parametersOpt !== undefined ? Caml_option.valFromOption(parametersOpt) : ({
        knobs: {
          escapeHTML: false
        }
      });
  var tmp = {
    title: title,
    excludeStories: Belt_Array.concat(Belt_Option.getWithDefault(excludeStories, []), ["$$default"]),
    parameters: parameters
  };
  if (component !== undefined) {
    tmp.component = Caml_option.valFromOption(component);
  }
  if (decorators !== undefined) {
    tmp.decorators = Caml_option.valFromOption(decorators);
  }
  return tmp;
}

var Story = {
  metadata: metadata
};

export {
  floatByRange ,
  intByRange ,
  Story ,
  
}
/* @storybook/addon-knobs Not a pure module */

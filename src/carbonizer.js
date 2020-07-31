var sketch = require('sketch'); // documentation: https://developer.sketchapp.com/reference/api/
var document = sketch.getSelectedDocument();

// Regular expressions used to find and replace layer names
const EXPRESSION_PATH_COMPONENT = /^utilities \/ spacer \/ component \/ .+? \/ (.+?) \/ .+/;
const EXPRESSION_PATH_LAYOUT = /^utilities \/ spacer \/ layout \/ (.+?) /;
const EXPRESSION_PATH_PB = /^(layout|spacing) \/ redline \/ (horizontal|vertical) \/ /;
const EXPRESSION_RENAME = /(spacing|layout)-../;
const EXPRESSION_TEMPLATE = /Layout grid [0-1][0-9]?/;
const TEMPLATE_LAYERS = [
  'Layout grid',
  'outside-margin',
  'outside-margin-left',
  'outside-margin-right'
];
const WARNING_TITLE = 'WARNING';
const WARNING_MESSAGE =
  'This action is not reversible after you quit Sketch. After this runs, UNDO (Cmd + Z) and make a copy if you forgot!';

function carbonizeAllPages() {
  sketch.UI.alert(WARNING_TITLE, WARNING_MESSAGE);
  let log = [];
  document.pages.forEach(page => {
    log.push(page.name);
    page.layers.forEach(layer => {
      log = log.concat(processLayer(layer));
    });
    sketch.UI.message(`Finished Carbonizing ${log.length} layers in ${pages.length} pages`);
  });
  console.log(log);
}

function carbonizePage() {
  sketch.UI.alert(WARNING_TITLE, WARNING_MESSAGE);
  let log = [];
  document.selectedPage.layers.forEach(layer => {
    log = log.concat(processLayer(layer));
  });
  console.log(log);
  sketch.UI.message(`Finished Carbonizing ${log.length} layers in ${document.selectedPage.name}`);
}

function carbonizeArtboard() {
  sketch.UI.alert(WARNING_TITLE, WARNING_MESSAGE);
  if (
    document.selectedLayers.length === 1 &&
    document.selectedLayers.layers[0].type === 'Artboard'
  ) {
    const log = processLayer(document.selectedLayers.layers[0]);
    console.log(log);
    sketch.UI.message(
      `Finished Carbonizing ${log.length} layers in ${document.selectedLayers.layers[0].name}`
    );
  } else {
    sketch.UI.message('No Artboard selected');
  }
}

function carbonizeLayer() {
  sketch.UI.alert(WARNING_TITLE, WARNING_MESSAGE);
  if (document.selectedLayers.length === 1) {
    const log = processLayer(document.selectedLayers.layers[0]);
    console.log(log);
    sketch.UI.message(
      `Finished Carbonizing ${log.length} layers in ${document.selectedLayers.layers[0].name}`
    );
  } else {
    sketch.UI.message('No Layer selected');
  }
}

function processLayer(layer) {
  let log = [];
  log = _processLayer(layer, log);
  return log;
}

function _processLayer(layer, log) {
  if (TEMPLATE_LAYERS.includes(layer.name.trim()) || EXPRESSION_TEMPLATE.test(layer.name.trim())) {
    layer.locked = true;
    return log;
  }
  layer.locked = false;
  const isValid = layer => {
    let isValid = false;
    isValid = isValid || EXPRESSION_PATH_COMPONENT.test(layer.master.name);
    isValid = isValid || EXPRESSION_PATH_LAYOUT.test(layer.master.name);
    isValid = isValid || EXPRESSION_PATH_PB.test(layer.master.name);
    return isValid;
  };
  switch (layer.type) {
    case 'SymbolInstance': {
      if (isValid(layer)) log.push(detachRenameSymbol(layer, EXPRESSION_RENAME));
      else log.push(`[${layer.type}] ${layer.name}: Symbol does not match regular expression`);
      break;
    }
    case 'Text':
    case 'Shape':
    case 'ShapePath': {
      if (layer.sharedStyle === null) {
        log.push(`[${layer.type}] ${layer.name}: Layer has no style applied`);
        break;
      }
      const oldName = layer.name;
      layer.name = layer.sharedStyle.name;
      log.push(`[${layer.type}] ${oldName}: Successfully renamed to ${layer.name}`);
      break;
    }
    case 'Group':
    case 'Artboard':
      layer.layers.forEach(child => _processLayer(child, log));
      break;
    default:
      log.push(`[${layer.type}] ${layer.name}: Layer is not an accepted type`);
  }
  return log;
}

/**
 * Detach the given SymbolInstance layer into a group and rename it based on the provided
 * regular expression. The regular expression is used to match a substring in the name of
 * the SymbolInstance's master.
 *
 * @param {*} layer the SymbolInstance to rename
 * @param {*} renameExpression the regular expression to rename the layer
 */
function detachRenameSymbol(layer, renameExpression) {
  const oldName = layer.name;
  const name = layer.master.name.match(renameExpression)[0];
  let group = layer.detach(); // detach the symbol into a group
  group.name = name; // rename the group to a substring of the original style's name
  group.layers.forEach(childLayer => {
    childLayer.name = group.name; // rename the children layers to their group's name
    childLayer.locked = false; // make sure to unlock the children
  });
  return `[${layer.type}] ${oldName}: Successfully renamed to ${layer.name}`;
}

// This function is unused future functionality to
// save the sketch file before renaming the layers in it
function saveDocument(document) {
  document.save(
    '~/Desktop/Carbonizer Temp.sketch',
    { saveMode: sketch.Document.SaveMode.SaveAs },
    err => {
      if (err) sketch.UI.alert('Error', 'Doc save failed');
      console.log(err);
    }
  );
}

export { carbonizeAllPages, carbonizePage, carbonizeArtboard, carbonizeLayer };

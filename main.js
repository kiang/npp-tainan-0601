window.app = {};
var app = window.app;

app.Button = function(opt_options) {
  var options = opt_options || {};
  var button = document.createElement('button');
  button.innerHTML = options.bText;
  var this_ = this;
  var handleButtonClick = function() {
    window.open(options.bHref);
  };

  button.addEventListener('click', handleButtonClick, false);
  button.addEventListener('touchstart', handleButtonClick, false);

  var element = document.createElement('div');
  element.className = options.bClassName + ' ol-unselectable ol-control';
  element.appendChild(button);

  ol.control.Control.call(this, {
    element: element,
    target: options.target
  });
}
ol.inherits(app.Button, ol.control.Control);

var layerYellow = new ol.style.Style({
  stroke: new ol.style.Stroke({
    color: 'blue',
    width: 3
  }),
  fill: new ol.style.Fill({
    color: 'rgba(0, 0, 255, 0.1)'
  })
});

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
for (var z = 0; z < 20; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var popup = new ol.Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

closer.onclick = function() {
  popup.setPosition(undefined);
  closer.blur();
  return false;
};

var baseLayer = new ol.layer.Tile({
    source: new ol.source.WMTS({
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        url: 'http://wmts.nlsc.gov.tw/wmts',
        layer: 'EMAP',
        tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(projectionExtent),
            resolutions: resolutions,
            matrixIds: matrixIds
        }),
        style: 'default',
        wrapX: true,
        attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
    }),
    opacity: 0.5
});

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.301507, 23.124694]),
  zoom: 11
});

var map = new ol.Map({
  layers: [baseLayer],
  overlays: [popup],
  target: 'map',
  view: appView,
  controls: ol.control.defaults().extend([
    new app.Button({
      bClassName: 'app-button1',
      bText: '原',
      bHref: 'https://github.com/kiang/npp-tainan-6001'
    }),
    new app.Button({
      bClassName: 'app-button2',
      bText: '力',
      bHref: 'https://npptw.org/tainan'
    })
  ])
});

var umapLayers = {};
var umapLayersCount = 0;
readTextFile('../raw/' + mapId + '.json', function(text){
    var data = JSON.parse(text);
    for(k in data.properties.datalayers) {
      ++umapLayersCount;
      umapLayers[data.properties.datalayers[k].id] = new ol.layer.Vector({
          source: new ol.source.Vector({
              url: '../raw/layer_' + data.properties.datalayers[k].id + '.json',
              format: new ol.format.GeoJSON()
          }),
          style: layerYellow,
          map: map
      });
      umapLayers[data.properties.datalayers[k].id].once('change', function(e) {
        var readyCount = 0;
        for(k in umapLayers) {
          if(umapLayers[k].getSource().getState() === 'ready') {
            ++readyCount;
          }
        }
        if(readyCount === umapLayersCount) {
          var extent = ol.extent.createEmpty();
          for(k in umapLayers) {
            ol.extent.extend(extent, umapLayers[k].getSource().getExtent());
          }
          map.getView().fit(extent);
        }
      });
    }
});

var geolocation = new ol.Geolocation({
  projection: appView.getProjection()
});

geolocation.setTracking(true);

geolocation.on('error', function(error) {
        console.log(error.message);
      });

var positionFeature = new ol.Feature();

positionFeature.setStyle(new ol.style.Style({
  image: new ol.style.Circle({
    radius: 6,
    fill: new ol.style.Fill({
      color: '#3399CC'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 2
    })
  })
}));

geolocation.on('change:position', function() {
  var coordinates = geolocation.getPosition();
  positionFeature.setGeometry(coordinates ?
          new ol.geom.Point(coordinates) : null);
      });

      new ol.layer.Vector({
        map: map,
        source: new ol.source.Vector({
          features: [positionFeature]
        })
      });
/**
 * Add a click handler to the map to render the popup.
 */
map.on('singleclick', function(evt) {
  var coordinate = evt.coordinate;
  var message = '';
  var weight = 0;

  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
      var p = feature.getProperties();
      for(k in p) {
        if(k !== 'geometry') {
          message += k + ': ' + p[k] + '<br />';
        }
      }
  });
  if(message !== '') {
    content.innerHTML = message;
    popup.setPosition(coordinate);
  } else {
    popup.setPosition(undefined);
    closer.blur();
  }

});

/*
from https://stackoverflow.com/questions/19706046/how-to-read-an-external-local-json-file-in-javascript
*/
function readTextFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            callback(rawFile.responseText);
        }
    }
    rawFile.send(null);
}

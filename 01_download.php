<?php
$fh = fopen(__DIR__ . '/maps.csv', 'r');
fgetcsv($fh, 2048);
while($line = fgetcsv($fh, 2048)) {
  $pFile = __DIR__ . '/raw/' . $line[2] . '.json';
  if(!file_exists($pFile)) {
    file_put_contents($pFile, file_get_contents("http://umap.openstreetmap.fr/en/map/{$line[2]}/geojson/"));
  }
  $json = json_decode(file_get_contents($pFile));
  foreach($json->properties->datalayers AS $layer) {
    $layerFile = __DIR__ . '/raw/layer_' . $layer->id . '.json';
    if(!file_exists($layerFile)) {
      file_put_contents($layerFile, file_get_contents('https://umap.openstreetmap.fr/zh-tw/datalayer/' . $layer->id));
    }
    $layerJson = json_decode(file_get_contents($layerFile));
    //print_r($layerJson); exit();
  }
}

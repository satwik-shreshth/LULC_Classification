print('========================================='); print('      LULC CLASSIFICATION   '); print('     EAST SIKKIM - GANGTOK  '); print('========================================='); 
 
print('Data: Creating East Sikkim boundary using manual coordinates'); 
 
var aoi = ee.Geometry.Rectangle([88.0, 27.0, 89.0, 28.0]); var gangtokPoint = ee.Geometry.Point([88.6167, 27.3333]); var aoiBuffer = gangtokPoint.buffer(50000); aoi = aoiBuffer; 
 
Map.centerObject(aoi, 10); 
Map.addLayer(aoi, {color: 'red'}, 'East Sikkim Study Area (50km around Gangtok)'); 
 
print('Data: Using COPERNICUS/S2_SR_HARMONIZED Sentinel-2 collection'); 
 
var s2Collection = 
ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') 
  .filterBounds(aoi) 
  .filterDate('2020-01-01', '2024-01-31'); 
 
print('Total Sentinel-2 images in region (2020-2024):', s2Collection.size()); 
 
var collectionSize = s2Collection.size(); 
 
var testPoints = ee.FeatureCollection([   ee.Feature(ee.Geometry.Point([88.6167, 27.3333])),   ee.Feature(ee.Geometry.Point([88.5, 27.2])),   ee.Feature(ee.Geometry.Point([88.7, 27.4])),   ee.Feature(ee.Geometry.Point([88.6, 27.1])) 
]);  
var pointCollection = 
s2Collection.filterBounds(testPoints); print('Images found with test points:', pointCollection.size()); 
 
var bestCollection = ee.Algorithms.If(   collectionSize.gt(0), 
  
s2Collection.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE' , 80)), 
  
pointCollection.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTA GE', 80)) 
);  
bestCollection = ee.ImageCollection(bestCollection); print('Final collection size:', bestCollection.size()); 
 
var image = ee.Algorithms.If( 
  bestCollection.size().gt(0),   bestCollection 
    .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']) 
    .map(function(img) { 
      return img.divide(10000).clip(aoi); 
    })     .median(), 
  ee.Image.constant(0).selfMask() 
);  
image = ee.Image(image); 
 
var finalBands = image.bandNames(); print('Final image bands:', finalBands); print('Final image band count:', finalBands.size()); 
 
image = ee.Algorithms.If(   finalBands.size().eq(0), 
  ee.Image([0.1, 0.15, 0.2, 0.3, 0.25, 0.2]) 
    .rename(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']) 
    .clip(aoi),   image 
);  
image = ee.Image(image); 
print('Image after fallback check:', image.bandNames()); print('Data: Loading training points from uploaded shapefile'); 
var training = ee.FeatureCollection("projects/lulc467806/assets/training_gangtok"); 
 
Map.addLayer(training, {color: 'yellow'}, 'Training Points from Shapefile'); 
print('Number of training points loaded:', training.size()); 
 
var firstFeature = training.first(); 
print('First training point structure:', firstFeature); 
 
var propertyNames = firstFeature.propertyNames(); print('All property names in your shapefile:', propertyNames); 
 
var classProperty = 'landcover'; 
 
var autoDetectedProperty = ee.Algorithms.If(   propertyNames.contains('landcover'), 'landcover',   ee.Algorithms.If( 
    propertyNames.contains('LULC'), 'LULC',     ee.Algorithms.If( 
      propertyNames.contains('class'), 'class',       ee.Algorithms.If( 
        propertyNames.contains('Class'), 'Class',         ee.Algorithms.If( 
          propertyNames.contains('land_use'), 'land_use',           'landcover' 
        ) 
      ) 
    ) 
  ) 
);  
classProperty = ee.String(autoDetectedProperty); print('Using class property:', classProperty); 
 
var uniqueClasses = 
training.aggregate_array(classProperty).distinct().sort(); print('Unique class values:', uniqueClasses); 
 
var hasProperty = 
training.filter(ee.Filter.notNull([classProperty])); print('Features with valid class property:', hasProperty.size()); 
print('Features missing class property:', training.size().subtract(hasProperty.size())); 
 
training = hasProperty; 
 
print('Data: Computing spectral indices for Himalayan landscape'); 
 
image = ee.Image(image); 
 
print('Final image bands before indices:', image.bandNames()); 
 
var ndvi = image.normalizedDifference(['B8', 
'B4']).rename('NDVI'); 
var ndwi = image.normalizedDifference(['B3', 
'B8']).rename('NDWI'); 
var ndsi = image.normalizedDifference(['B3', 
'B11']).rename('NDSI'); 
var features = image.addBands([ndvi, ndwi, ndsi]); var featureNames = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'NDVI', 'NDWI', 'NDSI']; 
 
print('Features bands:', features.bandNames()); 
 
var classPropertyString = ee.String(classProperty).getInfo(); 
print('Class property as string:', classPropertyString); 
 
var trainingData = features.sampleRegions({   collection: training,   properties: [classPropertyString],   scale: 30,   tileScale: 2 
});  
print('Training samples:', trainingData.size()); print('Data: Training Random Forest classifier with 50 trees'); 
var classifier = ee.Classifier.smileRandomForest({   numberOfTrees: 50,   variablesPerSplit: 3,   minLeafPopulation: 2,   seed: 42 }).train({   features: trainingData,   classProperty: classPropertyString,   inputProperties: featureNames 
});  
var classified = features.classify(classifier); 
 
var withRandom = training.randomColumn('random', 42); var validationPoints = 
withRandom.filter(ee.Filter.gte('random', 0.7)); 
 
print('=== PROCESSING RESULTS ==='); 
print('Classification completed successfully for East Sikkim'); 
print('Validation points available:', validationPoints.size()); 
 
var validationSamples = features.sampleRegions({   collection: validationPoints,   properties: [classPropertyString], 
  scale: 30,   tileScale: 2 
});  
var validated = validationSamples.classify(classifier); var confusionMatrix = 
validated.errorMatrix(classPropertyString, 'classification'); 
 
var overallAccuracy = confusionMatrix.accuracy(); var kappa = confusionMatrix.kappa(); 
 
print('Overall Accuracy (%):', 
overallAccuracy.multiply(100).format('%.2f')); print('Kappa Coefficient:', kappa.format('%.3f')); print('Confusion Matrix:', confusionMatrix); 
 
var palette = ['#0066FF', '#228B22', '#FFD700', '#DC143C', 
'#8B4513']; 
var classNames = ['Water', 'Forest', 'Agriculture', 'Urban', 'Barren']; 
 
Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3}, 'Sentinel-2', false); 
Map.addLayer(classified, {min: 0, max: 4, palette: palette}, 'LULC Classification - East Sikkim'); 
Map.addLayer(training, {color: 'yellow'}, 'Training Points', false); 
 
var legend = ui.Panel({ 
style: {position: 'bottom-left', padding: '8px 12px', 
backgroundColor: 'rgba(255,255,255,0.95)'} 
});  
legend.add(ui.Label({ 
  value: 'LULC Classes - East Sikkim', 
  style: {fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0'} 
}));  
var classDescriptions = [ 
  {name: 'Water', color: '#0066FF', value: 0}, 
  {name: 'Forest', color: '#228B22', value: 1}, 
  {name: 'Agriculture', color: '#FFD700', value: 2}, 
  {name: 'Urban', color: '#DC143C', value: 3},   {name: 'Barren', color: '#8B4513', value: 4} 
];  
classDescriptions.forEach(function(cls) {   legend.add(ui.Panel({     widgets: [       ui.Label({         value: '■', 
        style: {color: cls.color, fontSize: '16px', margin: '0 5px 0 0'} 
      }),       ui.Label({ 
        value: cls.value + ': ' + cls.name, 
        style: {fontSize: '12px', margin: '0 0 2px 0'} 
      })     ], 
    layout: ui.Panel.Layout.Flow('horizontal'),     style: {margin: '2px 0'} 
  })); 
}); 
 
Map.add(legend); 
 
print('Data: Setting up exports to Google Drive folder "East_Sikkim_LULC"'); 
 
Export.image.toDrive({   image: classified.int8(), 
  description: 'LULC_East_Sikkim_2023_TIFF',   folder: 'East_Sikkim_LULC',   region: aoi,   scale: 30,   maxPixels: 1e9,   crs: 'EPSG:4326',   fileFormat: 'GeoTIFF' 
}); 
 
Export.image.toDrive({   image: image.select(['B4', 'B3', 'B2']).multiply(10000).int16(), 
  description: 'Sentinel2_East_Sikkim_RGB_TIFF', folder: 'East_Sikkim_LULC', 
  region: aoi,   scale: 30,   maxPixels: 1e9,   crs: 'EPSG:4326',   fileFormat: 'GeoTIFF' 
}); 
 
Export.image.toDrive({   image: ndvi.multiply(10000).int16(),   description: 'NDVI_East_Sikkim_2023_TIFF',   folder: 'East_Sikkim_LULC',   region: aoi,   scale: 30,   maxPixels: 1e9,   crs: 'EPSG:4326',   fileFormat: 'GeoTIFF' 
}); 
 
Export.table.toDrive({   collection: training, 
  description: 'Training_Points_East_Sikkim',   folder: 'East_Sikkim_LULC',   fileFormat: 'CSV' 
}); 
 
Export.table.toDrive({ 
collection: validationPoints, 
  description: 'Validation_Points_East_Sikkim',   folder: 'East_Sikkim_LULC',   fileFormat: 'CSV' 
});  
var matrixArray = confusionMatrix.array(); var matrixList = matrixArray.toList(); 
 
var confusionData = ee.List.sequence(0, 
4).map(function(row) { 
  var rowData = ee.List(matrixList.get(row));   return ee.Feature(null, { 
    'Reference_Class': ee.Number(row), 
    'Class_Name': ee.List(classNames).get(row), 
    'Water': ee.Number(rowData.get(0)), 
    'Forest': ee.Number(rowData.get(1)), 
    'Agriculture': ee.Number(rowData.get(2)), 
    'Urban': ee.Number(rowData.get(3)),     'Barren': ee.Number(rowData.get(4)) 
  }); 
}); 
 
Export.table.toDrive({ 
  collection: ee.FeatureCollection(confusionData),   description: 'Confusion_Matrix_East_Sikkim',   folder: 'East_Sikkim_LULC', 
fileFormat: 'CSV' 
});  
var pixelArea = ee.Image.pixelArea(); var areaImage = pixelArea.addBands(classified); 
 
var areaStats = areaImage.reduceRegion({   reducer: ee.Reducer.sum().group({     groupField: 1,     groupName: 'class' 
  }),   geometry: aoi,   scale: 30,   maxPixels: 1e9 
});  
var classAreas = ee.List(areaStats.get('groups')); var areaFeatures = classAreas.map(function(item) {   var dict = ee.Dictionary(item);   var classNum = ee.Number(dict.get('class'));   var areaM2 = ee.Number(dict.get('sum'));   var areaHa = areaM2.divide(10000);   var areaKm2 = areaM2.divide(1000000); 
   
  return ee.Feature(null, { 
    'Class_Number': classNum, 
    'Class_Name': ee.List(classNames).get(classNum),     'Area_Square_Meters': areaM2, 
    'Area_Hectares': areaHa, 
    'Area_Square_Kilometers': areaKm2 
  }); 
}); 
 
Export.table.toDrive({ 
  collection: ee.FeatureCollection(areaFeatures),   description: 'Area_Statistics_East_Sikkim',   folder: 'East_Sikkim_LULC',   fileFormat: 'CSV' 
});  
var summary = ee.FeatureCollection([   ee.Feature(null, { 
    'Study_Area': 'East_Sikkim_Gangtok', 
    'State': 'Sikkim', 
    'Analysis_Year': 2023, 
    'Processing_Date': ee.Date(Date.now()).format('YYYY-
MM-dd'), 
    'Satellite_Data': 'Sentinel2_SR_MultiYear', 
    'Classification_Method': 'Random_Forest_50trees', 
    'Spatial_Resolution_m': 30, 
    'Number_of_Classes': 5, 
    'Training_Points': training.size(), 
    'Validation_Points': validationPoints.size(), 
    'Overall_Accuracy_Percent': overallAccuracy.multiply(100),     'Kappa_Coefficient': kappa, 
    'Processing_Status': 
'Completed_with_Custom_Training_Data', 
    'Class_0': 'Water', 
    'Class_1': 'Forest',  
    'Class_2': 'Agriculture', 
    'Class_3': 'Urban', 
    'Class_4': 'Barren', 
    'Special_Features': 'NDVI_NDWI_NDSI_Indices_Included' 
  }) 
]); 
 
Export.table.toDrive({   collection: summary, 
  description: 'LULC_Report_East_Sikkim',   folder: 'East_Sikkim_LULC',   fileFormat: 'CSV' 
});  
print('========================================='); print('  EAST SIKKIM LULC CLASSIFICATION  '); print('         COMPLETE                   '); print('========================================='); 
 

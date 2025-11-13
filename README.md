

# LULC Classification of East Sikkim (Gangtok)

## Project Overview
This repository contains a Google Earth Engine script for Land Use/Land Cover (LULC) classification in East Sikkim—centered around Gangtok—using multi-year Sentinel-2 imagery (2020–2024). The project applies Random Forest classification and spectral indices (NDVI, NDWI, NDSI) to distinguish five land cover classes: Water, Forest, Agriculture, Urban, and Barren.

## Features

- Defines a 50km AOI buffer around Gangtok with manual geometry.
- Ingests multi-year Sentinel-2 imagery with low cloud cover filtering.
- Dynamically loads and checks training data from user-uploaded shapefile.
- Auto-detects class property name in the training dataset.
- Calculates NDVI, NDWI, and NDSI indices for improved class separation.
- Trains a Random Forest classifier (50 trees) for robust LULC mapping.
- Visualizes classified results, RGB composite, and provides map legend.
- Computes accuracy metrics, kappa coefficient, and produces a confusion matrix.
- Generates area statistics for each LULC class (in sq. meters, hectares, and sq. km).
- Exports classified raster, RGB reference, NDVI, training/validation points, confusion matrix, class area statistics, and summary report as GeoTIFF/CSV to Google Drive.

## Usage

1. Open the script in the [Google Earth Engine code editor](https://code.earthengine.google.com/).
2. Ensure your Earth Engine account has access to the asset: `projects/lulc467806/assets/training_gangtok`.
3. Run the script to process Sentinel-2 data, compute indices, train the classifier, and visualize results.
4. Review the console outputs for accuracy statistics, property checks, and class summaries.
5. Use the "Tasks" tab to export outputs (GeoTIFFs, CSV reports) to your Google Drive.

## Data Sources

- Sentinel-2 Surface Reflectance (COPERNICUS/S2_SR_HARMONIZED)
- Custom training points shapefile for East Sikkim (Gangtok region)

## Methodology

- The AOI is set as a 50km buffer around Gangtok.
- All available Sentinel-2 imagery from 2020–2024 is stacked, filtered, and median-composited.
- NDVI, NDWI, and NDSI indices enhance class discrimination.
- Random Forest classifier is trained using the most appropriate property available in the shapefile.
- Pixel- and class-level accuracy assessments are performed using validation data.

## Exports

- Classified LULC raster (GeoTIFF)
- True-color Sentinel-2 composite (GeoTIFF)
- NDVI (GeoTIFF)
- Training and validation points (CSV)
- Confusion matrix and area statistics (CSV)
- Summary report (CSV)

## Author and Rights

This project is developed by Satwik Shreshth. All rights reserved.

***

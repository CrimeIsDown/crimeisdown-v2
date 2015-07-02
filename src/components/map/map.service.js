'use strict';

angular.module('crimeisdown')
  .factory('mapUtils', ['$http', function ($http) {
    var mapService = {};

    var polygons = {
      communityAreas: [],
      neighborhoods: [],
      policeDistricts: [],
      policeBeats: []
    };

    var mapOptions = {
      center: {lat: 41.8369, lng: -87.6847},
      zoom: 10
    };
    var chicago = new google.maps.Circle({center: mapOptions.center, radius: 50000}).getBounds();
    var geocoder = new google.maps.Geocoder();
    var map, currMarker, currListener, streetView, onlineStreams, fireStations;

    mapService.createMap = function (element) {
      map = new google.maps.Map(element, mapOptions);
      return map;
    };

    mapService.loadOnlineStreams = function () {
      $http.get('assets/data/online_streams.json')
        .then(function (res) {
          onlineStreams = angular.fromJson(res.data);
        });
      return onlineStreams;
    };

    mapService.loadFireStations = function () {
      $http.get('assets/data/fire_stations.json')
        .then(function (res) {
          fireStations = angular.fromJson(res.data);
        });
      return fireStations;
    };

    mapService.lookupAddress = function (address) {
      var location = {meta: {}, police: {}, fire: {}, stats: {}};
      geocoder.geocode({'address': address, bounds: chicago}, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          var point = results[0].geometry.location;
          location.meta.formatted_address = results[0].formatted_address;
          location.meta.latitude = point.lat().toFixed(6);
          location.meta.longitude = point.lng().toFixed(6);
          map.setCenter(point);
          map.setZoom(15);

          polygons.communityAreas.forEach(function (poly) {
            if (google.maps.geometry.poly.containsLocation(point, poly)) {
              location.meta.community_area = poly.geojsonProperties.COMMUNITY;
            }
          });

          polygons.neighborhoods.forEach(function (poly) {
            if (google.maps.geometry.poly.containsLocation(point, poly)) {
              location.meta.neighborhood = poly.geojsonProperties.PRI_NEIGH;
            }
          });

          polygons.policeDistricts.forEach(function (poly) {
            if (google.maps.geometry.poly.containsLocation(point, poly)) {
              location.police.district = poly.geojsonProperties.DIST_LABEL.toLowerCase();

              var zones = {'1': ['16', '17'], '2': ['19'], '3': ['12', '14'], '4': ['1', '18'], '5': ['2'], '6': ['7', '8'], '7': ['3'], '8': ['4', '6'], '9': ['5', '22'], '10': ['10', '11'], '11': ['20', '24'], '12': ['15', '25'], '13': ['9']};
              var areas = {'North': ['11', '14', '15', '16', '17', '19', '20', '24'], 'Central': ['1', '2', '3', '8', '9', '10', '12', '18'], 'South': ['4', '5', '6', '7', '22']}

              for (var key in zones) {
                if ($.inArray(poly.geojsonProperties.DIST_NUM, zones[key])>-1) {
                  var stream = onlineStreams['Z'+key];
                  location.police.zone = {num: key, freq: stream.frequency, url: stream.feedUrl, mp3: stream.directStreamUrl};
                }
              }
              for (var key in areas) {
                if ($.inArray(poly.geojsonProperties.DIST_NUM, areas[key])>-1) {
                  location.police.area = key;
                }
              }
            }
          });

          polygons.policeBeats.forEach(function (poly) {
            if (google.maps.geometry.poly.containsLocation(point, poly)) {
              location.police.beat = poly.geojsonProperties.BEAT_NUM;
            }
          });

          var nearest_engine = {distance: 99999999};
          var nearest_ambo = {distance: 99999999};

          fireStations.forEach(function (station) {
            if (station.engine.length) {
              var distance = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(station.latitude, station.longitude), point);
              if (nearest_engine.distance > distance) {
                nearest_engine = station;
                nearest_engine.distance = distance;
              }
            }
            if (station.ambo.length) {
              var distance = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(station.latitude, station.longitude), point);
              if (nearest_ambo.distance > distance) {
                nearest_ambo = station;
                nearest_ambo.distance = distance;
              }
            }

          });

          location.fire.nearest_engine = nearest_engine.engine;
          location.fire.fire_district = nearest_engine.fire_dist.replace(' (HQ)', '');
          location.fire.ems_district = nearest_engine.ems_dist.replace(' (HQ)', '');
          location.fire.battalion = nearest_engine.batt.replace(' (HQ)', '');
          location.fire.nearest_ambo = nearest_ambo.ambo;
          location.fire.channel = nearest_engine.radio;

          if (currMarker) {
            currMarker.setMap(null);
            google.maps.event.removeListener(currListener);
          }
          currMarker = new google.maps.Marker({
              map: map,
              position: point
          });
          currListener = google.maps.event.addListener(currMarker, 'click', function() {
            streetView = map.getStreetView();
            streetView.setPosition(point);
            streetView.setVisible(true);
          });
        } else {
          alert("Geocode was not successful for the following reason: " + status);
        }
      });
      return location;
    };

    mapService.loadLayers = function (map) {
      var communityAreasLayer = loadCommunityAreas();
      //communityAreasLayer.setMap(map);

      var neighborhoodsLayer = loadNeighborhoods();
      //neighborhoodsLayer.setMap(map);

      var policeDistrictsLayer = loadPoliceDistricts();
      policeDistrictsLayer.setMap(map);

      var policeBeatsLayer = loadPoliceBeats();

      var trafficLayer = new google.maps.TrafficLayer();
      var transitLayer = new google.maps.TransitLayer();

      return {
        community_areas: communityAreasLayer,
        neighborhoods: neighborhoodsLayer,
        police_districts: policeDistrictsLayer,
        police_beats: policeBeatsLayer,
        traffic: trafficLayer,
        transit: transitLayer
      };
    }

    function loadCommunityAreas() {
      var communityAreasLayer = new google.maps.Data();
      loadGeoJSON('assets/data/community_areas.json', communityAreasLayer, polygons.communityAreas);
      communityAreasLayer.setStyle({fillOpacity: 0.0, strokeColor: '#333', strokeWeight: 2});
      return communityAreasLayer;
    }

    function loadNeighborhoods() {
      var neighborhoodsLayer = new google.maps.Data();
      loadGeoJSON('assets/data/neighborhoods.json', neighborhoodsLayer, polygons.neighborhoods);
      neighborhoodsLayer.setStyle({fillOpacity: 0.0, strokeColor: '#CCC', strokeWeight: 1});
      return neighborhoodsLayer;
    }

    function loadPoliceDistricts() {
      var policeDistrictsLayer = new google.maps.Data();
      loadGeoJSON('assets/data/police_districts.json', policeDistrictsLayer, polygons.policeDistricts);
      policeDistrictsLayer.setStyle({fillOpacity: 0.0, strokeColor: 'blue', strokeWeight: 2});
      return policeDistrictsLayer;
    }

    function loadPoliceBeats() {
      var policeBeatsLayer = new google.maps.Data();
      loadGeoJSON('assets/data/police_beats.json', policeBeatsLayer, polygons.policeBeats);
      policeBeatsLayer.setStyle({fillOpacity: 0.0, strokeColor: 'blue', strokeWeight: 3});
      return policeBeatsLayer;
    }

    function loadGeoJSON (url, layer, list) {
      $http.get(url)
        .then(function (res) {
          var json = new GeoJSON(res.data);
          layer.addGeoJson(res.data);
          json.forEach(function (value) {
            list.push(value[0]);
          });
        });
    }

    return mapService;
  }]);

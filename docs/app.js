/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

// Style credit: https://snazzymaps.com/style/1/pale-dawn
const mapStyle = [
  {
    "featureType": "administrative",
    "elementType": "all",
    "stylers": [
      {
        "visibility": "on"
      },
      {
        "lightness": 33
      }
    ]
  },
  {
    "featureType": "landscape",
    "elementType": "all",
    "stylers": [
      {
        "color": "#f2e5d4"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c5dac6"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "on"
      },
      {
        "lightness": 20
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "all",
    "stylers": [
      {
        "lightness": 20
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c5c6c6"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e4d7c6"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#fbfaf7"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "all",
    "stylers": [
      {
        "visibility": "on"
      },
      {
        "color": "#acbcc9"
      }
    ]
  }
];

var map;
var markers = [];
var infoWindow;
var locationSelect;
var destinations;
var error = "";

// Escapes HTML characters in a template literal string, to prevent XSS.
// See https://www.owasp.org/index.php/XSS_%28Cross_Site_Scripting%29_Prevention_Cheat_Sheet#RULE_.231_-_HTML_Escape_Before_Inserting_Untrusted_Data_into_HTML_Element_Content
function sanitizeHTML(strings) {
  const entities = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
  let result = strings[0];
  for (let i = 1; i < arguments.length; i++) {
    result += String(arguments[i]).replace(/[&<>'"]/g, (char) => {
      return entities[char];
    });
    result += strings[i];
  }
  return result;
}

function initMap() {

  // Create the map.
  map = new google.maps.Map(document.getElementsByClassName('map')[0], {
    zoom: 8, 
    center: {lat: 39.428020, lng: -86.428788},
    styles: mapStyle
  });

  // Load the stores GeoJSON onto the map.
  map.data.loadGeoJson('stores.json');
    // Define the custom marker icons, using the store's "category".
  map.data.setStyle(feature => {
    return {
      icon: {
        url: `img/icon_asctw.png`,
        scaledSize: new google.maps.Size(32, 32)
      }
    };
  });
  
  destinations = [];

  //var request = new XMLHttpRequest();
  //request.open("GET", "stores.json", false);
  //request.send(null)
  var storeData;// = JSON.parse(request.responseText);

  
  searchButton = document.getElementById("searchButton").onclick = searchLocations;

  locationSelect = document.getElementById("locationSelect");
          locationSelect.onchange = function() {
            var markerNum = locationSelect.options[locationSelect.selectedIndex].value;
            if (markerNum != "none"){
              google.maps.event.trigger(markers[markerNum], 'click');
            }
          };
  
  const apiKey = 'AIzaSyDoYISVblufYSzI0no4WIpkN5QHLSCwJgU';
  infoWindow = new google.maps.InfoWindow();
  infoWindow.setOptions({pixelOffset: new google.maps.Size(0, -30)});

  // Show the information for a store when its marker is clicked.
  map.data.addListener('click', event => {
    const name = event.feature.getProperty('name');
    const position = event.feature.getGeometry().get();
    const content = sanitizeHTML`
      <img style="float:left; width:32px; margin-top:0px" src="img/icon_asctw.png">
      <div margin-top:30px;">
        <h2>${name}</h2>
      </div>
    `;

    infoWindow.setContent(content);
    infoWindow.setPosition(position);
    infoWindow.open(map);
  });

}

function searchLocations() {
  var address = document.getElementById("addressInput").value;
  var geocoder = new google.maps.Geocoder();
  geocoder.geocode({address: address}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
    searchLocationsNear(results[0].geometry.location, results[0].formatted_address);
    } else {
      alert(address + ' not found');
    }
  });
}

function clearLocations() {
  infoWindow.close();
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers.length = 0;

  locationSelect.innerHTML = "";
}

function searchLocationsNear(center, address) {
  clearLocations();
  destinations = [];
  error = "";
  $.getJSON("stores.json", (storeData) => {
    storeData.features.forEach((store) => {
      destinations.push({
        lat:store.geometry.coordinates[1], 
        lng:store.geometry.coordinates[0],
        Name:store.properties.name
      });
    });

    var service = new google.maps.DistanceMatrixService();
    var i;
    for (i=0; i < destinations.length; i+=25) {
      service.getDistanceMatrix({
        origins: [center],
        destinations: destinations.slice(i, i+25),
        travelMode: 'DRIVING',
        unitSystem: google.maps.UnitSystem.Imperial,
      }, callbackClosure(i, distancesCallback));
    }

    //createOption(name, distance, i);
    createMarker(center, name, address);
    locationSelect.style.visibility = "visible";
    locationSelect.onchange = function() {
      var markerNum = locationSelect.options[locationSelect.selectedIndex].value;
      google.maps.event.trigger(markers[markerNum], 'click');
    };
  });
}

function callbackClosure(i, callback) {
  return function(response, status) {
    return callback(response, status, i);
  }
}

function distancesCallback(response, status, index) {
  if(status != "OK" || !response.destinationAddresses[0] || !response.rows[0].elements[0].duration) {
    console.log("error retrieving data.")
    if (!error) {
      error = "Error retrieving data.  Please try again."
      locationSelect.innerHTML = "";
      createOption(error);
    }
  }

  if (error) {
    return;
  }

  var i;
  for (i=0; i < response.destinationAddresses.length; i++) {
    destinations[i + index].Address = response.destinationAddresses[i];
    var element = response.rows[0].elements[i];
    destinations[i + index].DriveTimeSeconds = element.duration.value;
    destinations[i + index].DriveTimeDisplay = element.duration.text;
    destinations[i + index].DriveDistanceMeters = element.distance.value;
    destinations[i + index].DriveDistanceDisplay = element.distance.text;
    destinations[i + index].Index = i + index;
  }

  var completedDestionations = destinations.filter(function(destination){
    return !!destination.DriveTimeDisplay;
  });

  if (completedDestionations.length == destinations.length) {
    createOptions();
  }
}

function createOptions() {
  locationSelect.innerHTML = "";
  destinations.sort((a, b) => (a.DriveTimeSeconds > b.DriveTimeSeconds) ? 1 : -1);
  destinations.forEach((store) => {
    if (!store.DriveTimeDisplay) {
      error = "Error retrieving data.  Please try again."
      locationSelect.innerHTML = "";
      createOption(error);
      throw error;
    }
    createOption(store.Name + " " + store.DriveTimeDisplay, store.Index);
  });
}

function createMarker(latlng, name, address) {
  var html = "<b>" + name + "</b> <br/>" + address;
  var marker = new google.maps.Marker({
    map: map,
    position: latlng,
    icon: "img/icon_pin.png"
});

 google.maps.event.addListener(marker, 'click', function() {
    infoWindow.setContent(html);
    infoWindow.open(map, marker);
  });
  markers.push(marker);
}

function createOption(html, num) {
  var option = document.createElement("option");
  option.value = num;
  option.innerHTML = html;
  locationSelect.appendChild(option);
}

function downloadUrl(url, callback) {
  var request = window.ActiveXObject ?
      new ActiveXObject('Microsoft.XMLHTTP') :
      new XMLHttpRequest;

  request.onreadystatechange = function() {
    if (request.readyState == 4) {
      request.onreadystatechange = doNothing;
      callback(request.responseText, request.status);
    }
  };

  request.open('GET', url, true);
  request.send(null);
}

function parseXml(str) {
  if (window.ActiveXObject) {
    var doc = new ActiveXObject('Microsoft.XMLDOM');
    doc.loadXML(str);
    return doc;
  } else if (window.DOMParser) {
    return (new DOMParser).parseFromString(str, 'text/xml');
  }
}

function doNothing() {
  
}

$(document).ready(function ()
{
    $("#addressInput").keydown(function (e)
    {
        if (e.keyCode == 13) // 27=esc
        {
            searchLocations();
            $(this).select();
        }
    });
});
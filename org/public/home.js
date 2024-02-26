// Your existing JavaScript here

var map = L.map('map').setView([22.6, 71.9], 8.2); // Set this to your desired default location and zoom level

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

var geocoder = L.Control.Geocoder.nominatim();
var lat, lon;

map.on('click', function(e) {
    geocoder.reverse(e.latlng, map.options.crs.scale(map.getZoom()), function(results) {
        var r = results[0];
        if (r) {
            document.getElementById('address').value = r.name;
            lat = e.latlng.lat;
            lon = e.latlng.lng;
        }
    });
});

fetch('http://localhost:3080/getDisasters')
    .then(response => response.json())
    .then(data => {
        // 'data' contains the array of disaster documents
        data.forEach(disaster => {
            // Use disaster.Latitude, disaster.Longitude, and disaster.ROI to create circles on the map
            var circle = L.circle([disaster.Latitude, disaster.Longitude], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.5,
                radius: disaster.ROI
            }).addTo(map);

            // Create a list of agencies that have a value of true
            var agenciesRequired = Object.keys(disaster.CheckList.agencies).filter(key => disaster.CheckList.agencies[key] === true);

            // Create a string for the popup
            var popupContent = '<div class="custom-popup"><b>' +"Disaster: "+ disaster.Type + '</b><br>Agencies Required:<br>';
            agenciesRequired.forEach(agency => {
                popupContent += '- ' + agency;

                if (disaster.Deployed.includes(agency)) {
                    popupContent += '<b> (Deployed) </b>';
                }

                popupContent += '<br>';
            });
            popupContent += '</div>';

            // Add a button to the popup
            popupContent += '<button id="remove-' + disaster._id + '">Remove</button>';

            // Bind the popup to the circle
            circle.bindPopup(popupContent);

            // Add an event listener to the button
        circle.on('popupopen', function() {
            var removeButton = document.getElementById('remove-' + disaster._id);
            removeButton.addEventListener('click', function() {
            // Remove the circle from the map
            circle.remove();

            // Send a request to your backend to remove the disaster from the database
            fetch('http://localhost:3080/removeDisaster/' + disaster._id, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    });

            
        });
    })
    .catch((error) => {
        console.error('Error:', error);
    });




document.getElementById('disasterForm').addEventListener('submit', function(e) {
    e.preventDefault();

    var disasterType = document.getElementById('disasterType').value;
    var address = document.getElementById('address').value;
    var zoneName = document.getElementById('zoneName').value;
    var impactRadius = document.getElementById('impactRadius').value;

    fetch('http://localhost:3080/submitDisaster', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            disasterType: disasterType,
            address: address,
            zoneName: zoneName,
            impactRadius: impactRadius,
            lat: lat,
            lon: lon
        }),
    })
    .then(response => response.text()) // Use .text() instead of .json()
    .then(data => console.log(data)) // Log the response data
    .catch((error) => {
        console.error('Error:', error);
    });
});

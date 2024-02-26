// Define map at a higher scope
var map;
let loggedInAgencyCoordinates;

fetch('http://localhost:3090/getAgencies')
    .then(response => response.json())
    .then(data => {
        // Initialize the map here
        map = L.map('map').setView([data.loggedInAgencyCoordinates.Latitude, data.loggedInAgencyCoordinates.Longitude], 8    );

        loggedInAgencyCoordinates = data.loggedInAgencyCoordinates;

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Create a LayerGroup for each specialization and store them in an object
        var layers = {};
        data.specializations.forEach(specialization => {
            layers[specialization] = L.layerGroup();
        });

        // Create a marker for each agency and add it to the corresponding LayerGroup
data.agencies.forEach(agency => {
    // Define the custom icon
    var customIcon = L.icon({
        iconUrl: './images/Fire Brigade.png', // Path to the custom icon image
        iconSize: [33, 39], // Size of the icon
        iconAnchor: [10, 10], // Point of the icon which will correspond to marker's location
        popupAnchor: [0, 0] // Point from which the popup should open relative to the iconAnchor
    });

    // Create the marker with the custom icon
    var marker = L.marker([agency.coordinates.Latitude, agency.coordinates.Longitude])
        .bindTooltip(`UID: ${agency.UID}, ${agency.Specialisations}`);
    marker.addTo(layers[agency.Specialisations]);
    marker.addTo(map);  // Add all markers to the map initially
});

        // Create a filter for each specialization
        var filters = document.getElementById('filters');
        data.specializations.forEach(specialization => {
            var filter = document.createElement('div');
            filter.textContent = specialization;
            filter.classList.add('filter');
            filter.dataset.specialization = specialization;
            filter.addEventListener('click', function() {
                // Toggle the filter
                this.classList.toggle('active');

                // Update the map
                if (this.classList.contains('active')) {
                    // If the filter is active, remove all markers from the map
                    data.agencies.forEach(agency => {
                        layers[agency.Specialisations].remove();
                    });

                    // Then add only the markers for the active specialization
                    layers[this.dataset.specialization].addTo(map);
                } else {
                    // If the filter is inactive, add all markers to the map
                    data.agencies.forEach(agency => {
                        layers[agency.Specialisations].addTo(map);
                    });
                }
            });
            filters.appendChild(filter);
        });

        // Fetch disaster data after fetching agency data
        return fetch('http://localhost:3080/getDisasters');
    })
    .then(response => response.json())
.then(data => {
    // Add a circle for each disaster
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

        // Fetch the logged-in agency's data
        fetch('http://localhost:3090/getLoggedInAgency')
            .then(response => response.json())
            .then(loggedInAgency => {
                console.log(loggedInAgency)
                // If the logged-in agency's specialization is required, add a "Deploy" button
                if (agenciesRequired.includes(loggedInAgency.Specialisations) && !disaster.Deployed.includes(loggedInAgency.Specialisations)) {
                    popupContent += '<button id="deployButton">Deploy</button>';
                }

                // Bind the popup to the circle
                circle.bindPopup(popupContent);

                 // Add an event listener for the "Deploy" button
        circle.on('popupopen', function() {
            var deployButton = document.getElementById('deployButton');
            if (deployButton) {
                deployButton.addEventListener('click', function() {
                    // Fetch the route from the OpenRouteService API
                    fetch('http://localhost:3090/proxy/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248f34b76f5869e4687a3eea87418fecdaf&start=' + loggedInAgencyCoordinates.Longitude.toFixed(2) + ',' + loggedInAgencyCoordinates.Latitude.toFixed(2) + '&end=' + disaster.Longitude.toFixed(2) + ',' + disaster.Latitude.toFixed(2))

                        .then(response => response.json())
                        .then(routeData => {
                            // Get the coordinates of the route
                            var routeCoordinates = routeData.features[0].geometry.coordinates;

                            // Convert the coordinates to a format that Leaflet understands
                            routeCoordinates = routeCoordinates.map(coordinate => [coordinate[1], coordinate[0]]);

                            // Draw the route on the map
                            var route = L.polyline(routeCoordinates, {color: 'blue'}).addTo(map);
                            map.fitBounds(route.getBounds());

                            fetch('http://localhost:3080/deployAgency/' + disaster._id + '/' + loggedInAgency.Specialisations, {
                        method: 'PUT',
                    })
                    .then(response => response.json())
                    .then(data => console.log(data))
                    .catch((error) => {
                        console.error('Error:', error);
                    });
                        })
                        .catch(error => console.error('Error:', error));
                });
            }
        });
            })
            .catch(error => console.error('Error:', error));
    });
})
.catch(error => console.error('Error:', error));

fetch('http://localhost:3090/getLoggedInAgency')
    .then(response => response.json())
    .then(data => {
        var agencyInfo = document.getElementById('agencyInfo');
        agencyInfo.innerHTML = `
            <h2>${data.Name}</h2>
            <p>UID: ${data.UID}</p>
            <p>Zone: ${data.Zone}</p>
            <p>Address: ${data.Address}</p>
            <p>Specialisations: ${data.Specialisations}</p>
        `;
    })
    .catch(error => console.error('Error:', error));

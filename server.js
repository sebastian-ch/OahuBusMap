var fs = require('fs'),
    express = require('express'),
    cors = require('cors'),
    app = express(),
    bodyParser = require('body-parser'),
    request = require('request'),
    parseString = require('xml2js').parseString,
    turf = require('@turf/turf'),
    server = require('http').Server(app);

app.use(cors());
app.use(bodyParser.urlencoded({
    extended: false
}));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/views/');

var newGeoJSON = {};
newGeoJSON['type'] = 'FeatureCollection';
//newGeoJSON['features'] = [];

app.get('/', function (req, res) {

    /*  request({

          url: 'http://localhost:8080/vehicleData',
      }, function (err, resp, body) {
          if (err) throw err;

          var bus = body;
          res.render('index', {
              //bus: bus
          })

      }) */

    res.render('index');

    //setInterval(makeRequest, 2000);

})

app.get('/vehicleData', function (req, res) {

    var cors1 = 'http://cors-anywhere.herokuapp.com/',
        baseURL = 'http://api.thebus.org/vehicle/?key=',
        key = 'DE28B0E6-7CF2-482C-8DC6-23D654B81391',
        query = '&vehicle=19';

    var combo = baseURL + key + query;


    request({
        url: combo,
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    }, function (error, response, body) {
        if (error) {
            //console.log(error);
        }

        //res.send(body);

        //fix the XML - replace & with the escaped version
        var re = /&/g;
        var fixedXML = body.replace(re, '&amp;');

        //convert xml to json
        parseString(fixedXML, function (err, result) {
            if (err) {
                console.log(err);
            }
            //res.send(result);

            createGeoJSON(result);

        })

    })


    function createGeoJSON(jsonObj) {

        newGeoJSON['features'] = [];

        //read outline of oahu
        fs.readFile('geojsons/oahu.geojson', 'utf8', (err, data) => {
            if (err) throw err

            //parse it
            var oahu = JSON.parse(data);

            //convert each feature to a geojson feature
            for (var x in jsonObj.vehicles.vehicle) {

                var lat = Number(jsonObj.vehicles.vehicle[x].latitude),
                    lng = Number(jsonObj.vehicles.vehicle[x].longitude),
                    oahuBbox = turf.bbox(oahu),
                    oahuBounds = turf.bboxPolygon(oahuBbox),
                    currentPoint = turf.point([lng, lat]);

                //if it's a null_trip, don't add it
                if (jsonObj.vehicles.vehicle[x].trip == 'null_trip') {
                    continue;

                    //if it falls outside of oahu, don't add it
                } else if (!turf.booleanPointInPolygon(currentPoint, oahuBounds)) {
                    continue;

                } else {

                    

                    var newFeature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [parseFloat(jsonObj.vehicles.vehicle[x].longitude),
                                parseFloat(jsonObj.vehicles.vehicle[x].latitude)
                            ]
                        },
                        "properties": {
                            "number": jsonObj.vehicles.vehicle[x].number,
                            "trip": jsonObj.vehicles.vehicle[x].trip,
                            "adherence": jsonObj.vehicles.vehicle[x].adherence,
                            "last_message": jsonObj.vehicles.vehicle[x].last_message,
                            "headsign": jsonObj.vehicles.vehicle[x].headsign
                        }
                    }
                    newGeoJSON['features'].push(newFeature);
                }
            }
            res.json(newGeoJSON);
        })
        //console.log(data.vehicles.vehicle[3]);
    }

})

server.listen(8080);
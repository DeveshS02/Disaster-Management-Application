const express= require('express');
const mongoose= require('mongoose');
const cors= require('cors');
const path = require('path');
const session = require('express-session');
const app= express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your secret key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        expires: false }
  }));

mongoose.connect("mongodb://0.0.0.0:27017/disatser")


//login info orgs
const orgSchema = new mongoose.Schema({
    UID: Number,
    Password: String,
    ZoneID: Number
  });
  
const orgModel = mongoose.model("orgs", orgSchema);

//login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login form data validation
app.post('/login', async (req, res) => {
    try {
        const user = await orgModel.findOne({ UID: req.body.uid });
        if (!user) return res.status(400).send('Invalid UID.');
        if (req.body.password !== user.Password) return res.status(400).send('Invalid password.');
        req.session.uid = user.UID;
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while logging in.');
    }
});

//disasters collection
const disasterSchema = new mongoose.Schema({
    Type: String,
    Address: String,
    Latitude: Number,
    Longitude: Number,
    ZoneID: Number,
    ROI: Number,
    CheckList: Object,
    Deployed: { type: Array, default: [] }
  });
  
const disasterModel = mongoose.model("disasters", disasterSchema);

//Schema for the checklist collection
const checklistSchema = new mongoose.Schema({
    // The name attribute, which is a string
    name: String,
    // The agencies attribute, which is an object
    agencies: {
        // The subfields of the agencies object, which can have their own types and options
        "Fire Brigade": {
            type: Boolean,
            default: false // set the default value to false
        },

        "Air Force": {
            type: Boolean,
            default: false
        },

        "Polie Force": {
            type: Boolean,
            default: false
        },

        Paramedics: {
            type: Boolean,
            default: false
        },

        "Search & Rescue": {
            type: Boolean,
            default: false
        },

        "Flood Relief": {
            type: Boolean,
            default: false
        }
    }
});

// Create a model from the schema
const checklistModel = mongoose.model('checklists', checklistSchema);

//map for zoneID
const zoneMap = {
    'Gujarat': 14567,
    'Haryana & Delhi': 13522,
    'Uttar Pradesh': 23654,
    'Maharashtra': 78904,
    'Madhya Pradhesh': 90342,
    'Punjab & Himachal': 98123,
    'Tamil Nadu': 347213
};

// Submit disaster data
app.post('/submitDisaster', async (req, res) => {
    try {
        const { disasterType, address, zoneName, impactRadius, lat, lon } = req.body;

        const checklist = await checklistModel.findOne({ name: { $regex: new RegExp(`^${disasterType}$`, 'i') } });

        if (!checklist) return res.status(400).send('No checklist found for the provided disaster type.');

        const disaster = new disasterModel({
            Type: disasterType,
            Address: address,
            Latitude: lat, 
            Longitude: lon,
            ZoneID: zoneMap[zoneName],
            ROI: impactRadius,
            CheckList: {
                agencies: checklist.agencies
            }
        });

        await disaster.save();
        res.redirect('/home')

    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while submitting disaster information.');
    }
});

//home page
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Get disasters
app.get('/getDisasters', async (req, res) => {
    try {
        const disasters = await disasterModel.find({});
        res.json(disasters);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while retrieving disaster information.');
    }
});

//Remove a disaster
app.delete('/removeDisaster/:id', (req, res) => {
    const id = req.params.id;

    disasterModel.findByIdAndDelete(id)
        .then(result => {
            if (!result) {
                res.status(404).send({ message: 'Disaster not found' });
            } else {
                res.status(200).send({ message: 'Disaster removed successfully' });
            }
        })
        .catch(err => {
            res.status(500).send(err);
        });
});

//Update if agency is deployed 
app.put('/deployAgency/:id/:specialisation', (req, res) => {
    const id = req.params.id;
    const specialisation = req.params.specialisation;

    disasterModel.findByIdAndUpdate(id, { $push: { Deployed: specialisation } }, { new: true })
        .then(result => {
            if (!result) {
                res.status(404).send({ message: 'Disaster not found' });
            } else {
                res.status(200).send({ message: 'Specialisation deployed successfully' });
            }
        })
        .catch(err => {
            res.status(500).send(err);
        });
});


app.listen(3080, () => {
    console.log("Running on port 3080")
});
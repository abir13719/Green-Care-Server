const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k8que7r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const userCollection = client.db("greenCare").collection("users");
    const campCollection = client.db("greenCare").collection("camps");

    //User Related API
    app.post("/users", async (req, res) => {
      const { uid, name, email, profilePicture } = req.body;
      try {
        const alreadyUser = await userCollection.findOne({ email: email });
        if (alreadyUser) {
          return res.send("User already registered");
        }
        const newUser = {
          uid,
          name,
          email,
          profilePicture,
        };
        const result = await userCollection.insertOne(newUser);
        res.status(201).send("User registered successfully");
      } catch (error) {
        console.error(error);
        res.status(400).send("Error registering user");
      }
    });

    //Camp Related API
    app.post("/camps", async (req, res) => {
      const campData = req.body;
      try {
        const result = await campCollection.insertOne(campData);
        res.status(201).send("Camp added successfully");
      } catch (error) {
        console.error(error);
        res.status(400).send("Error adding camp");
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}

run().catch(console.dir);

app.get("/", async (req, res) => {
  res.json("GreenCare Server is running...");
});

app.listen(port, () => {
  console.log(`GreenCare Server is running on port ${port}`);
});

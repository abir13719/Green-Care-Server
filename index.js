const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const participantCollection = client
      .db("greenCare")
      .collection("participants");

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
    app.get("/users/:uid", async (req, res) => {
      const { uid } = req.params;
      try {
        const user = await userCollection.findOne({ uid: uid });
        if (!user) {
          return res.status(404).send("User not found");
        }
        res.status(200).json(user);
      } catch (error) {
        res.status(500).send("Error fetching user profile");
      }
    });
    app.patch("/users/:uid", async (req, res) => {
      const { uid } = req.params;
      const update = req.body;
      console.log("Update request for UID:", uid);
      console.log("Update data:", update);

      const options = { upsert: true };
      const filter = { uid: uid };
      const updateDoc = { $set: update };

      try {
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.status(200).send("User profile updated successfully");
      } catch (error) {
        res.status(500).send("Error updating user profile");
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
    app.get("/camps", async (req, res) => {
      try {
        const camps = await campCollection.find().toArray();
        res.status(200).json(camps);
      } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving camps");
      }
    });
    app.get("/camps/:id", async (req, res) => {
      const { id } = req.params;
      const camp = await campCollection.findOne({ _id: new ObjectId(id) });
      res.json(camp);
    });
    app.patch("/camps/:id", async (req, res) => {
      const { id } = req.params;
      const update = req.body;
      const result = await campCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );
      res.json(result);
    });
    app.get("/popular", async (req, res) => {
      try {
        const popularCamps = await campCollection
          .find()
          .sort({ participantCount: -1 })
          .limit(6)
          .toArray();
        res.status(200).json(popularCamps);
      } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving popular camps");
      }
    });
    app.patch("/update-camp/:campId", async (req, res) => {
      const { campId } = req.params;
      const update = req.body;
      try {
        const result = await campCollection.updateOne(
          { _id: new ObjectId(campId) },
          { $set: update }
        );
        res.status(200).send("Camp updated successfully");
      } catch (error) {
        res.status(500).send("Error updating camp");
      }
    });
    app.delete("/delete-camp/:campId", async (req, res) => {
      const { campId } = req.params;
      try {
        const result = await campCollection.deleteOne({
          _id: new ObjectId(campId),
        });
        res.status(200).send("Camp deleted successfully");
      } catch (error) {
        res.status(500).send("Error deleting camp");
      }
    });

    //Participants Related API
    app.post("/participants", async (req, res) => {
      const participantData = {
        ...req.body,
        paymentStatus: "Unpaid",
        confirmationStatus: "Pending",
      };
      try {
        const result = await participantCollection.insertOne(participantData);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error registering participant", error);
        res.status(500).send("Error registering participant");
      }
    });
    app.get("/participants", async (req, res) => {
      try {
        const participants = await participantCollection.find().toArray();
        res.status(200).json(participants);
      } catch (error) {
        res.status(500).send("Error retrieving participants data");
      }
    });
    app.get("/participants/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const participantRecords = await participantCollection
          .find({ participantEmail: email })
          .toArray();
        res.status(200).json(participantRecords);
      } catch (error) {
        console.error("Error fetching registered camps", error);
        res.status(500).send("Error fetching registered camps");
      }
    });
    app.delete("/participants/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const participant = await participantCollection.findOne({
          _id: new ObjectId(id),
        });
        await participantCollection.deleteOne({ _id: new ObjectId(id) });

        await campCollection.updateOne(
          { _id: new ObjectId(participant.campId) },
          { $inc: { participantCount: -1 } }
        );

        res.status(200).send("Registration cancelled successfully");
      } catch (error) {
        console.error("Error cancelling registration", error);
        res.status(500).send("Error cancelling registration");
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

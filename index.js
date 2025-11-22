const express = require("express");
const cors = require("cors");
const port = 3000;

const app = express();

// MIDDLEWARE (missing before!)
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://HomeNest-10:1d60YCvLIqCgzH0G@cluster0.g6xesjf.mongodb.net/?appName=Cluster0";

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

    const database = client.db("homeNest");
    const HomeNestServices = database.collection("HomeServices");

    // POST ROUTE
    app.post("/addService", async (req, res) => {
    //   const data = {
    //     name: "Modern Flat in Dhanmondi",
    //     description: "2-bedroom modern apartment with gym and pool.",
    //     category: "Rent",
    //     price: 65000,
    //     location: "Dhanmondi 27, Dhaka",
    //     imageURL: "https://example.com/dhanmondi-flat.jpg",
    //     userEmail: "mrjabedpuc@gmail.com",
    //     userName: "Jabed Hasan",
    //   };

        const data = req.body;
        console.log("Received data:", data);

      const result = await HomeNestServices.insertOne(data);
      res.send(result);
    });

    app.get('/getServices', async (req, res) => {
        const result = await HomeNestServices.find().toArray();
        res.send(result);
    });

    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error(err);
  }
}
run();

app.get("/", (req, res) => {
  res.send("HomeNest Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

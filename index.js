const express = require("express");
const { ObjectId } = require("mongodb");
const cors = require("cors");
const port = 3000;

const app = express();

// Middleware
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

    console.log("Connected to MongoDB!");

    // POST: Add Service
    app.post("/addService", async (req, res) => {
      const data = req.body;
      const result = await HomeNestServices.insertOne(data);
      res.send(result);
    });

    // GET: Latest 6 services
    app.get("/getServices", async (req, res) => {
      const result = await HomeNestServices.find().sort({ _id: -1 }).limit(6).toArray();
      res.send(result);
    });

    // GET: All services
    app.get("/allServices", async (req, res) => {
      const result = await HomeNestServices.find().toArray();
      res.send(result);
    });

    // GET: Single service
    app.get("/singleService/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await HomeNestServices.findOne(query);
        if (!result) return res.status(404).send({ error: "Property not found" });
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch property" });
      }
    });

   // PUT: Update service
    app.put("/updateService/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid property ID format" });
    }

    const updateData = req.body;

    const result = await HomeNestServices.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Property not found" });
    }

    res.send({ message: "Property updated successfully", result });

  } catch (err) {
    console.error("Update error:", err); // 👈 Log full error for debugging
    res.status(500).send({ error: "Failed to update property", details: err.message });
  }
});

    // app.put("/updateService/:id", async(req, res) =>{
    //     const id = req.params.id;
    //     const updateData = req.body;

    //     const query = { _id: new ObjectId(id)}

    //     const updateService = {
    //         $set: updateData
    //     }
    //     const result = await HomeNestServices.updateOne(query, updateService);
    //     res.send(result);
    // })

    // DELETE: Delete service
    app.delete("/deleteService/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await HomeNestServices.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Property not found" });
        }
        res.send({ message: "Property deleted successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to delete property" });
      }
    });

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

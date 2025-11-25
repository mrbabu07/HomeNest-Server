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

    // POST: Add Service — ✅ includes reviews: []
    app.post("/addService", async (req, res) => {
      try {
        const data = {
          ...req.body,
          postedDate: new Date().toISOString().split("T")[0],
          reviews: [], // ✅ Always initialize reviews
        };
        const result = await HomeNestServices.insertOne(data);
        res.status(201).send(result);
      } catch (err) {
        console.error("Add service error:", err);
        res.status(500).send({ error: "Failed to add service" });
      }
    });

    // GET: Latest 6 services
    app.get("/getServices", async (req, res) => {
      try {
        const result = await HomeNestServices.find()
          .sort({ _id: -1 })
          .limit(6)
          .toArray();
        res.send(result);
      } catch (err) {
        console.error("Get services error:", err);
        res.status(500).send({ error: "Failed to fetch services" });
      }
    });

    // GET: All services (for user)
    app.get("/allServices", async (req, res) => {
      try {
        const result = await HomeNestServices.find()
          .sort({ _id: -1 })
          .toArray();
        res.send(result);
      } catch (err) {
        console.error("Get all services error:", err);
        res.status(500).send({ error: "Failed to fetch all services" });
      }
    });

    // GET: Single service
    app.get("/singleService/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid ID" });
        }
        const query = { _id: new ObjectId(id) };
        const result = await HomeNestServices.findOne(query);
        if (!result)
          return res.status(404).send({ error: "Property not found" });
        res.send(result);
      } catch (err) {
        console.error("Get single service error:", err);
        res.status(500).send({ error: "Failed to fetch property" });
      }
    });

    // PUT: Update service
    app.put("/updateService/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid ID" });
        }

        const updateData = req.body; // beginner-friendly

        const result = await HomeNestServices.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        res.send(result);
      } catch (err) {
        console.error("Update error:", err);
        res.status(500).send({ error: "Update failed" });
      }
    });

    // DELETE: Delete service
    app.delete("/deleteService/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid ID" });
        }
        const result = await HomeNestServices.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Property not found" });
        }
        res.send({ message: "Property deleted successfully" });
      } catch (err) {
        console.error("Delete error:", err);
        res.status(500).send({ error: "Failed to delete property" });
      }
    });

    // 🔧 ONE-TIME FIX: Initialize reviews for old properties
    app.get("/fix-reviews", async (req, res) => {
      try {
        const result = await HomeNestServices.updateMany(
          { reviews: { $exists: false } },
          { $set: { reviews: [] } }
        );
        res.send({
          message: "Fixed documents with missing 'reviews' field",
          modifiedCount: result.modifiedCount,
        });
      } catch (err) {
        console.error("Fix reviews error:", err);
        res.status(500).send({ error: "Failed to fix reviews" });
      }
    });

    // POST: Add a review to a property
    app.post("/singleService/:id/reviews", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid property ID" });
        }

        const { reviewerName, rating, reviewText, userEmail } = req.body;

        const newReview = {
          _id: new ObjectId(),
          reviewerName,
          rating: Number(rating),
          reviewText,
          userEmail,
          dateAdded: new Date(),
        };

        const result = await HomeNestServices.updateOne(
          { _id: new ObjectId(id) },
          { $push: { reviews: newReview } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Property not found" });
        }

        res
          .status(201)
          .send({ message: "Review added successfully", review: newReview });
      } catch (err) {
        console.error("🔴 Add review error:", err);
        res
          .status(500)
          .send({ error: "Failed to add review", details: err.message });
      }
    });

    // GET: Reviews by user email (for MyRatings page)
    app.get("/reviewsByUser/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const propertiesWithReviews = await HomeNestServices.find({
          "reviews.userEmail": email,
        }).toArray();

        const userReviews = propertiesWithReviews.flatMap((property) =>
          property.reviews
            .filter((r) => r.userEmail === email)
            .map((r) => ({
              ...r,
              propertyName: property.name,
              propertyImageURL: property.imageURL,
              propertyId: property._id,
            }))
        );

        res.send(userReviews);
      } catch (err) {
        console.error("Fetch user reviews error:", err);
        res.status(500).send({ error: "Failed to fetch reviews" });
      }
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

run().catch(console.error);

app.get("/", (req, res) => {
  res.send("HomeNest Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

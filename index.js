const express = require("express");
const { ObjectId } = require("mongodb");
const cors = require("cors");
const port = 3000;
require("dotenv").config();
const app = express();


// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const { configDotenv } = require("dotenv");

console.log(process.env.DB_USERNAME);
const uri =
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.g6xesjf.mongodb.net/?appName=Cluster0`;

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
    console.log("Successfully connected to MongoDB!");

    const database = client.db("homeNest");
    const HomeNestServices = database.collection("HomeServices");

    // ADD NEW PROPERTY

    app.post("/addService", async (req, res) => {
      try {
        const newProperty = {
          ...req.body,
          postedDate: new Date().toISOString().split("T")[0],
          reviews: [],
        };

        const result = await HomeNestServices.insertOne(newProperty);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding property:", error);
        res.status(500).send({ error: "Failed to add property" });
      }
    });

    // GET LATEST 6 PROPERTIES (For Home Page)

    app.get("/getServices", async (req, res) => {
      try {
        const latestProperties = await HomeNestServices.find()
          .sort({ _id: -1 })
          .limit(6)
          .toArray();

        res.send(latestProperties);
      } catch (error) {
        console.error("Error fetching latest properties:", error);
        res.status(500).send({ error: "Failed to fetch properties" });
      }
    });

    // GET ALL PROPERTIES WITH SEARCH & SORT

    app.get("/allServices", async (req, res) => {
      try {
        const { search, sortBy } = req.query;

        // Build search filter
        let searchFilter = {};
        if (search) {
          searchFilter.name = { $regex: search, $options: "i" };
        }

        // Determine sort order
        let sortOrder = {};

        if (sortBy === "price_asc") {
          sortOrder = { price: 1 };
        } else if (sortBy === "price_desc") {
          sortOrder = { price: -1 };
        } else if (sortBy === "oldest") {
          sortOrder = { _id: 1 };
        } else {
          // Default: newest first
          sortOrder = { _id: -1 };
        }

        // Fetch properties with search and sort
        const properties = await HomeNestServices.find(searchFilter)
          .sort(sortOrder)
          .toArray();

        res.send(properties);
      } catch (error) {
        console.error(" Error fetching all properties:", error);
        res.status(500).send({ error: "Failed to fetch properties" });
      }
    });

    // GET SINGLE PROPERTY BY ID

    app.get("/singleService/:id", async (req, res) => {
      try {
        const propertyId = req.params.id;

        if (!ObjectId.isValid(propertyId)) {
          return res.status(400).send({ error: "Invalid property ID" });
        }

        const property = await HomeNestServices.findOne({
          _id: new ObjectId(propertyId),
        });

        if (!property) {
          return res.status(404).send({ error: "Property not found" });
        }

        res.send(property);
      } catch (error) {
        console.error("Error fetching property:", error);
        res.status(500).send({ error: "Failed to fetch property" });
      }
    });

    // UPDATE PROPERTY

    app.put("/updateService/:id", async (req, res) => {
      try {
        const propertyId = req.params.id;

        if (!ObjectId.isValid(propertyId)) {
          return res.status(400).send({ error: "Invalid property ID" });
        }

        const updatedData = req.body;

        const result = await HomeNestServices.updateOne(
          { _id: new ObjectId(propertyId) },
          { $set: updatedData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Property not found" });
        }

        res.send({ message: "Property updated successfully", result });
      } catch (error) {
        console.error("Error updating property:", error);
        res.status(500).send({ error: "Failed to update property" });
      }
    });

    // DELETE PROPERTY

    app.delete("/deleteService/:id", async (req, res) => {
      try {
        const propertyId = req.params.id;

        if (!ObjectId.isValid(propertyId)) {
          return res.status(400).send({ error: "Invalid property ID" });
        }

        const result = await HomeNestServices.deleteOne({
          _id: new ObjectId(propertyId),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Property not found" });
        }

        res.send({ message: "Property deleted successfully" });
      } catch (error) {
        console.error(" Error deleting property:", error);
        res.status(500).send({ error: "Failed to delete property" });
      }
    });

    // FIX OLD PROPERTIES (Add reviews field)

    app.get("/fix-reviews", async (req, res) => {
      try {
        const result = await HomeNestServices.updateMany(
          { reviews: { $exists: false } },
          { $set: { reviews: [] } }
        );

        res.send({
          message: "Successfully fixed old properties",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error(" Error fixing reviews:", error);
        res.status(500).send({ error: "Failed to fix reviews" });
      }
    });

    // ADD REVIEW TO PROPERTY

    app.post("/singleService/:id/reviews", async (req, res) => {
      try {
        const propertyId = req.params.id;

        if (!ObjectId.isValid(propertyId)) {
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
          { _id: new ObjectId(propertyId) },
          { $push: { reviews: newReview } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Property not found" });
        }

        res.status(201).send({
          message: "Review added successfully",
          review: newReview,
        });
      } catch (error) {
        console.error(" Error adding review:", error);
        res.status(500).send({ error: "Failed to add review" });
      }
    });

    // GET USER'S REVIEWS (For My Ratings Page)

    app.get("/reviewsByUser/:email", async (req, res) => {
      try {
        const userEmail = req.params.email;

        const propertiesWithUserReviews = await HomeNestServices.find({
          "reviews.userEmail": userEmail,
        }).toArray();

        const userReviews = propertiesWithUserReviews.flatMap((property) =>
          property.reviews
            .filter((review) => review.userEmail === userEmail)
            .map((review) => ({
              ...review,
              propertyName: property.name,
              propertyImageURL: property.imageURL,
              propertyId: property._id,
            }))
        );

        res.send(userReviews);
      } catch (error) {
        console.error(" Error fetching user reviews:", error);
        res.status(500).send({ error: "Failed to fetch reviews" });
      }
    });
  } catch (error) {
    console.error(" MongoDB connection error:", error);
  }
}

run().catch(console.error);

// SERVER STATUS CHECK

app.get("/", (req, res) => {
  res.send("🏠 HomeNest Server is running smoothly!");
});

app.listen(port, () => {
  console.log(` Server is running on http://localhost:${port}`);
});

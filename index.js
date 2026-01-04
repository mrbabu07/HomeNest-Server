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

console.log("Connecting to MongoDB...");
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.g6xesjf.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    console.log("✅ Successfully connected to MongoDB!");

    const database = client.db("homeNest");
    const HomeNestServices = database.collection("HomeServices");

    

    // ✅ ADD NEW PROPERTY
    app.post("/addService", async (req, res) => {
      try {
        const {
          name,
          description,
          location,
          price,
          category,
          ownerEmail,
          ownerName,
          bedrooms = 0,
          bathrooms = 0,
          area = "",
          parking = false,
          amenities = [],
          imageURL = "",
          imageURLs = [],
        } = req.body;

        // Validate required fields
        if (!name || !price || !location || !ownerEmail) {
          return res.status(400).send({ error: "Missing required fields" });
        }

        const newProperty = {
          name,
          description: description || "",
          location,
          price: Number(price),
          category: category || "other",
          ownerEmail,
          ownerName: ownerName || "Owner",
          bedrooms: Number(bedrooms) || 0,
          bathrooms: Number(bathrooms) || 0,
          area: String(area) || "",
          parking: Boolean(parking),
          amenities: Array.isArray(amenities) ? amenities : [],
          imageURL: imageURL || "",
          imageURLs: Array.isArray(imageURLs) && imageURLs.length > 0 ? imageURLs : [imageURL],
          postedDate: new Date().toISOString(),
          reviews: [],
          rating: 0,
        };

        const result = await HomeNestServices.insertOne(newProperty);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error("❌ Error adding property:", error);
        res.status(500).send({ error: "Failed to add property" });
      }
    });

    // ✅ GET LATEST 6 PROPERTIES (For Home Page)
    app.get("/getServices", async (req, res) => {
      try {
        const latestProperties = await HomeNestServices.find()
          .sort({ _id: -1 })
          .limit(6)
          .toArray();

        res.send(latestProperties);
      } catch (error) {
        console.error("❌ Error fetching latest properties:", error);
        res.status(500).send({ error: "Failed to fetch properties" });
      }
    });

    // ✅ GET LOGGED-IN USER'S PROPERTIES
    app.get("/myServices", async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) {
          return res.status(400).send({ error: "Email is required" });
        }

        const properties = await HomeNestServices.find({
          ownerEmail: email,
        }).toArray();
        
        res.send(properties);
      } catch (error) {
        console.error("❌ Error fetching user properties:", error);
        res.status(500).send({ error: "Failed to fetch properties" });
      }
    });

    // ✅ GET ALL PROPERTIES WITH FILTERS & PAGINATION
    app.get("/allServices", async (req, res) => {
      try {
        const { search, sortBy, category, page = 1, limit = 8 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Filter
        let filter = {};

        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
          ];
        }

        if (category && category !== "all") {
          filter.category = category;
        }

        // Sorting
        let sortOrder = {};
        switch (sortBy) {
          case "price_asc":
            sortOrder = { price: 1 };
            break;
          case "price_desc":
            sortOrder = { price: -1 };
            break;
          case "oldest":
            sortOrder = { _id: 1 };
            break;
          default:
            sortOrder = { _id: -1 }; // newest
        }

        // Total count
        const totalItems = await HomeNestServices.countDocuments(filter);

        // Query
        const properties = await HomeNestServices.find(filter)
          .sort(sortOrder)
          .skip(skip)
          .limit(limitNum)
          .toArray();

        // Response
        res.send({
          properties,
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
          currentPage: pageNum,
        });
      } catch (error) {
        console.error("❌ Error fetching properties:", error);
        res.status(500).send({ error: "Failed to fetch properties" });
      }
    });

    // ✅ GET SINGLE PROPERTY BY ID
    app.get("/singleService/:id", async (req, res) => {
      try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid property ID" });
        }

        const property = await HomeNestServices.findOne({ 
          _id: new ObjectId(id) 
        });

        if (!property) {
          return res.status(404).send({ error: "Property not found" });
        }

        res.send(property);
      } catch (error) {
        console.error("❌ Error fetching property:", error);
        res.status(500).send({ error: "Failed to fetch property" });
      }
    });

    // ✅ UPDATE PROPERTY
    app.put("/updateService/:id", async (req, res) => {
      try {
        const propertyId = req.params.id;

        if (!ObjectId.isValid(propertyId)) {
          return res.status(400).send({ error: "Invalid property ID" });
        }

        const updatedData = req.body;
        // Remove _id from update data if present
        delete updatedData._id;

        const result = await HomeNestServices.updateOne(
          { _id: new ObjectId(propertyId) },
          { $set: updatedData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Property not found" });
        }

        res.send({ 
          success: true, 
          message: "Property updated successfully", 
          modifiedCount: result.modifiedCount 
        });
      } catch (error) {
        console.error("❌ Error updating property:", error);
        res.status(500).send({ error: "Failed to update property" });
      }
    });

    // ✅ DELETE PROPERTY
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

        res.send({ 
          success: true, 
          message: "Property deleted successfully" 
        });
      } catch (error) {
        console.error("❌ Error deleting property:", error);
        res.status(500).send({ error: "Failed to delete property" });
      }
    });

    

    // ✅ ADD REVIEW TO PROPERTY
    app.post("/singleService/:id/reviews", async (req, res) => {
      try {
        const propertyId = req.params.id;

        if (!ObjectId.isValid(propertyId)) {
          return res.status(400).send({ error: "Invalid property ID" });
        }

        const { reviewerName, rating, reviewText, userEmail } = req.body;

        if (!reviewerName || !rating || !reviewText || !userEmail) {
          return res.status(400).send({ error: "Missing required fields" });
        }

        const newReview = {
          _id: new ObjectId(),
          reviewerName,
          rating: Number(rating),
          reviewText,
          userEmail,
          dateAdded: new Date(),
        };

        // Add review
        const result = await HomeNestServices.updateOne(
          { _id: new ObjectId(propertyId) },
          { $push: { reviews: newReview } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Property not found" });
        }

        // Update average rating
        const property = await HomeNestServices.findOne({ 
          _id: new ObjectId(propertyId) 
        });
        
        if (property && property.reviews) {
          const avgRating = property.reviews.reduce((sum, r) => sum + r.rating, 0) / property.reviews.length;
          await HomeNestServices.updateOne(
            { _id: new ObjectId(propertyId) },
            { $set: { rating: avgRating } }
          );
        }

        res.status(201).send({
          success: true,
          message: "Review added successfully",
          review: newReview,
        });
      } catch (error) {
        console.error("❌ Error adding review:", error);
        res.status(500).send({ error: "Failed to add review" });
      }
    });

    // ✅ GET USER'S REVIEWS (For My Ratings Page)
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
              propertyImageURL: property.imageURL || property.imageURLs?.[0],
              propertyId: property._id,
            }))
        );

        res.send(userReviews);
      } catch (error) {
        console.error("❌ Error fetching user reviews:", error);
        res.status(500).send({ error: "Failed to fetch reviews" });
      }
    });

    
    // ✅ CREATE NOTIFICATION
    app.post("/api/notify", async (req, res) => {
      try {
        const { to, message, type, propertyId } = req.body;

        if (!to || !message) {
          return res.status(400).send({ error: "Missing required fields" });
        }

        const notification = {
          to,
          message,
          type: type || "info",
          propertyId: propertyId || null,
          timestamp: new Date(),
          read: false,
        };

        const result = await database
          .collection("notifications")
          .insertOne(notification);
        
        res.send({ success: true, id: result.insertedId });
      } catch (error) {
        console.error("❌ Error creating notification:", error);
        res.status(500).send({ error: "Failed to create notification" });
      }
    });

    // ✅ GET ALL NOTIFICATIONS FOR A USER
    app.get("/api/notifications", async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) {
          return res.status(400).send({ error: "Email is required" });
        }

        const notifications = await database
          .collection("notifications")
          .find({ to: email })
          .sort({ timestamp: -1 })
          .limit(50)
          .toArray();

        res.send(notifications);
      } catch (error) {
        console.error("❌ Error fetching notifications:", error);
        res.status(500).send({ error: "Failed to fetch notifications" });
      }
    });

    // ✅ MARK SINGLE NOTIFICATION AS READ
    app.patch("/api/notifications/:id/read", async (req, res) => {
      try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid notification ID" });
        }

        const result = await database
          .collection("notifications")
          .updateOne(
            { _id: new ObjectId(id) }, 
            { $set: { read: true } }
          );

        res.send({ success: true, modified: result.modifiedCount });
      } catch (error) {
        console.error("❌ Error marking notification as read:", error);
        res.status(500).send({ error: "Failed to mark as read" });
      }
    });

    // ✅ MARK ALL NOTIFICATIONS AS READ
    app.patch("/api/notifications/mark-all-read", async (req, res) => {
      try {
        const { email } = req.body;
        if (!email) {
          return res.status(400).send({ error: "Email is required" });
        }

        const result = await database
          .collection("notifications")
          .updateMany(
            { to: email, read: false }, 
            { $set: { read: true } }
          );

        res.send({ success: true, modified: result.modifiedCount });
      } catch (error) {
        console.error("❌ Error marking all as read:", error);
        res.status(500).send({ error: "Failed to mark all as read" });
      }
    });

    // ✅ DELETE SINGLE NOTIFICATION
    app.delete("/api/notifications/:id", async (req, res) => {
      try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid notification ID" });
        }

        const result = await database
          .collection("notifications")
          .deleteOne({ _id: new ObjectId(id) });

        res.send({ success: true, deleted: result.deletedCount });
      } catch (error) {
        console.error("❌ Error deleting notification:", error);
        res.status(500).send({ error: "Failed to delete notification" });
      }
    });

    // ✅ CLEAR ALL NOTIFICATIONS
    app.delete("/api/notifications/clear-all", async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) {
          return res.status(400).send({ error: "Email is required" });
        }

        const result = await database
          .collection("notifications")
          .deleteMany({ to: email });

        res.send({ success: true, deleted: result.deletedCount });
      } catch (error) {
        console.error("❌ Error clearing notifications:", error);
        res.status(500).send({ error: "Failed to clear notifications" });
      }
    });

    

    // ✅ FIX OLD PROPERTIES (Add missing fields)
    app.get("/fix-properties", async (req, res) => {
      try {
        const result = await HomeNestServices.updateMany(
          { reviews: { $exists: false } },
          { $set: { reviews: [], rating: 0 } }
        );

        res.send({
          success: true,
          message: "Successfully fixed old properties",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error("❌ Error fixing properties:", error);
        res.status(500).send({ error: "Failed to fix properties" });
      }
    });

    // ✅ GET STATS (Optional - for dashboard)
    app.get("/api/stats", async (req, res) => {
      try {
        const totalProperties = await HomeNestServices.countDocuments();
        const totalReviews = await HomeNestServices.aggregate([
          { $project: { reviewCount: { $size: { $ifNull: ["$reviews", []] } } } },
          { $group: { _id: null, total: { $sum: "$reviewCount" } } }
        ]).toArray();

        const stats = {
          totalProperties,
          totalReviews: totalReviews[0]?.total || 0,
          verified: 98,
          support: "24/7",
        };

        res.send(stats);
      } catch (error) {
        console.error("❌ Error fetching stats:", error);
        res.status(500).send({ error: "Failed to fetch stats" });
      }
    });

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

run().catch(console.error);



app.get("/", (req, res) => {
  res.send("🏠 HomeNest Server is running smoothly!");
});

app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
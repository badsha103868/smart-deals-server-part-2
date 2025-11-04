const express = require("express");
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const cors = require("cors");
const app = express();

const admin = require("firebase-admin");

const port = process.env.port || 3000;

// firebase admin sdk copy kore paste korbo


const serviceAccount = require("./smart-deals-firebase-admin-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



// console.log(process.env);

// middleware
app.use(cors());
app.use(express.json());

//  verify middleware
const logger=(req, res, next)=>{
  console.log("login information");
  next();
}

// firebase verify token 
const verifyFireBaseToken = async (req, res, next)=>{
  // console.log('in the verify middleware', req.headers.authorization)
 if(!req.headers.authorization){
  // do not allow to go
  return res.status(401).send({message: 'unauthorized access'})
 }
 const token = req.headers.authorization.split(' ')[1]
 if(!token){
  return res.status(401).send({message: 'unauthorized access'})
 }
   
 try{
  const userInfo =    await admin.auth().verifyIdToken(token);
   req.token_email = userInfo.email;
  console.log("after token validation:",userInfo) 
  next();
 }
 catch{
     return res.status(401).send({message: 'unauthorized access'})
 }

  
}



// mongodb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@portfolio-cluster1.ea8n2bl.mongodb.net/?appName=portfolio-cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("smart_db");
    const productsCollection = db.collection("products");
    const bidsCollection = db.collection("bids");
    const usersCollection = db.collection("users");

    // users data post  APIs
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send({
          message: "user already exits. do not need to insert again",
        });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    //      GET PRODUCTS APIs
    app.get("/products", async (req, res) => {
      // const projectFields = {title: 1 , price_min: 1 , price_max: 1 , image: 1 }
      // const cursor = productsCollection.find().sort({price_min: 1}).limit(5).project(projectFields);

      console.log(req.query);
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }

      const cursor = productsCollection.find(query);

      const result = await cursor.toArray();
      res.send(result);
    });

    // latest data load from products apis
    app.get("/latest-products", async (req, res) => {
      const cursor = productsCollection
        .find()
        .sort({
          created_at: -1,
        })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    //   single data find
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    //           POST
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    //         PATCH

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updatedProduct.name,
          price: updatedProduct.price,
        },
      };
      const options = {};
      const result = await productsCollection.updateOne(query, update, options);
      res.send(result);
    });

    //  DELETE

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    //   bids related api



    app.get("/bids", logger ,verifyFireBaseToken ,  async (req, res) => {
        
      // authorization token header

      // console.log('headers', req.headers)
       
      const email = req.query.email;
      const query = {};
      if (email) { 
        if(email !== req.token_email ){
          return res.status(403).send({message: 'forbidden access'})
        }
        query.buyer_email = email;
      }

      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //   bid for this product

    app.get("/products/bids/:productId", async (req, res) => {
      const productId = req.params.productId;
      const query = { product: productId };
      const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
      const result = await cursor.toArray();
      res.send(result);
    }); 
     
    //  get all  bids

    // app.get('/bids', async (req, res)=>{
      
    //   const query = {};
    //    if(query.email){
    //     query.buyer_email = email;
    //    }

    //    const cursor = bidsCollection.find(query);
    //    const result  = await cursor.toArray();
    //    res.send(result)
    // })

    //   bids post

    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });
    
    // delete
    app.delete('/bids/:id', async (req, res )=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await bidsCollection.deleteOne(query);
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

// normal get
app.get("/", (req, res) => {
  res.send("Smart server is running");
});

// listen
app.listen(port, () => {
  console.log(`Smart server is running on port: ${port}`);
});

// second way to connect mongodb

// client.connect()
// .then(()=>{
//   app.listen(port, ()=>{
//     console.log(`Smart server is running now on port: ${port}`)
//   })
// })
// .catch(console.dir)

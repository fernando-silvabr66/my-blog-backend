import fs from 'fs';
inport admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { db, connectToDb } from './db.js';

//const cors = require('cors');

const credentials = JSON.parse(fs.readFileSync('../credentials.json'));

admin.initializeApp({
    credential: admin.credential.cert(credentials),
});

const app = new express();
app.use(express.json());
app.use(cors());

app.use(async (req, res, next) => {
    const authtoken = req.headers.autorization;
    if (!authtoken) {
        try{
            req.user = await admin.auth().verifyIdToken(authtoken);
        } catch (e) {
            res.status(401).send('Invalid token');    
        }
    }

    next();
});

// app.post('/hello', (req, res) => {
//     console.log(req.body);
//     res.send(`Hello, ${req.body.name}!`);
// });



app.get('/api/articles/:name', async (req, res) => {
    //const name = req.params.name;
    const { name } = req.params;
    //res.send(`Hello, ${name}!`);
    //const client = new MongoClient('mongodb://localhost:27017');
    //await client.connect();

    //const db = client.db('react-blog-db');
    const { uid } = req.user;

    const article = await db.collection('articles').findOne({ name });

    if (article) {
        const upvoteIds = article.upvotesId || [];
        article.upvoteIds = uid && upvoteIds.includes(uid);
        res.status(200).json(article);
    } else {
        res.status(404).send('Article not found!');
    }   

});

app.put('/api/articles/:name/upvote', async (req, res) => {
    const { name } = req.params;

    await db.collection('articles').updateOne({ name }, {
        $inc: { upvotes: 1 },
    })

    const article = await db.collection('articles').findOne({ name });

    if (article) {
        //article.upvotes += 1;
        res.status(200).json(article);
    } else {
        res.status(404).send('Article not found');
    }
});

app.post('/api/articles/:name/comments', async (req, res) => {
    const { name } = req.params;
    const { postedBy, text } = req.body;

    // const article = articlesInfo.find(article => article.name === name);
    //const client = new MongoClient('mongodb://localhost:27017');
    //await client.connect();
    //const db = client.db('react-blog-db');

    await db.collection('articles').updateOne({ name }, {
        $push: { comments: { postedBy, text } },
    });

    const article = await db.collection('articles').findOne({ name });

    if (article) {
        //article.comments.push({ postedBy, text });
        res.status(200).json(article);
    } else {
        res.status(404).send('Article not found');
    }
});

connectToDb(() => {
    console.log('Successfully connected to database!');
    app.listen(8080, () => {
        console.log('Server is listening on port 8080');
    });
});
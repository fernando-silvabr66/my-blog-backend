import fs from 'fs';
import admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { db, connectToDb } from './db.js';

const credentials = JSON.parse(fs.readFileSync('../credentials.json'));

admin.initializeApp({
    credential: admin.credential.cert(credentials),
});

const app = new express();
app.use(express.json());
app.use(cors());

app.use(async (req, res, next) => {
    const authtoken = req.headers.autorization;
    if (authtoken) {
        try{
            req.user = await admin.auth().verifyIdToken(authtoken);
        } catch (e) {
            res.status(401).send('Invalid token');    
        }
    }

    next();
});

app.get('/api/articles/:name', async (req, res) => {
    const { name } = req.params;
    const { uid } = req.user;

    const article = await db.collection('articles').findOne({ name });

    if (article) {
        const upvoteIds = article.upvoteIds || [];
        article.canUpvote = uid && !upvoteIds.include(uid);
        res.status(200).json(article);
    } else {
        res.status(404).send('Article not found!');
    }   

});

app.use((req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.status(401).send('Unauthenticated');
    }
});

app.put('/api/articles/:name/upvote', async (req, res) => {
    const { name } = req.params;
    const { uid } = req.user;

    const article = await db.collection('articles').findOne({ name });

    if (article) {
        const upvoteIds = article.upvotesId || [];
        const canUpvote = uid && !upvoteIds.include(uid);

        if (canUpvote) {
            await db.collection('articles').updateOne({ name }, {
                $inc: { upvotes: 1 },
                $push: { upvoteIds: uid },
            });
        }

        const updatedArticle = await db.collection('articles').findOne({ name });
        res.status(200).json(updatedArticle);
    } else {
        res.status(404).send('Article not found!');
    }
});

app.post('/api/articles/:name/comments', async (req, res) => {
    const { name } = req.params;
    const { text } = req.body;
    const { email } = req.user;

    // const article = articlesInfo.find(article => article.name === name);
    //const client = new MongoClient('mongodb://localhost:27017');
    //await client.connect();
    //const db = client.db('react-blog-db');

    await db.collection('articles').updateOne({ name }, {
        $push: { comments: { postedBy: email, text } },
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
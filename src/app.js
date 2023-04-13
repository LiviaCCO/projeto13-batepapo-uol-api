import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';


const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

//conexão com o BD
let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);
mongoClient.connect().then(()=>db=mongoClient.db()).catch((err)=>console.log(err.message));

const PORT = 5000;
app.listen(PORT, ()=>console.log(`Servidor rodando na porta ${PORT}`));

const participants=[];

app.post("/participants", async(req, res)=> {
    const name=req.body;
    // inserir validações
    try{
        const participant = { name, lastStatus: Date.now() };
        await db.collection("participants").insertOne(participant);
        //tratar a data dayjs
        const message= { from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: 'HH:mm:ss' }
        await db.collection("messages").insertOne(message);
        res.sendStatus(201);
    } catch (err){
        res.status(500).send(err.message)
    }

})

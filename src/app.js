import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

//conexão com o BD
let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);
mongoClient.connect().then(()=>db=mongoClient.db()).catch((err)=>console.log(err.message)); 

//ou
/* const mongoClient = new MongoClient(process.env.DATABASE_URL);
try{
    await mongoClient.connect();
    console.log("MongoDB conectado")
} catch (err){
    console.log(err.message)
}
const db = mongoClient.db(); */


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

app.get('/participants', async (req, res) => {
    try {
      const participants = await db.collection('participants').find().toArray();
      res.send(participants);
      } catch (err) {
        console.error(err);
        res.sendStatus(500);
      }
});

const PORT = 5000;
app.listen(PORT, ()=>console.log(`Servidor rodando na porta ${PORT}`));
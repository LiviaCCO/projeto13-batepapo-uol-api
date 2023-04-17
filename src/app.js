import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import joi from 'joi';
import dayjs from 'dayjs';
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
    const nameObj=req.body;
    const name=req.body.name;

    //console.log(name)
    // validações
    const partSchema = joi.object({
        name: joi.string().required(),
    });
    const validation = partSchema.validate(nameObj, { abortEarly: false });
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }
    //para verificar se já tem o nome cadastrado
    try {
        const participants = await db.collection('participants').find().toArray();
        
        if(participants.find(p=>p.name===name)){
            console.log("Entrou")
            return res.status(409).send('Usuário já cadastrado!');
        }
        //Gerando a data:
        const lastStatus = Date.now();
        const time = dayjs().format('HH:mm:ss'); 
        const participant = { name, lastStatus}; 
        console.log(participant)    
        await db.collection("participants").insertOne(participant);
        //tratar a data dayjs
        const message= { from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time }
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

app.post('/messages', async(req, res)=> {
    const {to, text, type}=req.body;
    const user = req.headers.user; 
    const from = user; // header
    const time = dayjs().format('HH:mm:ss');
    const msg= { from, to, text, type, time }
    // validações
    const msgSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        from: joi.string().required(), //DEVE SER PARTICIPANTE ATIVO
        time: joi.string().required(),
        type: joi.string().valid("message","provate_message").required(), // deve ser message ou private_message
    });
    const validation = msgSchema.validate(msg, { abortEarly: false });
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }
    try{
        console.log("msg", msg)
        //const msg= { from, to, text, type, time }
        await db.collection('messages').insertOne(msg);
        res.sendStatus(201);
    } catch (err){
        res.status(500).send(err.message)
    }
})

app.get('/messages', async (req, res) => {
    const user = req.headers.user; 
    const limit = parseInt(req.query.limit);
    console.log("user", user)
    console.log('limit', limit)
    let userMsg=[];
    if (limit <= 0 || typeof limit !== 'number') return res.sendStatus(422)
    try {
      const msg = await db.collection('messages').find().toArray();
      for(let i=0; i<msg.length; i++){
        if(msg[i].to===user || msg[i].from===user || msg[i].to==="Todos"){
            userMsg.push(msg[i]);
        }
      }
      if(typeof limit === 'number' && limit >0) return res.send(userMsg.slice(-limit));

      res.send(userMsg);
      } catch (err) {
        console.error(err);
        res.sendStatus(500);
      }
});

app.post("/status", async(req, res)=> {
    const user = req.headers.user; 
    console.log("usuario", user)
    if (!user || user===undefined) return res.sendStatus(404);
    
    try{
        const participants = await db.collection('participants').find().toArray();
        const userInList = participants.find(u=>u.name===user);
        // se não houver usuário na lista
        if(!userInList) return res.sendStatus(404);
        
        // se estiver na lista, atualizar o horário
        const {id} = userInList._id;
        const lastStatus = Date.now();
        await db.collection('participants').updateOne(
            {_id: new ObjectId(id)},
            {$set: {lastStatus}}
        )
        res.sendStatus(200);
    } catch (err){
        res.status(500).send(err.message)
    }
})


//const antes = dayjs().subtract(10, 'second').format('HH:mm:ss');
const timeNow = Date.now();
const timeOut = timeNow - 10000;
const time = dayjs().format('HH:mm:ss');

//para remover os inativos
const inativeRemove = async () => {
    //console.log("Entrou no status")
    try{
        const partFora= await db.collection('participants').find({ lastStatus: { $lt: timeOut } }).toArray();
        for(let i=0; i<partFora.length; i++){
            const msgExit={
                    from: partFora[i].name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: time
            }
            try{
                console.log("msg", msgExit)
                await db.collection('messages').insertOne(msgExit);
            } catch (err){
                console.log(err.message)
            }
        }
        const deletePartFora= await db.collection('participants').deleteMany({ lastStatus: { $lt: timeOut } });
        console.log(`${deletePartFora.deletedCount} participantes removidos`);
        console.log(partFora);
    }catch (err){
            console.log(err.message)
    }
}
setInterval(inativeRemove, 15000);
    
const PORT = 5000;
app.listen(PORT, ()=>console.log(`Servidor rodando na porta ${PORT}`));


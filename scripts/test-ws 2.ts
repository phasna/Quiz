import { io } from 'socket.io-client';

const token = process.argv[2]; // passe le JWT en argument
const socket = io('http://localhost:3000', { auth: { token } });

socket.on('connect_error', (err) => {
  console.error('Connexion refusée :', err.message);
  process.exit(1);
});

socket.on('connect', () => {
  socket.emit('quiz:join', 'partie-1');
  socket.emit('quiz:answer', { questionId: 1, selectedAnswer: 'A', userId: 3 }, (res: any) => {
    console.log('Réponse reçue :', res);
    socket.close();
  });
});

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const bodyParser = require('body-parser');
const { sequelize, User, Poll, Vote, AnswerCount } = require('./database');
const { Sequelize, Op } = require('sequelize');


const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(bodyParser.json()); // Use body-parser to parse JSON bodies

//TESTING FUNCTION
const allowAnyUser = false; // Set this to false to restrict to specific tokens

app.use(async (req, res, next) => {
  console.log("Middleware triggered");  // Debugging

  const { token } = req.query;
  console.log("Received token:", token);  // Debugging

  if (!token) {
    return res.status(403).send("A token is required for authentication.");
  }

  const allowedTokens = ["58616959-59fe-41dc-9932-a3e24d37bd29", "295bb317-f74d-46f7-9ac4-3766ad383975"];
  if (!allowedTokens.includes(token)) {
    return res.status(401).send("Invalid token.");
  }

  const user = await User.findOne({ where: { token } });
  if (!user) {
    return res.status(401).send("Invalid token.");
  }

  req.user = user;  // Debugging
  console.log("Middleware passed");
  next();
});



// Initialize database and start the server
sequelize.sync()
  .then(() => {
    server.listen(3000, () => {
      // Initialize narrator selection immediately
      selectUserForQuestion();
    })
  })

  .catch(error => {
    console.error('Failed to sync database:', error);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


//Validating tokens on server


app.get('/is-it-my-turn', (req, res) => {
  const { token } = req.query;
  // Logic to check if it's the user's turn
  res.json({ isTurn: true }); // Example response
});


//Choosing narrator:
let switchTimer;
function selectUserForQuestion() {
  if (allowAnyUser) {
    // Select from any user
    User.findAll().then(users => {
      if (users.length === 0) return;
      const randomIndex = Math.floor(Math.random() * users.length);
      const selectedUser = users[randomIndex];
      updateUserTurn(selectedUser);
    });
  } else {
    // Select only from specific tokens
    User.findAll({
      where: {
        token: {
          [Op.in]: ["58616959-59fe-41dc-9932-a3e24d37bd29", "295bb317-f74d-46f7-9ac4-3766ad383975"]
        }
      }
    }).then(users => {
      if (users.length === 0) return;
      const randomIndex = Math.floor(Math.random() * users.length);
      const selectedUser = users[randomIndex];
      updateUserTurn(selectedUser);
    });
  }
}

function updateUserTurn(selectedUser) {
  User.update({ isTurn: false }, { where: {} }).then(() => {
    selectedUser.update({ isTurn: true }).then(() => {
      clearTimeout(switchTimer);
      switchTimer = setTimeout(selectUserForQuestion, 1800000); // 30 min
    });
  });
}

// Function to check if all users have voted
function checkAllVoted(pollId) {
  Vote.findAndCountAll({ where: { pollId: pollId } })
    .then(result => {
      if (result.count >= 16) { // Assuming there are exactly 16 users
        selectUserForQuestion();
      }
    })
    .catch(err => console.error("Error checking votes:", err));
}


//handling poll creation in backend
// Placeholder for storing polls in memory
let currentPoll = null; // Store current poll at a higher scope to maintain state across connections

io.on('connection', (socket) => {
    // Fetch the most recent poll from the database
    Poll.findOne({
      order: [['createdAt', 'DESC']]
    }).then(poll => {
      if (poll) {
          const answers = JSON.parse(poll.answers); // Ensure answers are parsed into an array
          AnswerCount.findAll({
              where: { pollId: poll.id }
          }).then(answerCounts => {
              const votes = answers.map((_, index) => {
                  const countEntry = answerCounts.find(ac => ac.answerIndex === index);
                  return countEntry ? countEntry.count : 0;
              });
              const totalVotes = votes.reduce((a, b) => a + b, 0);
  
              socket.emit('poll_created', {
                  id: poll.id,
                  question: poll.question,
                  answers: answers,
                  votes: votes,
                  totalVotes: totalVotes
              });
          });
      }
  }).catch(err => console.error('Error fetching the latest poll:', err));
  

    const token = socket.handshake.query.token;

    // Emit turn status based on the token
    if (token === "58616959-59fe-41dc-9932-a3e24d37bd29") {
        socket.emit('update_turn_status', { isTurn: true });
    } else {
        socket.emit('update_turn_status', { isTurn: false });
    }

    const { v4: uuidv4 } = require('uuid');
    
    socket.on('create_poll', async (pollData) => {
      try{  
        if (token === "58616959-59fe-41dc-9932-a3e24d37bd29") {
          const pollId = uuidv4();  // Generates a unique UUID
          const newPoll = await Poll.create({
            id: pollId,
            question: pollData.question,
            answers: JSON.stringify(pollData.answers),  // Storing answers as a JSON string for DB
        });
          currentPoll = {
            id: newPoll.id,
            question: newPoll.question,
            answers: pollData.answers,
            votes: new Array(pollData.answers.length).fill(0)
          };
          io.emit('poll_created', currentPoll);
        }
      } catch (error) {
        console.error("Error creating poll:", error);
      }
    });

    // Checking if User has already voted
    socket.on('check_voted', async (data, callback) => {
      try {
        const { pollId } = data;

        if (!pollId) {
          console.error('Poll ID is undefined');
          callback(false);
          return;
        }
        const user = await User.findOne({ where: { token: socket.handshake.query.token } });
        if (!user) {
            console.error('User not found');
            callback(false);  // Assuming false means not voted
            return;
        }

        const existingVote = await Vote.findOne({
            where: { userId: user.id, pollId: pollId }
        });

        callback(!!existingVote);
      } catch (error) {
          console.error('Error checking vote status:', error);
          callback(false);  // Safe default on error
      }
    });
  
    //submit vote
    socket.on('submit_vote', async (voteData) => {
      try {
        const { pollId, answerIndex } = voteData;
        const user = await User.findOne({ where: { token: socket.handshake.query.token } });
        if (!user) throw new Error("User not found");
        const poll = await Poll.findByPk(pollId);
        if (!poll) throw new Error("Poll not found");

        const answerCount = await AnswerCount.findOne({
          where: { pollId: pollId, answerIndex: answerIndex }
        });

        const existingVote = await Vote.findOne({
          where: { userId: user.id, pollId: pollId }
        });

        if (existingVote) {
            socket.emit('vote_error', 'You have already voted!');
        } else {
          await Vote.create({
              userId: user.id,
              pollId: pollId              
            });
        
          if (answerCount) {
            answerCount.count += 1;
            await answerCount.save();
          } else {
            await AnswerCount.create({
                pollId: pollId,
                answerIndex: answerIndex,
                count: 1
            });
          }
        }   
        // Retrieve the number of votes for each answer
        const answers = JSON.parse(poll.answers);
        const answersVoteCounts = await Promise.all(answers.map(async (_, index) => {
          const count = await AnswerCount.sum('count', {
            where: { pollId: pollId, answerIndex: index }
          });
          return count || 0;
        }));

        const totalVotes = answersVoteCounts.reduce((a, b) => a + b, 0);
        io.emit('update_poll', {
          id: pollId,
          question: poll.question,
          answers: answers,
          votes: answersVoteCounts,
          totalVotes
        });
          
      } catch (error) {
          console.error('Voting error:', error);
          socket.emit('vote_error', 'Error processing your vote');
      }
    });
  

});

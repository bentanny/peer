const token = new URLSearchParams(window.location.search).get('token');
document.getElementById('poll-container').style.display = 'none';  // Start hidden
document.getElementById('vote-disclosure').style.display = 'none';

if (token) {
    fetch(`/is-it-my-turn?token=${token}`)
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.isTurn) {
            document.getElementById('new-poll-container').style.display = 'block';
        } else {
            document.getElementById('wait-message').style.display = 'block';
        }
    })
    .catch(error => {
        document.getElementById('poll-container').style.display = 'none';
    });

}

//Handling poll submission in frontend
document.addEventListener('DOMContentLoaded', () => {
    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');



    if (!token) {
        const errorMessage = document.getElementById('error-message');
        errorMessage.innerText = 'A token is required for authentication.';
        errorMessage.classList.add('centered-error');
        errorMessage.style.display = 'block';

        return;  // Stop further execution
    }


    // Connect to socket with token as query parameter
    const socket = io({ query: `token=${token}` });

    socket.on('poll_created', pollData => {
    fetch(`/validate-token?token=${token}`)
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text);
                });
            }
            return response.json();
        })
        .then(data => {
            const isValidToken = data.valid;
            document.getElementById('poll-container').style.display = 'block';

            socket.emit('check_voted', { pollId: pollData.id }, (hasVoted) => {
                displayPoll(pollData, hasVoted, isValidToken);
            });
        })
        .catch(error => {
            const errorMessage = document.getElementById('error-message');
            errorMessage.innerText = error.message;
            errorMessage.classList.add('centered-error');
            errorMessage.style.display = 'block';

            document.getElementById('poll-container').style.display = 'none';
            document.getElementById('vote-disclosure').style.display = 'none';
            return;
        });
    });

    //Update poll whenever vote is received
    socket.on('update_poll', pollData => {
        if (pollData.id) {
            socket.emit('check_voted', { pollId: pollData.id }, (hasVoted) => {
                displayPoll(pollData, hasVoted);
            });
        }
    });

    // Listen for server's instruction to show/hide the new poll container
    socket.on('update_turn_status', ({ isTurn }) => {
        const newPollContainer = document.getElementById('new-poll-container');
        if (isTurn) {
          newPollContainer.style.display = 'block';
        } else {
          newPollContainer.style.display = 'none';
        }
      });

    //Create Poll button
    const createPollBtn = document.getElementById('create-poll-btn');
    createPollBtn.addEventListener('click', () => {
        const question = document.getElementById('poll-question').value;
        const answers = [
            document.getElementById('poll-answer-1').value,
            document.getElementById('poll-answer-2').value,
            document.getElementById('poll-answer-3').value,
            document.getElementById('poll-answer-4').value,
        ].filter(answer => answer.trim() !== ''); // Filter out empty answers

        // Send the poll data to the server if there's at least one answer
        if (answers.length > 0) {
            socket.emit('create_poll', { question, answers });
        } else {
            alert("Please enter at least one answer option.");
        }
    });

    // Receive and display a new poll from the server
    // socket.on('poll_created', pollData => {
    //     if (pollData.id) {
    //         socket.emit('check_voted', { pollId: pollData.id }, (hasVoted) => {
    //             displayPoll(pollData, hasVoted);
    //         });
    //     }
    // });

   

    //Submitting vote using submit_vote
    function submitVote(pollData, answerIndex) {
        const selectedOption = document.querySelector('input[name="poll"]:checked');
        if (selectedOption) {
            const voteData = {
                pollId: pollData.id,  // Using pollData.id
                answerIndex: answerIndex
            };
            socket.emit('submit_vote', voteData);  // Use voteData directly
            document.querySelectorAll('button').forEach(button => button.disabled = true);  // Optionally, change to just the vote button later
            document.getElementById('vote-disclosure').style.display = 'none';    
        } else {
            alert('Please select an option to vote.');
        }
    }
    
    function displayPoll(pollData, hasVoted) {    
        const pollContainer = document.getElementById('poll-container');
        pollContainer.innerHTML = `<h3>${pollData.question}</h3>`;
    
        const maxVotes = Math.max(...pollData.votes);
        const winners = pollData.votes.filter(vote => vote === maxVotes); // Count how many have max votes
    
        pollData.answers.forEach((answer, index) => {
            const voteCount = pollData.votes[index] || 0;
            const totalVotes = pollData.totalVotes || pollData.votes.reduce((a, b) => a + b, 0);
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isWinningAnswer = voteCount === maxVotes && totalVotes > 0 && hasVoted;
            const isTie = winners.length > 1 && isWinningAnswer; // Check if there is a tie and it's a winning answer
    
            const emoji = isTie ? '🤝' : '🎉'; // Use scales for tie, tada otherwise
            const percentageText = isWinningAnswer ? `${emoji} ${percentage}%` : `${percentage}%`;
            const answerClass = isWinningAnswer ? 'winning-answer' : '';
    
            const answerHTML = `
            <label for="answer${index}" class="poll-label ${answerClass}">
                <div class="answer-and-stats">
                    ${!hasVoted ? `<input type="radio" id="answer${index}" name="poll" value="${index}">` : ''}
                    <span class="answer-text">${answer}</span>
                    ${hasVoted ? `
                        <div class="stats">
                            <span class="percentage-text">${percentageText}</span>
                            <span class="vote-count">${voteCount} votes</span>
                        </div>
                    ` : ''}
                </div>
                ${hasVoted ? `<div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentage}%;"></div>
                </div>` : ''}
            </label>`;
    
            pollContainer.innerHTML += `<div class="poll-item">${answerHTML}</div>`;
        });
    
        if (!hasVoted) {
            const voteButton = document.createElement('button');
            voteButton.textContent = 'Vote';
            voteButton.onclick = function() {
                const selectedOption = document.querySelector('input[name="poll"]:checked');
                if (selectedOption) {
                    const answerIndex = parseInt(selectedOption.value);
                    submitVote(pollData, answerIndex); // Passing the pollId and answerIndex
                } else {
                    alert('Please select an option to vote.');
                }
            };
            pollContainer.appendChild(voteButton);
            document.getElementById('vote-disclosure').style.display = 'block'; // Show the disclosure if not voted
        } else {
            document.getElementById('vote-disclosure').style.display = 'none'; // Hide the disclosure if voted
        }
    }

    //Vote buttoo function
    const voteButton = document.getElementById('vote-button'); 
    if (voteButton) {
        voteButton.addEventListener('click', submitVote);
    }
    
})


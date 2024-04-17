const { v4: uuidv4 } = require('uuid');

// Will expand to greater number in future
const numberOfUUIDs = 16;

for (let i = 0; i < numberOfUUIDs; i++) {
  console.log(uuidv4());
}

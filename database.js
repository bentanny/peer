const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './peerdatabase.sqlite',
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  isTurn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

const Poll = sequelize.define('Poll', {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    question: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    answers: {
        type: DataTypes.STRING,  
        allowNull: false,
      }
  });

const Vote = sequelize.define('Vote', {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    pollId: {
      type: DataTypes.UUID,
      allowNull: false,
    }
  });

  const AnswerCount = sequelize.define('AnswerCount', {
    pollId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Polls', // name of Target model
            key: 'id', // key in Target model that we're referencing
        }
    },
    answerIndex: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }},
    {
        timestamps: false // Disables automatic timestamping for this model
});
  
// Relationships
User.hasMany(Vote, { foreignKey: 'userId' });
Vote.belongsTo(User, { foreignKey: 'userId' });

Poll.hasMany(Vote, { foreignKey: 'pollId' });
Vote.belongsTo(Poll, { foreignKey: 'pollId' });

module.exports = { sequelize, User, Poll, Vote, AnswerCount };
const { sequelize, AnswerCount } = require('./database'); // Adjust the path as necessary to import your Sequelize connection and models

async function updateSchema() {
    try {
        // This command forces synchronization of the model, adjusting the database table to match the model definition
        await AnswerCount.sync({ alter: true }); // Use 'alter' cautiously in production as it can potentially drop columns
        console.log('Schema for AnswerCount has been updated successfully.');
    } catch (error) {
        console.error('Failed to update database schema:', error);
    } finally {
        await sequelize.close(); // Make sure to close the sequelize connection
    }
}

updateSchema();

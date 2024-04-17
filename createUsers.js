const { sequelize, User } = require('./database');

// List of user names and their corresponding tokens
const users = [
    { name: 'Ben', token: '58616959-59fe-41dc-9932-a3e24d37bd29' },
    { name: 'Cory', token: '295bb317-f74d-46f7-9ac4-3766ad383975' },
    { name: 'Tianyi', token: 'a747b856-af20-4270-8753-cbd22d1f42e4' },
    { name: 'Fianko', token: '4b4f06ce-a150-47d5-b21f-61de48673f0c' },
    { name: 'Galen', token: 'ad505d79-e712-4215-bee3-65577a5d406c' },
    { name: 'Liz', token: '2a57ecf8-ed8d-4be8-9947-8dadeedc0c8f' },
    { name: 'Joshua', token: '430ff5de-c3f3-4100-8651-c3e8f6a3b7bc' },
    { name: 'Sreya', token: 'fa357a4b-5b1e-4277-9834-5c51b83e3392' },
    { name: 'Shankari', token: '97f7e309-ebec-4cbb-80f4-4e451d1d340e' },
    { name: 'Kevin', token: '08ec959b-a400-4956-8658-d0d8d125a7b9' },
    { name: 'Alex', token: '93c83b7e-91bc-412f-b565-004e9377737b' },
    { name: 'Stefan', token: 'ca0050ca-1026-405f-b94e-5ad13e3000c2' },
    { name: 'Enya', token: 'af08109c-5229-4862-8a60-98dc3bbeb290' },
    { name: 'Tulsi', token: '6514b068-38a1-42ac-8909-9e8eb6e6a977' },
    { name: 'Vinay', token: 'b1bb05da-17cd-4191-bc04-b38ed18a52be' },
    { name: 'Rubin', token: '1454d5e3-9b7b-4828-8008-d20780bb43ac' }
];

async function createUsers() {
    try {
        await sequelize.sync(); 
        for (let user of users) {
            await User.create(user);
            console.log(`User ${user.name} created successfully.`);
        }
    } catch (error) {
        console.error('Failed to create users:', error);
    }
}

createUsers();

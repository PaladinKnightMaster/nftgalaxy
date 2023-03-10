/* eslint-disable import/no-extraneous-dependencies */
require('@nomiclabs/hardhat-waffle');
require('dotenv').config({ path: '.env' });

const { BASE_URL } = process.env;

const { MUMBAI_PRIVATE_KEY } = process.env;

module.exports = {
  solidity: '0.8.4',
  networks: {
    mumbai: {
      url: BASE_URL,
      accounts: [MUMBAI_PRIVATE_KEY],
    },
  },
};
